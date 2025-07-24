import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BotSettingsDto } from './bot-settings.dto';

export class CreateChatRoomDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BotSettingsDto)
  botSettings?: BotSettingsDto;
}
