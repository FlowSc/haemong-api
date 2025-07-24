import { IsString, IsEmail, IsOptional } from 'class-validator';
import { AuthProvider } from '../../common/enums/auth-provider.enum';

export class OAuthDto {
  @IsString()
  providerId: string;

  @IsEmail()
  email: string;

  @IsString()
  provider: AuthProvider;

  @IsOptional()
  @IsString()
  nickname?: string;
}
