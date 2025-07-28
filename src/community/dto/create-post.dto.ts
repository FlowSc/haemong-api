import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreatePostDto {
  @IsUUID()
  chatRoomId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;
}
