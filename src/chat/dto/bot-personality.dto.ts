import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';
import { PersonalityTraits } from '../entities/bot-personality.entity';

export class BotPersonalityDto {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  gender: string;

  @IsString()
  style: string;

  @IsObject()
  personalityTraits: PersonalityTraits;

  @IsString()
  systemPrompt: string;

  @IsString()
  welcomeMessage: string;

  @IsOptional()
  @IsString()
  imageStylePrompt?: string;

  @IsBoolean()
  isActive: boolean;
}
