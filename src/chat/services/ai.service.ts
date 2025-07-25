import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  getDreamInterpretationPrompt,
  DREAM_ANALYSIS_TEMPLATE,
} from '../prompts/dream-interpretation.prompt';
import { BotSettings } from '../entities/bot-settings.entity';
import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';
import { ImageGenerationService } from './image-generation.service';
import { Message } from '../entities/message.entity';
import { MessageType } from '../../common/enums/message-type.enum';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private imageGenerationService: ImageGenerationService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateDreamInterpretation(
    dreamContent: string,
    botSettings: BotSettings,
    conversationHistory: Message[] = [],
  ): Promise<string> {
    try {
      const systemPrompt = getDreamInterpretationPrompt(
        botSettings.gender,
        botSettings.style,
      );
      
      // 대화 히스토리를 OpenAI 메시지 형식으로 변환
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
      ];

      // 이전 대화 내용 추가 (최근 8개 메시지)
      for (const message of conversationHistory) {
        if (message.type === MessageType.USER) {
          messages.push({
            role: 'user',
            content: message.content,
          });
        } else if (message.type === MessageType.BOT) {
          // 봇 메시지에서 프리미엄 관련 텍스트 제거
          const cleanContent = message.content
            .replace(/\n\n🎨 \*\*이미지 생성 가능\*\*[\s\S]*$/g, '')
            .replace(/\n\n💎 \*\*프리미엄 기능 - 이미지 생성\*\*[\s\S]*$/g, '')
            .trim();
          
          messages.push({
            role: 'assistant',
            content: cleanContent,
          });
        }
      }

      // 현재 꿈 내용 추가
      const userPrompt = DREAM_ANALYSIS_TEMPLATE.replace(
        '{dream_content}',
        dreamContent,
      );
      messages.push({
        role: 'user',
        content: userPrompt,
      });

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return (
        completion.choices[0].message.content ||
        '죄송합니다. 꿈 해몽을 생성하는데 문제가 발생했습니다. 다시 시도해주세요.'
      );
    } catch (error) {
      console.error('AI service error:', error);
      return '죄송합니다. 현재 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  async summarizeInterpretation(interpretationContent: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '해몽 내용을 이미지 생성에 적합하도록 100자 이내로 핵심 키워드와 상징적 의미만 간결하게 요약해주세요. 구체적인 시각적 요소와 감정을 포함하되, 불필요한 설명은 제거하세요.',
          },
          {
            role: 'user',
            content: `다음 해몽 내용을 요약해주세요:\n${interpretationContent}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      return completion.choices[0].message.content || interpretationContent;
    } catch (error) {
      console.error('Interpretation summarization error:', error);
      return interpretationContent;
    }
  }

  async generateDreamImageUrl(
    dreamContent: string,
    interpretationContent: string,
    botSettings: BotSettings,
    userId?: string,
    chatRoomId?: string,
    isPremium = false,
  ): Promise<string | null> {
    const summarizedInterpretation = await this.summarizeInterpretation(interpretationContent);
    
    return this.imageGenerationService.generateDreamImage(
      dreamContent,
      summarizedInterpretation,
      botSettings,
      userId,
      chatRoomId,
      isPremium,
    );
  }

  async generateWelcomeMessage(botSettings: BotSettings): Promise<string> {
    const { gender, style } = botSettings;

    if (gender === BotGender.MALE && style === BotStyle.EASTERN) {
      return `안녕하십니까! 저는 동양의 전통 해몽 철학을 바탕으로 꿈을 해석하는 해몽사입니다. 

음양오행과 주역의 지혜로 여러분의 꿈에 담긴 깊은 의미를 풀어드리겠습니다. 
어떤 꿈을 꾸셨는지 자세히 말씀해 주십시오.`;
    } else if (gender === BotGender.FEMALE && style === BotStyle.EASTERN) {
      return `안녕하세요! 저는 따뜻한 마음으로 꿈을 해석해드리는 해몽사예요. 

동양의 지혜와 자연의 이치로 여러분의 마음속 이야기를 들려드릴게요.
편안하게 꿈 이야기를 들려주세요. 💫`;
    } else if (gender === BotGender.MALE && style === BotStyle.WESTERN) {
      return `안녕하세요. 저는 심리학을 전공한 꿈 분석 전문가입니다.

프로이드와 융의 이론을 바탕으로 여러분의 무의식 세계를 과학적으로 분석해드리겠습니다.
꿈의 상세한 내용을 말씀해주시면 심층 분석해드리겠습니다.`;
    } else if (gender === BotGender.FEMALE && style === BotStyle.WESTERN) {
      return `안녕하세요! 저는 상담심리학을 전공한 꿈 치료사입니다. 

따뜻한 공감과 전문적 지식으로 꿈을 통한 치유와 성장을 함께 탐색해봐요.
무엇이든 편안하게 나누어주세요. 🌸`;
    }

    // 기본값
    return `안녕하세요! 저는 여러분의 꿈을 해석해드리는 해몽 전문가입니다.

꿈의 내용을 자세히 들려주시면 정성스럽게 해몽해드리겠습니다.
편안하게 이야기해주세요!`;
  }

  async generateWelcomeImageUrl(
    botSettings: BotSettings,
    userId?: string,
  ): Promise<string | null> {
    return this.imageGenerationService.generateWelcomeImage(botSettings, userId);
  }

  getDefaultBotSettings(): BotSettings {
    return {
      gender: BotGender.FEMALE,
      style: BotStyle.EASTERN,
    };
  }
}
