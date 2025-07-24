export class VideoGenerationResponseDto {
  videoUrl: string;
  title: string;
  interpretation: string;
  dreamContent: string;
  style: {
    gender: string;
    approach: string;
  };
  createdAt: Date;
}
