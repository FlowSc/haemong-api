import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { AuthService } from '../services/auth.service';
import { AuthProvider } from '../../common/enums/auth-provider.enum';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH,
      callbackURL: '/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, email } = profile;

    try {
      const authResponse = await this.authService.oauthLogin({
        providerId: id,
        email: email,
        provider: AuthProvider.APPLE,
      });

      done(null, authResponse);
    } catch (error) {
      done(error, null);
    }
  }
}
