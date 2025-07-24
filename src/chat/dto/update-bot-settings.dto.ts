import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BotSettingsDto } from './bot-settings.dto';

export class UpdateBotSettingsDto {
  @ValidateNested()
  @Type(() => BotSettingsDto)
  botSettings: BotSettingsDto;
}
