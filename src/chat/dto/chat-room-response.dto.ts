import { ChatRoom } from '../entities/chat-room.entity';
import { Message } from '../entities/message.entity';

export class ChatRoomResponseDto {
  chatRoom: ChatRoom;
  messages: Message[];
  totalMessages: number;
}
