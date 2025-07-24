import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatRoomService } from './services/chat-room.service';
import { MessageService } from './services/message.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatRoomResponseDto } from './dto/chat-room-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { UpdateBotSettingsDto } from './dto/update-bot-settings.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImageGenerationResponseDto } from './dto/image-generation-response.dto';
import { GenerateVideoDto } from './dto/generate-video.dto';
import { VideoGenerationResponseDto } from './dto/video-generation-response.dto';
import { VideoGenerationService } from './services/video-generation.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatRoomService: ChatRoomService,
    private readonly messageService: MessageService,
    private readonly videoGenerationService: VideoGenerationService,
  ) {}

  @Get('rooms/today')
  async getTodaysChatRoom(@Req() req: Request): Promise<ChatRoomResponseDto> {
    const userId = req.user!.id;
    const chatRoom = await this.chatRoomService.getTodaysChatRoom(userId);

    // Initialize chat room with welcome message if it's new
    await this.messageService.initializeChatRoom(chatRoom.id, userId);

    const messages = await this.messageService.getChatRoomMessages(chatRoom.id);
    const totalMessages = await this.messageService.getMessageCount(
      chatRoom.id,
    );

    return {
      chatRoom,
      messages,
      totalMessages,
    };
  }

  @Get('rooms')
  async getUserChatRooms(
    @Req() req: Request,
    @Query('limit') limit: string = '50',
  ) {
    const userId = req.user!.id;
    const chatRooms = await this.chatRoomService.getUserChatRooms(
      userId,
      parseInt(limit),
    );
    return { chatRooms };
  }

  @Get('rooms/:roomId')
  async getChatRoom(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ): Promise<ChatRoomResponseDto> {
    const userId = req.user!.id;
    const chatRoom = await this.chatRoomService.findChatRoomById(roomId);

    // Verify ownership
    if (chatRoom.userId !== userId) {
      throw new Error('Unauthorized access to chat room');
    }

    const messages = await this.messageService.getChatRoomMessages(
      roomId,
      parseInt(limit),
      parseInt(offset),
    );
    const totalMessages = await this.messageService.getMessageCount(roomId);

    return {
      chatRoom,
      messages,
      totalMessages,
    };
  }

  @Post('rooms')
  async createChatRoom(
    @Req() req: Request,
    @Body() createChatRoomDto: CreateChatRoomDto,
  ) {
    const userId = req.user!.id;
    const chatRoom = await this.chatRoomService.createChatRoom(
      userId,
      createChatRoomDto,
    );

    // Initialize with welcome message
    await this.messageService.initializeChatRoom(chatRoom.id, userId);

    return { chatRoom };
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const userId = req.user!.id;
    return this.messageService.sendMessage(userId, roomId, sendMessageDto);
  }

  @Get('rooms/:roomId/messages')
  async getChatRoomMessages(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
  ) {
    const userId = req.user!.id;

    // Verify ownership
    const chatRoom = await this.chatRoomService.findChatRoomById(roomId);
    if (chatRoom.userId !== userId) {
      throw new Error('Unauthorized access to chat room');
    }

    const messages = await this.messageService.getChatRoomMessages(
      roomId,
      parseInt(limit),
      parseInt(offset),
    );
    const totalMessages = await this.messageService.getMessageCount(roomId);

    return {
      messages,
      totalMessages,
    };
  }

  @Put('rooms/:roomId/bot-settings')
  async updateBotSettings(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() updateBotSettingsDto: UpdateBotSettingsDto,
  ) {
    const userId = req.user!.id;

    // Verify ownership
    const chatRoom = await this.chatRoomService.findChatRoomById(roomId);
    if (chatRoom.userId !== userId) {
      throw new Error('Unauthorized access to chat room');
    }

    const updatedChatRoom = await this.chatRoomService.updateBotSettings(
      roomId,
      updateBotSettingsDto.botSettings,
    );

    return { chatRoom: updatedChatRoom };
  }

  @Post('rooms/today/messages/generate-image')
  async generateImageForMessage(
    @Req() req: Request,
  ): Promise<ImageGenerationResponseDto> {
    const userId = req.user!.id;
    return this.messageService.generateImageForMessage(
      userId,
      {},
    );
  }

  @Get('bot-settings/options')
  async getBotSettingsOptions() {
    return {
      genders: [
        { value: 'male', label: '남성' },
        { value: 'female', label: '여성' },
      ],
      styles: [
        { value: 'eastern', label: '동양풍' },
        { value: 'western', label: '서양풍' },
      ],
    };
  }

  @Post('rooms/today/messages/generate-video')
  async generateDreamVideo(
    @Req() req: Request,
  ): Promise<VideoGenerationResponseDto> {
    const userId = req.user!.id;

    // 프리미엄 사용자 확인
    const chatRoom = await this.chatRoomService.getTodaysChatRoom(userId);
    const isPremium = await this.messageService.isPremiumUser(userId);

    if (!isPremium) {
      throw new Error('쇼츠 영상 생성은 프리미엄 사용자만 이용 가능합니다.');
    }

    return this.messageService.generateDreamVideo(
      userId,
      chatRoom.id,
      {},
    );
  }
}
