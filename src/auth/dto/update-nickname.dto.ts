import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateNicknameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Nickname must be at least 2 characters long' })
  @MaxLength(20, { message: 'Nickname must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9가-힣_]+$/, {
    message:
      'Nickname can only contain letters, numbers, Korean characters, and underscores',
  })
  nickname: string;
}
