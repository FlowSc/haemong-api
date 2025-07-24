export class ImageGenerationResponseDto {
  success: boolean;
  imageUrl?: string;
  message: string;
  isPremium: boolean;
  upgradeRequired?: boolean;
}
