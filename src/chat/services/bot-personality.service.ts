import { Injectable } from '@nestjs/common';
import { getSupabaseClient } from '../../config/supabase.config';
import { BotPersonality } from '../entities/bot-personality.entity';

@Injectable()
export class BotPersonalityService {
  private supabase = getSupabaseClient();

  async findAll(): Promise<BotPersonality[]> {
    const { data, error } = await this.supabase
      .from('bot_personalities')
      .select('*')
      .eq('is_active', true)
      .order('id');

    if (error) {
      throw new Error(`봇 성격 목록 조회 실패: ${error.message}`);
    }

    return data.map(this.mapToBotPersonality);
  }

  async findById(id: number): Promise<BotPersonality | null> {
    const { data, error } = await this.supabase
      .from('bot_personalities')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 데이터 없음
      }
      throw new Error(`봇 성격 조회 실패: ${error.message}`);
    }

    return this.mapToBotPersonality(data);
  }

  async findByName(name: string): Promise<BotPersonality | null> {
    const { data, error } = await this.supabase
      .from('bot_personalities')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`봇 성격 조회 실패: ${error.message}`);
    }

    return this.mapToBotPersonality(data);
  }

  async getDefaultPersonality(): Promise<BotPersonality> {
    // 기본값: 따뜻한 동양 어머니 (ID: 2)
    const personality = await this.findById(2);
    if (!personality) {
      // 백업: 첫 번째 활성화된 성격
      const allPersonalities = await this.findAll();
      if (allPersonalities.length === 0) {
        throw new Error('활성화된 봇 성격이 없습니다.');
      }
      return allPersonalities[0];
    }
    return personality;
  }

  private mapToBotPersonality(data: any): BotPersonality {
    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name,
      gender: data.gender,
      style: data.style,
      personalityTraits: data.personality_traits,
      systemPrompt: data.system_prompt,
      welcomeMessage: data.welcome_message,
      imageStylePrompt: data.image_style_prompt,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
