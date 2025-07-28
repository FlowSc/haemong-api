import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
const Replicate = require('replicate');
import { BotSettings } from '../entities/bot-settings.entity';
import { BotPersonality } from '../entities/bot-personality.entity';

@Injectable()
export class VideoGenerationService {
  private openai: OpenAI;
  private replicate: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * 꿈 내용을 바탕으로 실제 영상을 생성하고 URL을 반환합니다
   */
  async generateDreamVideo(
    dreamContent: string,
    botSettings: BotSettings,
  ): Promise<string> {
    try {
      // 1. 꿈 해몽 텍스트 생성
      const interpretation = await this.generateDreamInterpretation(
        dreamContent,
        botSettings,
      );

      // 2. 영상용 프롬프트 생성
      const videoPrompt = this.createVideoPrompt(
        dreamContent,
        interpretation,
        botSettings,
      );

      // 3. Replicate API를 사용하여 실제 영상 생성
      const videoUrl = await this.generateVideoWithReplicate(videoPrompt);

      return videoUrl;
    } catch (error) {
      console.error('꿈 영상 생성 중 오류:', error);
      throw new Error(
        '꿈 영상 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }

  /**
   * Replicate API를 사용하여 실제 영상 생성
   */
  private async generateVideoWithReplicate(prompt: string): Promise<string> {
    try {
      console.log('영상 생성 시작:', prompt);

      // Hunyuan Video 모델 사용
      const output = await this.replicate.run(
        'tencent/hunyuan-video:6c9132aee14409cd6568d030453f1ba50f5f3412b844fe67f78a9eb62d55664f',
        {
          input: {
            prompt: prompt,
            video_length: 100, // 4k+1 format (약 5.4초 at 24fps)
            width: 480, // 9:16 비율에 가까운 세로형
            height: 850, // 9:16 비율
            fps: 24,
            infer_steps: 50,
            embedded_guidance_scale: 6,
          },
        },
      );

      if (output && typeof output === 'string') {
        return output;
      } else if (Array.isArray(output) && output.length > 0) {
        return output[0];
      }

      throw new Error('영상 생성 결과를 받지 못했습니다.');
    } catch (error) {
      console.error('Replicate 영상 생성 오류:', error);
      // Fallback: 다른 모델로 시도
      return await this.generateFallbackVideo(prompt);
    }
  }

  /**
   * 영상 생성을 위한 이미지 생성
   */
  private async generateImageForVideo(prompt: string): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: `${prompt}, cinematic style, vertical 9:16 aspect ratio, high quality, dreamlike atmosphere, suitable for video generation`,
        n: 1,
        size: '1024x1792',
        quality: 'standard',
        style: 'vivid',
      });

      return response.data?.[0]?.url || '';
    } catch (error) {
      console.error('영상용 이미지 생성 오류:', error);
      throw new Error('영상용 이미지 생성에 실패했습니다.');
    }
  }

  /**
   * 대체 영상 생성 (다른 모델로 시도)
   */
  private async generateFallbackVideo(prompt: string): Promise<string> {
    try {
      // 더 간단한 text-to-video 모델 사용
      const output = await this.replicate.run(
        'anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c6b2c53589db5b3f5de1b4c5a1f47b0b7a0e7b',
        {
          input: {
            prompt: prompt,
            width: 1024,
            height: 576,
            num_frames: 24,
            num_inference_steps: 50,
            guidance_scale: 17.5,
            model: 'xl',
          },
        },
      );

      if (output && typeof output === 'string') {
        return output;
      } else if (Array.isArray(output) && output.length > 0) {
        return output[0];
      }

      throw new Error('대체 영상 생성에도 실패했습니다.');
    } catch (error) {
      console.error('대체 영상 생성 오류:', error);
      // 최종 대안: 정적 이미지 반환
      return await this.generateImageForVideo(prompt);
    }
  }

  /**
   * 꿈 해몽 해석 텍스트 생성
   */
  private async generateDreamInterpretation(
    dreamContent: string,
    botSettings: BotSettings,
  ): Promise<string> {
    const personality = this.getBotPersonality(botSettings);

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `당신은 ${personality.name}입니다. ${personality.description} ${personality.tone}로 꿈을 해석해주세요.`,
        },
        {
          role: 'user',
          content: `다음 꿈을 해석해주세요: ${dreamContent}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * 영상 생성용 프롬프트 생성 (10초 영상에 적합)
   */
  private createVideoPrompt(
    dreamContent: string,
    interpretation: string,
    botSettings: BotSettings,
  ): string {
    const visualStyle = this.getVisualStyle(botSettings);

    return `Dream scene: ${dreamContent}. ${visualStyle}, dynamic camera movement, flowing transitions, mystical atmosphere, ethereal particles floating, gentle morphing effects, dreamy lighting changes, cinematic quality, vertical 9:16 format, surreal and enchanting environment, smooth 10-second narrative flow`;
  }

  /**
   * 꿈 내용을 바탕으로 쇼츠 영상 스크립트를 생성합니다
   */
  async generateVideoScript(
    dreamContent: string,
    botSettings: BotSettings,
  ): Promise<string> {
    try {
      const videoPrompt = this.createVideoScriptPrompt(
        dreamContent,
        botSettings,
      );

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '당신은 꿈 해몽을 주제로 한 쇼츠 영상 스크립트를 작성하는 전문가입니다. 30초 내외의 짧고 임팩트 있는 영상 스크립트를 작성해주세요.',
          },
          {
            role: 'user',
            content: videoPrompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('영상 스크립트 생성 중 오류:', error);
      throw new Error('영상 스크립트 생성에 실패했습니다.');
    }
  }

  /**
   * 꿈의 핵심 장면들을 추출하여 이미지 프롬프트 배열을 생성합니다
   */
  async generateImagePrompts(
    dreamContent: string,
    botSettings: BotSettings,
  ): Promise<string[]> {
    try {
      const prompt = `
다음 꿈 내용을 분석하여 시각적으로 표현 가능한 3-4개의 핵심 장면을 추출해주세요.
각 장면은 이미지 생성 AI가 이해할 수 있는 영어 프롬프트로 작성해주세요.

꿈 내용: ${dreamContent}

스타일: ${this.getVisualStyle(botSettings)}

응답 형식:
1. [첫 번째 장면 이미지 프롬프트]
2. [두 번째 장면 이미지 프롬프트]
3. [세 번째 장면 이미지 프롬프트]
4. [네 번째 장면 이미지 프롬프트] (선택사항)
      `;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      return this.parseImagePrompts(content);
    } catch (error) {
      console.error('이미지 프롬프트 생성 중 오류:', error);
      throw new Error('이미지 프롬프트 생성에 실패했습니다.');
    }
  }

  /**
   * 여러 이미지를 생성합니다 (영상의 각 장면용)
   */
  async generateSceneImages(imagePrompts: string[]): Promise<string[]> {
    try {
      const imageUrls: string[] = [];

      for (const prompt of imagePrompts) {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: `${prompt}, cinematic style, vertical aspect ratio 9:16 for mobile video, high quality, dreamlike atmosphere`,
          n: 1,
          size: '1024x1792', // 세로형 비율 (9:16)
          quality: 'standard',
          style: 'vivid',
        });

        const imageUrl = response.data?.[0]?.url;
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }

        // API 요청 제한을 위한 딜레이
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return imageUrls;
    } catch (error) {
      console.error('장면 이미지 생성 중 오류:', error);
      throw new Error('장면 이미지 생성에 실패했습니다.');
    }
  }

  /**
   * 영상 생성을 위한 메타데이터를 생성합니다
   */
  generateVideoMetadata(
    dreamContent: string,
    script: string,
    imageUrls: string[],
    botSettings: BotSettings,
  ) {
    return {
      title: this.generateVideoTitle(dreamContent),
      description: script,
      duration: 30, // 30초
      scenes: imageUrls.map((url, index) => ({
        imageUrl: url,
        duration: Math.ceil(30 / imageUrls.length), // 균등 분배
        order: index + 1,
      })),
      style: {
        gender: botSettings.personality?.gender || 'female',
        approach: botSettings.personality?.style || 'eastern',
      },
      createdAt: new Date(),
    };
  }

  private createVideoScriptPrompt(
    dreamContent: string,
    botSettings: BotSettings,
  ): string {
    const personality = this.getBotPersonality(botSettings);

    return `
꿈 내용: ${dreamContent}

위의 꿈을 ${personality.name} 캐릭터로 해석하여 30초 쇼츠 영상 스크립트를 작성해주세요.

캐릭터 특징: ${personality.description}
어조: ${personality.tone}

스크립트 구성:
1. 훅 (0-3초): 시청자의 관심을 끄는 강력한 오프닝
2. 꿈 소개 (3-10초): 꿈의 핵심 내용 간략 설명
3. 해몽 (10-25초): 꿈의 의미와 상징 해석
4. 마무리 (25-30초): 인상적인 마무리와 행동 촉구

응답 형식:
[훅] (텍스트)
[꿈 소개] (텍스트)
[해몽] (텍스트)
[마무리] (텍스트)

각 섹션은 자연스럽게 연결되어야 하며, 시청자가 끝까지 시청할 수 있도록 매력적으로 작성해주세요.
    `;
  }

  private getBotPersonality(botSettings: BotSettings) {
    const personality: BotPersonality | null = botSettings.personality || null;

    if (personality) {
      return {
        name: personality.displayName,
        description:
          personality.personalityTraits.approach +
          ' 접근법의 ' +
          personality.displayName,
        tone: personality.personalityTraits.tone,
      };
    }

    // Fallback for backward compatibility
    const gender: string = personality ? (personality as any).gender : 'female';
    const style: string = personality ? (personality as any).style : 'eastern';

    if (gender === 'male' && style === 'eastern') {
      return {
        name: '전통 해몽사',
        description: '권위있고 격식있는 해몽 전문가',
        tone: '격식있고 권위적인 어조',
      };
    } else if (gender === 'female' && style === 'eastern') {
      return {
        name: '따뜻한 해몽사',
        description: '어머니같이 따뜻하고 포용적인 해몽사',
        tone: '따뜻하고 친근한 어조',
      };
    } else if (gender === 'male' && style === 'western') {
      return {
        name: '심리학자',
        description: '과학적이고 논리적인 분석을 하는 전문가',
        tone: '전문적이고 분석적인 어조',
      };
    } else {
      return {
        name: '상담사',
        description: '공감적이고 치유적인 상담 전문가',
        tone: '공감적이고 부드러운 어조',
      };
    }
  }

  private getVisualStyle(botSettings: BotSettings): string {
    const style = botSettings.personality?.style || 'eastern';
    if (style === 'eastern') {
      return 'traditional Korean art style, mystical, oriental atmosphere';
    } else {
      return 'modern psychological imagery, contemporary art style, western aesthetic';
    }
  }

  private parseImagePrompts(content: string): string[] {
    const lines = content.split('\n');
    const prompts: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && match[1]) {
        prompts.push(match[1].trim());
      }
    }

    return prompts.length > 0
      ? prompts
      : ['Dream scene with mystical atmosphere'];
  }

  private generateVideoTitle(dreamContent: string): string {
    const keywords = dreamContent.split(' ').slice(0, 3).join(' ');
    return `🌙 꿈해몽: ${keywords}에 대한 꿈의 의미는?`;
  }
}
