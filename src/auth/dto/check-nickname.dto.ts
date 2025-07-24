import { IsString, Length } from 'class-validator';

export class CheckNicknameDto {
  @IsString()
  @Length(1, 8)
  nickname: string;
}
