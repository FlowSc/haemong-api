import { Injectable, NotFoundException } from '@nestjs/common';
import { getSupabaseClient } from '../../config/supabase.config';
import { ChatRoom } from '../entities/chat-room.entity';
import { CreateChatRoomDto } from '../dto/create-chat-room.dto';
import { AiService } from './ai.service';

@Injectable()
export class ChatRoomService {
  constructor(private aiService: AiService) {}

  async getTodaysChatRoom(userId: string): Promise<ChatRoom> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let chatRoom = await this.findChatRoomByUserAndDate(userId, today);

    if (!chatRoom) {
      chatRoom = await this.createChatRoom(userId, {
        title: `${today} 꿈 해몽`,
      });
    }

    return chatRoom;
  }

  async createChatRoom(
    userId: string,
    createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoom> {
    const today = new Date().toISOString().split('T')[0];
    const defaultTitle = createChatRoomDto.title || `${today} 꿈 해몽`;
    const botSettings =
      createChatRoomDto.botSettings || this.aiService.getDefaultBotSettings();

    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .insert([
        {
          user_id: userId,
          title: defaultTitle,
          date: today,
          bot_gender: botSettings.gender,
          bot_style: botSettings.style,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create chat room: ${error.message}`);
    }

    return this.mapSupabaseChatRoomToEntity(data);
  }

  async findChatRoomByUserAndDate(
    userId: string,
    date: string,
  ): Promise<ChatRoom | null> {
    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find chat room: ${error.message}`);
    }

    return data ? this.mapSupabaseChatRoomToEntity(data) : null;
  }

  async findChatRoomById(chatRoomId: string): Promise<ChatRoom> {
    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .select('*')
      .eq('id', chatRoomId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new NotFoundException('Chat room not found');
    }

    return this.mapSupabaseChatRoomToEntity(data);
  }

  async getUserChatRooms(
    userId: string,
    limit: number = 50,
  ): Promise<ChatRoom[]> {
    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user chat rooms: ${error.message}`);
    }

    return data.map((room) => this.mapSupabaseChatRoomToEntity(room));
  }

  async updateChatRoomTitle(
    chatRoomId: string,
    title: string,
  ): Promise<ChatRoom> {
    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .update({ title })
      .eq('id', chatRoomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update chat room title: ${error.message}`);
    }

    return this.mapSupabaseChatRoomToEntity(data);
  }

  async deleteChatRoom(chatRoomId: string): Promise<void> {
    const { error } = await getSupabaseClient()
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
    const { data, error } = await getSupabaseClient()
      .from('chat_rooms')
      .update({
        bot_gender: botSettings.gender,
        bot_style: botSettings.style,
      })
      .eq('id', chatRoomId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update bot settings: ${error.message}`);
    }

    return this.mapSupabaseChatRoomToEntity(data);
  }

  private mapSupabaseChatRoomToEntity(data: any): ChatRoom {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      date: data.date,
      botSettings: {
        gender: data.bot_gender,
        style: data.bot_style,
      },
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
