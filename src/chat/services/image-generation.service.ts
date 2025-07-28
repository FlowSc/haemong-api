import { Injectable, Inject } from '@nestjs/common';
import OpenAI from 'openai';
import { BotSettings } from '../entities/bot-settings.entity';
import { GeneratedImage } from '../entities/generated-image.entity';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';
import { getSupabaseAdminClient } from '../../config/supabase.config';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class ImageGenerationService {
  private openai: OpenAI;

  constructor(private readonly storageService: StorageService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateDreamImage(
    dreamContent: string,
    interpretationContent: string,
    botSettings: BotSettings,
    userId?: string,
    chatRoomId?: string,
    isPremium = false,
  ): Promise<string | null> {
    try {
      const imagePrompt = this.extractImagePromptFromDream(
        dreamContent,
        interpretationContent,
        botSettings,
      );

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
      });

      const tempImageUrl = response.data?.[0]?.url;
      if (!tempImageUrl) {
        return null;
      }

      // 항상 Supabase Storage에 저장
      if (!userId || !chatRoomId) {
        // userId나 chatRoomId가 없는 경우 임시 ID 생성
        const tempUserId = userId || 'temp-' + Date.now();
        const tempChatRoomId = chatRoomId || 'temp-' + Date.now();

        const storageUrl = await this.storageService.uploadImageFromUrl(
          tempImageUrl,
          tempUserId,
          tempChatRoomId,
        );

        return storageUrl || null;
      }

      // 정상적인 케이스: Storage에 저장 후 DB에도 기록
      const storageUrl = await this.storageService.uploadImageFromUrl(
        tempImageUrl,
        userId,
        chatRoomId,
      );

      if (!storageUrl) {
        console.error(
          'Failed to upload image to storage, returning DALL-E URL as fallback',
        );
        return tempImageUrl; // Storage 실패 시 DALL-E URL 폴백
      }

      // 데이터베이스에 저장
      await this.saveGeneratedImage({
        userId,
        chatRoomId,
        imageUrl: storageUrl,
        personalityId: botSettings.personalityId,
        imagePrompt,
        isPremium,
      });

      return storageUrl;
    } catch (error) {
      console.error('Image generation error:', error);
      return null; // 이미지 생성 실패 시 null 반환 (해몽은 계속 진행)
    }
  }

  private extractImagePromptFromDream(
    dreamContent: string,
    interpretationContent: string,
    botSettings: BotSettings,
  ): string {
    const cleanedDreamContent = this.cleanDreamContent(dreamContent);
    const cleanedInterpretation = this.cleanInterpretationContent(
      interpretationContent,
    );
    const stylePrompt = this.getStylePrompt(botSettings);

    console.log(cleanedDreamContent, cleanedInterpretation, stylePrompt);

    return `${stylePrompt}

Dream: "${cleanedInterpretation}" `;
  }

  private cleanDreamContent(content: string): string {
    // 꿈 내용에서 핵심 키워드와 이미지 요소 추출
    let cleaned = content
      .replace(/[^\w\s가-힣.,!?]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 중복 공백 제거
      .trim();

    // 길이 제한 (DALL-E 프롬프트 최대 길이 고려)
    if (cleaned.length > 150) {
      cleaned = cleaned.substring(0, 150) + '...';
    }

    return cleaned;
  }

  private cleanInterpretationContent(content: string): string {
    // AI로 요약된 해몽 내용을 그대로 사용 (이미 100자 이내로 요약됨)
    const cleaned = content
      .replace(/[^\w\s가-힣.,!?]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 중복 공백 제거
      .replace(/🎨.*?버튼을.*?세요!/g, '') // 이미지 생성 버튼 관련 텍스트 제거
      .replace(/💎.*?이용해보세요!/g, '') // 프리미엄 안내 텍스트 제거
      .trim();

    return cleaned;
  }

  private getStylePrompt(botSettings: BotSettings): string {
    return `일본 1990-2000년대 소년만화 스타일`;
  }

  private async saveGeneratedImage(data: {
    userId: string;
    chatRoomId: string;
    imageUrl: string;
    personalityId: number;
    imagePrompt: string;
    isPremium: boolean;
  }): Promise<GeneratedImage | null> {
    try {
      const { data: savedImage, error } = await getSupabaseAdminClient()
        .from('generated_images')
        .insert([
          {
            user_id: data.userId,
            chat_room_id: data.chatRoomId,
            image_url: data.imageUrl,
            image_prompt: data.imagePrompt,
            personalityId: data.personalityId,
            generation_model: 'dall-e-3',
            is_premium: data.isPremium,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Failed to save generated image:', error);
        return null;
      }

      return this.mapSupabaseImageToEntity(savedImage);
    } catch (error) {
      console.error('Error saving generated image:', error);
      return null;
    }
  }

  private mapSupabaseImageToEntity(data: any): GeneratedImage {
    return {
      id: data.id,
      userId: data.user_id,
      chatRoomId: data.chat_room_id,
      imageUrl: data.image_url,
      imagePrompt: data.image_prompt,
      personalityId: data.personalityId,
      generationModel: data.generation_model,
      isPremium: data.is_premium,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
