import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BotSettings } from '../entities/bot-settings.entity';
import { GeneratedImage } from '../entities/generated-image.entity';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';
import { getSupabaseAdminClient } from '../../config/supabase.config';

@Injectable()
export class ImageGenerationService {
  private openai: OpenAI;

  constructor() {
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
        style: botSettings.style === BotStyle.EASTERN ? 'natural' : 'vivid',
      });

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        return null;
      }

      // Save to generated_images table if user info is provided
      if (userId && chatRoomId) {
        await this.saveGeneratedImage({
          userId,
          chatRoomId,
          imageUrl,
          imagePrompt,
          botGender: botSettings.gender,
          botStyle: botSettings.style,
          isPremium,
        });
      }

      return imageUrl;
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
    const cleanedInterpretation = this.cleanInterpretationContent(interpretationContent);
    const stylePrompt = this.getStylePrompt(botSettings);

    console.log(cleanedDreamContent, cleanedInterpretation, stylePrompt);
    

    return `Create a dreamlike, artistic visualization in Japanese anime style based on this dream and its interpretation:


Interpretation: "${cleanedInterpretation}"

${stylePrompt} The image should combine the literal dream imagery with the symbolic meanings from the interpretation. Focus on the emotional and spiritual significance revealed in the analysis. Use soft, ethereal lighting and dream-like atmosphere. Render in Japanese anime/manga art style with detailed character designs, vibrant colors, and expressive visual storytelling typical of anime.`;
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
    let cleaned = content
      .replace(/[^\w\s가-힣.,!?]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 중복 공백 제거
      .replace(/🎨.*?버튼을.*?세요!/g, '') // 이미지 생성 버튼 관련 텍스트 제거
      .replace(/💎.*?이용해보세요!/g, '') // 프리미엄 안내 텍스트 제거
      .trim();

    return cleaned;
  }

  private getStylePrompt(botSettings: BotSettings): string {
    const { gender, style } = botSettings;

    if (style === BotStyle.EASTERN) {
      return `Style: Japanese anime style with traditional Korean art influence, featuring flowing lines, soft colors, and mystical elements. Incorporate symbols from Korean traditional art, nature motifs like mountains, water, and celestial elements. Use anime-style character designs with watercolor-like textures and soft gradients.`;
    } else {
      return `Style: Japanese anime style with Western surrealist influence, featuring bold colors and psychological symbolism. Think anime meets Carl Jung's dream analysis. Use contemporary anime art techniques with rich textures, dramatic lighting, and expressive character designs typical of modern anime.`;
    }
  }

  async generateWelcomeImage(botSettings: BotSettings): Promise<string | null> {
    try {
      const welcomePrompt = this.getWelcomeImagePrompt(botSettings);

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: welcomePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: botSettings.style === BotStyle.EASTERN ? 'natural' : 'vivid',
      });

      return response.data?.[0]?.url || null;
    } catch (error) {
      console.error('Welcome image generation error:', error);
      return null;
    }
  }

  private getWelcomeImagePrompt(botSettings: BotSettings): string {
    const { gender, style } = botSettings;

    if (gender === BotGender.MALE && style === BotStyle.EASTERN) {
      return 'A wise Korean sage in traditional hanbok sitting in a serene mountain temple, surrounded by ancient books and scrolls about dream interpretation. Soft moonlight filtering through paper windows, creating a mystical atmosphere of wisdom and tranquility. Rendered in Japanese anime art style with detailed character design and expressive features.';
    } else if (gender === BotGender.FEMALE && style === BotStyle.EASTERN) {
      return 'A gentle Korean woman in elegant hanbok sitting by a peaceful lotus pond under starlight, with floating dream symbols like butterflies and cherry blossoms around her. Warm, nurturing atmosphere with soft traditional colors. Rendered in Japanese anime art style with beautiful character design and expressive eyes.';
    } else if (gender === BotGender.MALE && style === BotStyle.WESTERN) {
      return 'A professional male psychologist in a modern study filled with psychology books, sitting beside a window overlooking a cityscape at dusk. Clean, analytical environment with subtle symbolic elements representing the unconscious mind. Rendered in Japanese anime art style with detailed character design and modern setting.';
    } else if (gender === BotGender.FEMALE && style === BotStyle.WESTERN) {
      return 'A warm, empathetic female therapist in a cozy counseling room with soft lighting, comfortable chairs, and healing plants. Peaceful, safe environment with gentle colors that evoke trust and emotional healing. Rendered in Japanese anime art style with expressive character design and warm atmosphere.';
    }

    // 기본값
    return 'A mystical dream interpretation scene with soft ethereal lighting and symbolic elements representing the world of dreams and subconscious. Rendered in Japanese anime art style.';
  }

  private async saveGeneratedImage(data: {
    userId: string;
    chatRoomId: string;
    imageUrl: string;
    imagePrompt: string;
    botGender: BotGender;
    botStyle: BotStyle;
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
            bot_gender: data.botGender,
            bot_style: data.botStyle,
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
      botGender: data.bot_gender,
      botStyle: data.bot_style,
      generationModel: data.generation_model,
      isPremium: data.is_premium,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
