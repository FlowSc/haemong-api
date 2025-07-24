import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

export class Post {
  id: string;
  userId: string;
  chatRoomId: string;
  dreamContent: string;
  interpretationContent: string;
  imageUrl?: string;
  botGender: BotGender;
  botStyle: BotStyle;
  title?: string;
  tags?: string[];
  isPublic: boolean;
  isPremium: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;

  // 관계형 데이터 (필요시 포함)
  user?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  isLikedByCurrentUser?: boolean;
  isBookmarkedByCurrentUser?: boolean;
}