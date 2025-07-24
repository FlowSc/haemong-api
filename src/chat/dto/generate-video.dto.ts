import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class GenerateVideoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  dreamContent: string;
}