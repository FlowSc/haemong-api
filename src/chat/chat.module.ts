import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatRoomService } from './services/chat-room.service';
import { MessageService } from './services/message.service';
import { AiService } from './services/ai.service';
import { BotPersonalityService } from './services/bot-personality.service';
import { ImageGenerationService } from './services/image-generation.service';
import { VideoGenerationService } from './services/video-generation.service';
import { StorageService } from '../common/services/storage.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [
    ChatRoomService,
    MessageService,
    AiService,
    BotPersonalityService,
    ImageGenerationService,
    VideoGenerationService,
    StorageService,
  ],
  exports: [ChatRoomService, MessageService, BotPersonalityService],
})
export class ChatModule {}
