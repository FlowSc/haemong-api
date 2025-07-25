import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  getSupabaseClient,
  getSupabaseAdminClient,
} from '../../config/supabase.config';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { OAuthDto } from '../dto/oauth.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { UserProfileDto } from '../dto/user-profile.dto';
import { UserStatsDto } from '../dto/user-stats.dto';
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

    const { data, error } = await getSupabaseAdminClient()
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
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // OAuth 사용자가 이메일/비밀번호로 로그인하려는 경우
    if (user.provider !== AuthProvider.EMAIL) {
      throw new UnauthorizedException(`This account was registered with ${user.provider}. Please use ${user.provider} login.`);
    }

    // 비밀번호가 없는 경우 (데이터 무결성 문제)
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
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

      const { data, error } = await getSupabaseAdminClient()
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
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        // PGRST116은 "no rows returned" 에러 코드
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to find user: ${error.message}`);
      }

      return data ? this.mapSupabaseUserToEntity(data) : null;
    } catch (error) {
      // Supabase 연결 문제 등을 처리
      if (error.message?.includes('Supabase URL and service role key are required')) {
        throw new Error('Database configuration error. Please check environment variables.');
      }
      throw error;
    }
  }

  async findUserByProviderAndId(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    const { data, error } = await getSupabaseAdminClient()
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
    const { data, error } = await getSupabaseAdminClient()
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

      console.log(user);
      
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

    const { error } = await getSupabaseAdminClient()
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

  async updateNickname(userId: string, nickname: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isAvailable = await this.nicknameService.checkNicknameAvailability(nickname);
    if (!isAvailable) {
      throw new ConflictException('Nickname is already taken');
    }

    const { error } = await getSupabaseAdminClient()
      .from('users')
      .update({ nickname })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update nickname: ${error.message}`);
    }
  }

  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const stats = await this.getUserStats(userId);

    return {
      user: this.excludePassword(user),
      stats,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const supabase = getSupabaseAdminClient();

    // Get total chat rooms count
    const { count: totalChatRooms } = await supabase
      .from('chat_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get total dream interpretations (bot messages)
    const { count: totalDreamInterpretations } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'bot');

    // Get total images generated
    const { count: totalImagesGenerated } = await supabase
      .from('generated_images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get current month interpretations
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: currentMonthInterpretations } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'bot')
      .gte('created_at', startOfMonth.toISOString());

    // Get last activity date
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const user = await this.findUserById(userId);
    const isPremiumUser = await this.isPremiumUser(userId);

    return {
      totalDreamInterpretations: totalDreamInterpretations || 0,
      totalImagesGenerated: totalImagesGenerated || 0,
      totalChatRooms: totalChatRooms || 0,
      currentMonthInterpretations: currentMonthInterpretations || 0,
      isPremiumUser,
      joinedDate: user?.createdAt || new Date(),
      lastActivityDate: lastMessage ? new Date(lastMessage.created_at) : undefined,
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { error } = await getSupabaseAdminClient()
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }
}
