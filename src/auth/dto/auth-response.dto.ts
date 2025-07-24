import { User } from '../entities/user.entity';

export class AuthResponseDto {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}
