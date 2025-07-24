export class VideoScene {
  imageUrl: string;
  duration: number;
  order: number;
}

export class VideoStyle {
  gender: string;
  approach: string;
}

export class Video {
  id: string;
  userId: string;
  chatRoomId: string;
  title: string;
  description: string;
  duration: number;
  scenes: VideoScene[];
  style: VideoStyle;
  dreamContent: string;
  createdAt: Date;
  updatedAt: Date;
}