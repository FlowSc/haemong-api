import { IsUUID } from 'class-validator';

export class GenerateImageDto {
  @IsUUID()
  messageId: string;
}
