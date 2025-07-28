import { IsNumber, IsPositive } from 'class-validator';
import { BotPersonality } from '../entities/bot-personality.entity';

export class BotSettingsDto {
  @IsNumber()
  @IsPositive()
  personalityId: number;

  personality?: BotPersonality;
}
