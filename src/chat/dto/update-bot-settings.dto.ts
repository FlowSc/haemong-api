import { IsEnum } from 'class-validator';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

export class UpdateBotSettingsDto {
  @IsEnum(BotGender)
  gender: BotGender;

  @IsEnum(BotStyle)
  style: BotStyle;
}
