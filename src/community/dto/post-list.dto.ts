import { IsOptional, IsNumber, IsString, Min, Max, IsArray, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

export class PostListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  cursor?: string; // 무한 스크롤용 커서

  @IsOptional()
  @IsEnum(['latest', 'popular', 'trending'])
  sortBy?: 'latest' | 'popular' | 'trending' = 'latest';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  tags?: string[];

  @IsOptional()
  @IsEnum(BotGender)
  botGender?: BotGender;

  @IsOptional()
  @IsEnum(BotStyle)
  botStyle?: BotStyle;

  @IsOptional()
  @IsString()
  search?: string; // 검색어 (꿈 내용, 해몽 내용에서 검색)
}