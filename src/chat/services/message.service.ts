import { Injectable } from '@nestjs/common';
import { getSupabaseClient, getSupabaseAdminClient } from '../../config/supabase.config';
import { Message } from '../entities/message.entity';
import { MessageType } from '../../common/enums/message-type.enum';
import { SendMessageDto } from '../dto/send-message.dto';
import { MessageResponseDto } from '../dto/message-response.dto';
import { GenerateImageDto } from '../dto/generate-image.dto';
import { ImageGenerationResponseDto } from '../dto/image-generation-response.dto';
import { GenerateVideoDto } from '../dto/generate-video.dto';
import { VideoGenerationResponseDto } from '../dto/video-generation-response.dto';
import { AiService } from './ai.service';
import { ChatRoomService } from './chat-room.service';
import { AuthService } from '../../auth/services/auth.service';
import { VideoGenerationService } from './video-generation.service';

@Injectable()
export class MessageService {
  constructor(
    private aiService: AiService,
    private chatRoomService: ChatRoomService,
    private authService: AuthService,
    private videoGenerationService: VideoGenerationService,
  ) {}

  async sendMessage(
    userId: string,
    chatRoomId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Verify chat room belongs to user
    const chatRoom = await this.chatRoomService.findChatRoomById(chatRoomId);
    if (chatRoom.userId !== userId) {
      throw new Error('Unauthorized access to chat room');
    }

    // Save user message
    const userMessage = await this.createMessage(
      chatRoomId,
      MessageType.USER,
      sendMessageDto.content,
    );

    // Get recent conversation history for context
    const recentMessages = await this.getRecentMessagesForContext(chatRoomId, 8);

    // Generate AI response with conversation context
    const aiResponse = await this.aiService.generateDreamInterpretation(
      sendMessageDto.content,
      chatRoom.botSettings,
      recentMessages,
    );

    // Check if user is premium for image generation button
    const isPremium = await this.authService.isPremiumUser(userId);

    // Add image generation button message based on subscription status
    let finalResponse = aiResponse;
    if (isPremium) {
      finalResponse +=
        '\n\n🎨 **이미지 생성 가능**\n위 해몽 내용을 아름다운 이미지로 형상화할 수 있습니다. "이미지 생성" 버튼을 눌러보세요!';
    } else {
      finalResponse +=
        '\n\n💎 **프리미엄 기능 - 이미지 생성**\n프리미엄 구독 시 꿈을 아름다운 이미지로 형상화해드립니다. 더욱 생생한 해몽 경험을 원하신다면 프리미엄을 이용해보세요!';
    }

    // Save bot message without image (image will be generated on-demand)
    const botMessage = await this.createMessage(
      chatRoomId,
      MessageType.BOT,
      finalResponse,
      null, // No image URL initially
    );

    return {
      userMessage,
      botMessage,
    };
  }

  async createMessage(
    chatRoomId: string,
    type: MessageType,
    content: string,
    imageUrl?: string | null,
  ): Promise<Message> {
    const insertData: any = {
      chat_room_id: chatRoomId,
      type,
      content,
    };

    // 이미지 URL이 있는 경우에만 추가
    if (imageUrl) {
      insertData.image_url = imageUrl;
    }

    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return this.mapSupabaseMessageToEntity(data);
  }

  async getChatRoomMessages(
    chatRoomId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<Message[]> {
    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data.map((message) => this.mapSupabaseMessageToEntity(message));
  }

  async getRecentMessagesForContext(
    chatRoomId: string,
    limit: number = 10,
  ): Promise<Message[]> {
    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    // 시간 순서대로 정렬 (가장 오래된 메시지부터)
    return data
      .reverse()
      .map((message) => this.mapSupabaseMessageToEntity(message));
  }

  async getMessageCount(chatRoomId: string): Promise<number> {
    const { count, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', chatRoomId);

    if (error) {
      throw new Error(`Failed to get message count: ${error.message}`);
    }

    return count || 0;
  }

  async getLatestUserMessage(chatRoomId: string): Promise<Message | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .eq('type', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get latest user message: ${error.message}`);
    }

    return data ? this.mapSupabaseMessageToEntity(data) : null;
  }

  async getLatestBotMessage(chatRoomId: string): Promise<Message | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .eq('type', 'bot')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get latest bot message: ${error.message}`);
    }

    return data ? this.mapSupabaseMessageToEntity(data) : null;
  }

  async initializeChatRoom(
    chatRoomId: string,
    userId?: string,
  ): Promise<Message> {
    // Check if chat room already has messages
    const existingMessages = await this.getChatRoomMessages(chatRoomId, 1);
    if (existingMessages.length > 0) {
      return existingMessages[0];
    }

    // Get chat room to access bot settings
    const chatRoom = await this.chatRoomService.findChatRoomById(chatRoomId);

    // Generate welcome message only (no automatic image generation)
    const welcomeMessage = await this.aiService.generateWelcomeMessage(
      chatRoom.botSettings,
    );

    return this.createMessage(
      chatRoomId,
      MessageType.BOT,
      welcomeMessage,
      null,
    );
  }

