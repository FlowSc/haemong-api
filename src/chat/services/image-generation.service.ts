import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BotSettings } from '../entities/bot-settings.entity';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

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
    botSettings: BotSettings,
  ): Promise<string | null> {
    try {
      const imagePrompt = this.extractImagePromptFromDream(
        dreamContent,
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

      return response.data?.[0]?.url || null;
    } catch (error) {
      console.error('Image generation error:', error);
      return null; // 이미지 생성 실패 시 null 반환 (해몽은 계속 진행)
    }
  }

  private extractImagePromptFromDream(
    dreamContent: string,
    botSettings: BotSettings,
  ): string {
    const cleanedContent = this.cleanDreamContent(dreamContent);
    const stylePrompt = this.getStylePrompt(botSettings);

    return `Create a dreamlike, artistic visualization of this dream: "${cleanedContent}". ${stylePrompt} The image should capture the symbolic and emotional essence of the dream rather than literal representation. Use soft, ethereal lighting and dream-like atmosphere.`;
  }

  private cleanDreamContent(content: string): string {
    // 꿈 내용에서 핵심 키워드와 이미지 요소 추출
    let cleaned = content
      .replace(/[^\w\s가-힣.,!?]/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 중복 공백 제거
      .trim();

    // 길이 제한 (DALL-E 프롬프트 최대 길이 고려)
    if (cleaned.length > 200) {
      cleaned = cleaned.substring(0, 200) + '...';
    }

    return cleaned;
  }

  private getStylePrompt(botSettings: BotSettings): string {
    const { gender, style } = botSettings;

    if (style === BotStyle.EASTERN) {
      return `Style: Traditional East Asian art influence with flowing lines, muted colors, and mystical elements. Incorporate symbols from Korean traditional art, nature motifs like mountains, water, and celestial elements. Use watercolor-like textures and soft gradients.`;
    } else {
      return `Style: Western surrealist art influence with bold colors and psychological symbolism. Think Salvador Dali meets Carl Jung's dream analysis. Use contemporary digital art techniques with rich textures and dramatic lighting.`;
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
      return 'A wise Eastern sage in traditional robes sitting in a serene mountain temple, surrounded by ancient books and scrolls about dream interpretation. Soft moonlight filtering through paper windows, creating a mystical atmosphere of wisdom and tranquility.';
    } else if (gender === BotGender.FEMALE && style === BotStyle.EASTERN) {
      return 'A gentle Eastern woman in elegant hanbok sitting by a peaceful lotus pond under starlight, with floating dream symbols like butterflies and cherry blossoms around her. Warm, nurturing atmosphere with soft traditional colors.';
    } else if (gender === BotGender.MALE && style === BotStyle.WESTERN) {
      return 'A professional male psychologist in a modern study filled with psychology books, sitting beside a window overlooking a cityscape at dusk. Clean, analytical environment with subtle symbolic elements representing the unconscious mind.';
    } else if (gender === BotGender.FEMALE && style === BotStyle.WESTERN) {
      return 'A warm, empathetic female therapist in a cozy counseling room with soft lighting, comfortable chairs, and healing plants. Peaceful, safe environment with gentle colors that evoke trust and emotional healing.';
    }

    // 기본값
    return 'A mystical dream interpretation scene with soft ethereal lighting and symbolic elements representing the world of dreams and subconscious.';
  }
}
