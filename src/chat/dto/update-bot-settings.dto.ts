import { IsNumber, IsPositive } from 'class-validator';

export class UpdateBotSettingsDto {
  @IsNumber()
  @IsPositive()
  personalityId: number;
}
