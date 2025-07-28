import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getSupabaseClient,
  getSupabaseAdminClient,
} from '../../config/supabase.config';
import { ChatRoom } from '../entities/chat-room.entity';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { AiService } from './ai.service';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

@Injectable()
export class ChatRoomService {
  private readonly activeLocks = new Map<string, Promise<ChatRoom>>();

  constructor(private aiService: AiService) {}

  async getTodaysChatRoom(userId: string): Promise<ChatRoom> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lockKey = `${userId}-${today}`;

    // 이미 진행 중인 요청이 있다면 그 결과를 대기
    if (this.activeLocks.has(lockKey)) {
      console.log(
        'Waiting for existing chat room creation for user:',
        userId,
        'date:',
        today,
      );
      return this.activeLocks.get(lockKey)!;
    }

    console.log('Getting todays chat room for user:', userId, 'date:', today);

    // 새로운 프로미스를 만들어 락으로 사용
    const chatRoomPromise = this.getTodaysChatRoomInternal(userId, today);
    this.activeLocks.set(lockKey, chatRoomPromise);

    try {
      const result = await chatRoomPromise;
      return result;
    } finally {
      // 완료 후 락 제거
      this.activeLocks.delete(lockKey);
    }
  }

  private async getTodaysChatRoomInternal(
    userId: string,
    today: string,
  ): Promise<ChatRoom> {
    let chatRoom = await this.findChatRoomByUserAndDate(userId, today);

    if (!chatRoom) {
      chatRoom = await this.createChatRoomWithRetry(userId, today);
    }

    return chatRoom;
  }

  private async createChatRoomWithRetry(
    userId: string,
    today: string,
    maxRetries: number = 3,
  ): Promise<ChatRoom> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Creating chat room attempt ${attempt}/${maxRetries} for user:`,
          userId,
          'date:',
          today,
        );

        const chatRoom = await this.createChatRoom(userId, {
          title: `${today} 꿈 해몽`,
        });

        console.log(
          'Chat room created successfully on attempt',
          attempt,
          ':',
          chatRoom.id,
        );
        return chatRoom;
      } catch (error) {
        console.error(`Chat room creation attempt ${attempt} failed:`, error);

        // 중복 키 오류인 경우 기존 채팅방을 조회해서 반환
        if (this.isDuplicateKeyError(error)) {
          console.log(
            'Duplicate key error detected, trying to find existing room...',
          );

          // 잠시 대기 후 재조회 (다른 요청이 완료될 시간을 줌)
          await new Promise((resolve) => setTimeout(resolve, 50));

          const existingRoom = await this.findChatRoomByUserAndDate(
            userId,
            today,
          );
          if (existingRoom) {
            console.log(
              'Found existing room after duplicate error:',
              existingRoom.id,
            );
            return existingRoom;
          }

          // 혹시 Admin 권한으로 다시 시도해보기
          console.log('Trying with admin client...');
          const adminRoom = await this.findChatRoomByUserAndDateWithAdmin(
            userId,
            today,
          );
          if (adminRoom) {
            console.log('Found room with admin client:', adminRoom.id);
            return adminRoom;
          }
        }

        // 마지막 시도가 아니라면 잠시 대기 후 재시도
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 100; // 지수적 백오프: 100ms, 200ms, 400ms...
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw new Error(
            `채팅방 생성에 실패했습니다 (${maxRetries}회 시도): ${error.message}`,
          );
        }
      }
    }

    throw new Error('채팅방 생성에 실패했습니다: 최대 재시도 횟수 초과');
  }

  private async findChatRoomByUserAndDateWithAdmin(
    userId: string,
    date: string,
  ): Promise<ChatRoom | null> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('chat_rooms')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Admin find chat room error:', error);
        return null;
      }

      return data ? await this.mapSupabaseChatRoomToEntity(data) : null;
    } catch (error) {
      console.error('Error in findChatRoomByUserAndDateWithAdmin:', error);
      return null;
    }
  }

  private isDuplicateKeyError(error: any): boolean {
    return (
      error.message &&
      (error.message.includes('duplicate key') ||
        error.message.includes('unique constraint') ||
        error.message.includes('violates unique constraint') ||
        error.message.includes('UNIQUE constraint failed') ||
        (error.code &&
          (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT')))
    );
  }

  async createChatRoom(
    userId: string,
    createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoom> {
    const today = new Date().toISOString().split('T')[0];
    const defaultTitle = createChatRoomDto.title || `${today} 꿈 해몽`;

    let botSettings;
    try {
      botSettings =
        createChatRoomDto.botSettings || this.aiService.getDefaultBotSettings();
    } catch (error) {
      console.error('Failed to get bot settings:', error);
      // Fallback to hardcoded default
      botSettings = {
        gender: 'female',
        style: 'eastern',
      };
    }

    // Get bot_settings_id from bot_settings table
    let { data: botSettingsData, error: botSettingsError } =
      await getSupabaseAdminClient()
        .from('bot_settings')
        .select('id')
        .eq('gender', botSettings.gender)
        .eq('style', botSettings.style)
        .single();

    if (botSettingsError) {
      console.error('Failed to find bot settings:', botSettingsError);
      // Try to get default bot settings (male, eastern)
      const { data: defaultBotSettings, error: defaultError } =
        await getSupabaseAdminClient()
          .from('bot_settings')
          .select('id')
          .eq('gender', 'male')
          .eq('style', 'eastern')
          .single();

      if (defaultError) {
        throw new Error(`Failed to find bot settings: ${defaultError.message}`);
      }
      botSettingsData = defaultBotSettings;
    }

    if (!botSettingsData) {
      throw new Error('Bot settings not found');
    }

    console.log('Creating chat room with:', {
      userId,
      title: defaultTitle,
      date: today,
      botSettings,
      botSettingsId: botSettingsData.id,
    });

    const { data, error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .insert([
        {
          user_id: userId,
          title: defaultTitle,
          date: today,
          bot_settings_id: botSettingsData.id,
          is_active: true,
        },
      ])
      .select(
        `
        *,
        bot_settings:bot_settings_id (
          gender,
          style
        )
      `,
      )
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Failed to create chat room: ${error.message}`);
    }

    console.log('Chat room created successfully:', data);
    return await this.mapSupabaseChatRoomToEntity(data);
  }

  async findChatRoomByUserAndDate(
    userId: string,
    date: string,
  ): Promise<ChatRoom | null> {
    console.log('Finding chat room for:', { userId, date });

    try {
      // Admin 클라이언트로 조회 (RLS 문제 해결)
      let { data, error } = await getSupabaseAdminClient()
        .from('chat_rooms')
        .select(
          `
          *,
          bot_settings:bot_settings_id (
            gender,
            style
          )
        `,
        )
        .eq('user_id', userId)
        .eq('date', date)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Primary find chat room result:', { data, error });

      // 결과가 없다면 더 넓은 범위로 조회해보기
      if (!data && (!error || error.code === 'PGRST116')) {
        console.log('Trying broader search for chat room...');

        const { data: allRooms, error: broadError } =
          await getSupabaseAdminClient()
            .from('chat_rooms')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        console.log('Broad search result:', {
          allRooms: allRooms?.map((room) => ({
            id: room.id,
            date: room.date,
            is_active: room.is_active,
            created_at: room.created_at,
          })),
          broadError,
        });

        // 오늘 날짜와 매치하는 방 찾기
        const todayRoom = allRooms?.find(
          (room) => room.date === date && room.is_active === true,
        );

        if (todayRoom) {
          console.log('Found matching room in broad search:', todayRoom.id);
          data = todayRoom;
          error = null;
        }
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Find chat room error:', error);
        throw new Error(`Failed to find chat room: ${error.message}`);
      }

      const result = data ? await this.mapSupabaseChatRoomToEntity(data) : null;
      console.log(
        'Final mapped result:',
        result ? `Found room ${result.id}` : 'No room found',
      );

      return result;
    } catch (error) {
      console.error('Unexpected error in findChatRoomByUserAndDate:', error);
      throw error;
    }
  }

  async findChatRoomById(chatRoomId: string): Promise<ChatRoom> {
    const { data, error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .select(
        `
        *,
        bot_settings:bot_settings_id (
          gender,
          style
        )
      `,
      )
      .eq('id', chatRoomId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new NotFoundException('Chat room not found');
    }

    return await this.mapSupabaseChatRoomToEntity(data);
  }

  async getUserChatRooms(
    userId: string,
    limit: number = 50,
  ): Promise<ChatRoom[]> {
    const { data, error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .select(
        `
        *,
        bot_settings:bot_settings_id (
          gender,
          style
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user chat rooms: ${error.message}`);
    }

    return await Promise.all(
      data.map(async (room) => await this.mapSupabaseChatRoomToEntity(room)),
    );
  }

  async updateChatRoomTitle(
    chatRoomId: string,
    title: string,
  ): Promise<ChatRoom> {
    const { data, error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .update({ title })
      .eq('id', chatRoomId)
      .select(
        `
        *,
        bot_settings:bot_settings_id (
          gender,
          style
        )
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to update chat room title: ${error.message}`);
    }

    return await this.mapSupabaseChatRoomToEntity(data);
  }

  async deleteChatRoom(chatRoomId: string): Promise<void> {
    const { error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .update({ is_active: false })
      .eq('id', chatRoomId);

    if (error) {
      throw new Error(`Failed to delete chat room: ${error.message}`);
    }
  }

  async updateBotSettings(
    chatRoomId: string,
    botSettings: any,
  ): Promise<ChatRoom> {
    // Get bot_settings_id from bot_settings table
    const { data: botSettingsData, error: botSettingsError } =
      await getSupabaseAdminClient()
        .from('bot_settings')
        .select('id')
        .eq('gender', botSettings.gender)
        .eq('style', botSettings.style)
        .single();

    if (botSettingsError) {
      throw new Error(
        `Failed to find bot settings: ${botSettingsError.message}`,
      );
    }

    const { data, error } = await getSupabaseAdminClient()
      .from('chat_rooms')
      .update({
        bot_settings_id: botSettingsData.id,
      })
      .eq('id', chatRoomId)
      .select(
        `
        *,
        bot_settings:bot_settings_id (
          gender,
          style
        )
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to update bot settings: ${error.message}`);
    }

    return await this.mapSupabaseChatRoomToEntity(data);
  }

  private async mapSupabaseChatRoomToEntity(data: any): Promise<ChatRoom> {
    let botSettings = { gender: BotGender.MALE, style: BotStyle.EASTERN }; // default

    // Check if bot_settings is already joined in the query
    if (
      data.bot_settings &&
      data.bot_settings.gender &&
      data.bot_settings.style
    ) {
      botSettings = {
        gender: data.bot_settings.gender as BotGender,
        style: data.bot_settings.style as BotStyle,
      };
    } else if (data.bot_settings_id) {
      // Fallback: fetch bot settings separately if not joined
      const { data: botSettingsData, error } = await getSupabaseAdminClient()
        .from('bot_settings')
        .select('gender, style')
        .eq('id', data.bot_settings_id)
        .single();

      if (!error && botSettingsData) {
        botSettings = {
          gender: botSettingsData.gender as BotGender,
          style: botSettingsData.style as BotStyle,
        };
      }
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      date: data.date,
      botSettings,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
