export class Comment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;

  // 관계형 데이터 (필요시 포함)
  user?: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  replies?: Comment[];
  isLikedByCurrentUser?: boolean;
}