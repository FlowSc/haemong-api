import { Message } from '../entities/message.entity';

export class ImageGenerationResponseDto {
  success: boolean;
  imageUrl?: string;
  message: string;
  isPremium: boolean;
  upgradeRequired?: boolean;
  imageMessage?: Message;
}