  async generateImageForMessage(
    userId: string,
    generateImageDto: GenerateImageDto,
  ): Promise<ImageGenerationResponseDto> {
    // Get today's chat room for the user
    const chatRoom = await this.chatRoomService.getTodaysChatRoom(userId);
    if (!chatRoom) {
      return {
        success: false,
        message: '오늘의 채팅방을 찾을 수 없습니다.',
        isPremium: false,
      };
    }

    // Get latest user message (dream content)
    const latestUserMessage = await this.getLatestUserMessage(chatRoom.id);
    if (!latestUserMessage) {
      return {
        success: false,
        message: '해몽할 꿈 내용을 찾을 수 없습니다. 먼저 꿈을 입력해주세요.',
        isPremium: false,
      };
    }

    // Check premium status
    const isPremium = await this.authService.isPremiumUser(userId);

    if (!isPremium) {
      return {
        success: false,
        message:
          '프리미엄 구독이 필요한 기능입니다. 업그레이드 후 이용해주세요.',
        isPremium: false,
        upgradeRequired: true,
      };
    }

    // Get latest bot message (interpretation content)
    const latestBotMessage = await this.getLatestBotMessage(chatRoom.id);
    const interpretationContent = latestBotMessage ? latestBotMessage.content : '';

    // Generate image for premium users
    try {
      const imageUrl = await this.aiService.generateDreamImageUrl(
        latestUserMessage.content,
        interpretationContent,
        chatRoom.botSettings,
        userId,
        chatRoom.id,
        isPremium,
      );

      if (imageUrl) {
        // Update the latest user message with generated image
        await this.updateMessageImage(latestUserMessage.id, imageUrl);

        return {
          success: true,
          imageUrl,
          message: '이미지가 성공적으로 생성되었습니다.',
          isPremium: true,
        };
      } else {
        return {
          success: false,
          message: '이미지 생성에 실패했습니다. 다시 시도해주세요.',
          isPremium: true,
        };
      }
    } catch (error) {
      console.error('Image generation error:', error);
      return {
        success: false,
        message: '이미지 생성 중 오류가 발생했습니다.',
        isPremium: true,
      };
    }
  }

  private async getMessageById(messageId: string): Promise<Message | null> {
    const { data, error } = await getSupabaseAdminClient()
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapSupabaseMessageToEntity(data);
  }

  private async updateMessageImage(
    messageId: string,
    imageUrl: string,
  ): Promise<void> {
    const { error } = await getSupabaseAdminClient()
      .from('messages')
      .update({ image_url: imageUrl })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to update message image: ${error.message}`);
    }
  }

  private mapSupabaseMessageToEntity(data: any): Message {
    return {
      id: data.id,
      chatRoomId: data.chat_room_id,
      type: data.type,
      content: data.content,
      imageUrl: data.image_url || undefined,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * 프리미엄 사용자를 위한 꿈 영상 생성
   */
  async generateDreamVideo(
    userId: string,
    chatRoomId: string,
    generateVideoDto: GenerateVideoDto,
  ): Promise<VideoGenerationResponseDto> {
    try {
      // 채팅방 정보 및 봇 설정 가져오기
      const chatRoom = await this.chatRoomService.findChatRoomById(chatRoomId);

      // 최신 사용자 메시지에서 꿈 내용 가져오기
      const latestUserMessage = await this.getLatestUserMessage(chatRoomId);
      if (!latestUserMessage) {
        throw new Error('해몽할 꿈 내용을 찾을 수 없습니다. 먼저 꿈을 입력해주세요.');
      }

      const dreamContent = latestUserMessage.content;

      // 1. 실제 영상 생성 (URL 반환)
      const videoUrl = await this.videoGenerationService.generateDreamVideo(
        dreamContent,
        chatRoom.botSettings,
      );

      // 2. 꿈 해몽 해석 생성
      const interpretation = await this.generateDreamInterpretation(
        dreamContent,
        chatRoom.botSettings,
      );

      // 3. 응답 데이터 구성
      const response: VideoGenerationResponseDto = {
        videoUrl,
        title: this.generateVideoTitle(dreamContent),
        interpretation,
        dreamContent,
        style: {
          gender: chatRoom.botSettings.gender,
          approach: chatRoom.botSettings.style,
        },
        createdAt: new Date(),
      };

      // 4. 데이터베이스에 영상 정보 저장
      await this.saveVideoToDatabase(userId, chatRoomId, response);

      return response;
    } catch (error) {
      console.error('꿈 영상 생성 중 오류:', error);
      throw new Error(
        '꿈 영상 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }

  /**
   * 프리미엄 사용자 확인
   */
  async isPremiumUser(userId: string): Promise<boolean> {
    return this.authService.isPremiumUser(userId);
  }

  /**
   * 꿈 해몽 해석 생성
   */
  private async generateDreamInterpretation(
    dreamContent: string,
    botSettings: any,
  ): Promise<string> {
    // VideoGenerationService의 해석 로직 재사용 또는 간단한 해석 생성
    return `${dreamContent}에 대한 꿈 해몽: 이 꿈은 당신의 내면 세계와 현재 상황을 반영합니다.`;
  }

  /**
   * 영상 제목 생성
   */
  private generateVideoTitle(dreamContent: string): string {
    const keywords = dreamContent.split(' ').slice(0, 3).join(' ');
    return `🌙 꿈해몽: ${keywords}에 대한 꿈의 의미`;
  }

  /**
   * 생성된 영상 정보를 데이터베이스에 저장
   */
  private async saveVideoToDatabase(
    userId: string,
    chatRoomId: string,
    videoData: VideoGenerationResponseDto,
  ): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from('videos')
        .insert([
          {
            user_id: userId,
            chat_room_id: chatRoomId,
            title: videoData.title,
            description: videoData.interpretation,
            video_url: videoData.videoUrl,
            style: JSON.stringify(videoData.style),
            dream_content: videoData.dreamContent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('영상 정보 저장 중 오류:', error);
        throw new Error('영상 정보 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('데이터베이스 저장 오류:', error);
      // 영상 생성은 성공했지만 저장에 실패한 경우, 로그만 남기고 진행
    }
  }
}
