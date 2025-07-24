import { Message } from '../entities/message.entity';

export class MessageResponseDto {
  userMessage: Message;
  botMessage: Message;
}
