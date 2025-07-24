import { MessageType } from '../../common/enums/message-type.enum';

export class Message {
  id: string;
  chatRoomId: string;
  type: MessageType;
  content: string;
  imageUrl?: string; // 꿈 형상화 이미지 URL (봇 메시지용)
  createdAt: Date;
}
