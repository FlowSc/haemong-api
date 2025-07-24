import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { getSupabaseClient } from '../../config/supabase.config';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { OAuthDto } from '../dto/oauth.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { User } from '../entities/user.entity';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum';
import { NicknameService } from './nickname.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private nicknameService: NicknameService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, nickname } = registerDto;

    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userNickname =
      nickname || (await this.nicknameService.generateUniqueNickname());

    const { data, error } = await getSupabaseClient()
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          nickname: userNickname,
          provider: AuthProvider.EMAIL,
          subscription_status: SubscriptionStatus.FREE,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    const user = this.mapSupabaseUserToEntity(data);
    const tokens = await this.generateTokens(user);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.findUserByEmail(email);
    if (!user || user.provider !== AuthProvider.EMAIL) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  async oauthLogin(oauthDto: OAuthDto): Promise<AuthResponseDto> {
    const { email, providerId, provider, nickname } = oauthDto;

    let user = await this.findUserByProviderAndId(provider, providerId);

    if (!user) {
      const existingEmailUser = await this.findUserByEmail(email);
      if (existingEmailUser && existingEmailUser.provider !== provider) {
        throw new ConflictException(
          'User with this email already exists with different provider',
        );
      }

      const userNickname =
        nickname || (await this.nicknameService.generateUniqueNickname());

      const { data, error } = await getSupabaseClient()
        .from('users')
        .insert([
          {
            email,
            nickname: userNickname,
            provider,
            provider_id: providerId,
            subscription_status: SubscriptionStatus.FREE,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      user = this.mapSupabaseUserToEntity(data);
    }

    const tokens = await this.generateTokens(user);

    return {
      user: this.excludePassword(user),
      ...tokens,
    };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data ? this.mapSupabaseUserToEntity(data) : null;
  }

  async findUserByProviderAndId(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('provider', provider)
      .eq('provider_id', providerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data ? this.mapSupabaseUserToEntity(data) : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const { data, error } = await getSupabaseClient()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data ? this.mapSupabaseUserToEntity(data) : null;
  }

  async checkNicknameAvailability(nickname: string): Promise<boolean> {
    return this.nicknameService.checkNicknameAvailability(nickname);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return { accessToken, refreshToken };
  }

  async isPremiumUser(userId: string): Promise<boolean> {
    const user = await this.findUserById(userId);
    if (!user) return false;

    if (user.subscriptionStatus === SubscriptionStatus.PREMIUM) {
      // 프리미엄 만료일 확인
      if (user.premiumExpiresAt && user.premiumExpiresAt > new Date()) {
        return true;
      } else if (user.premiumExpiresAt && user.premiumExpiresAt <= new Date()) {
        // 만료된 경우 상태 업데이트
        await this.updateUserSubscriptionStatus(
          userId,
          SubscriptionStatus.EXPIRED,
        );
        return false;
      }
      return true; // 만료일이 없는 경우 (평생 구독 등)
    }

    return false;
  }

  async updateUserSubscriptionStatus(
    userId: string,
    status: SubscriptionStatus,
    expiresAt?: Date,
  ): Promise<void> {
    const updateData: any = { subscription_status: status };
    if (expiresAt) {
      updateData.premium_expires_at = expiresAt.toISOString();
    }

    const { error } = await getSupabaseClient()
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update subscription status: ${error.message}`);
    }
  }

  private mapSupabaseUserToEntity(data: any): User {
    return {
      id: data.id,
      email: data.email,
      nickname: data.nickname,
      password: data.password,
      provider: data.provider,
      providerId: data.provider_id,
      subscriptionStatus: data.subscription_status || SubscriptionStatus.FREE,
      premiumExpiresAt: data.premium_expires_at
        ? new Date(data.premium_expires_at)
        : undefined,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private excludePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async generateUniqueNickname(): Promise<string> {
    return this.nicknameService.generateUniqueNickname();
  }
}
