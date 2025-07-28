import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { DREAM_ANALYSIS_TEMPLATE } from '../prompts/dream-interpretation.prompt';
import { BotSettings } from '../entities/bot-settings.entity';
import { BotPersonality } from '../entities/bot-personality.entity';
import { BotPersonalityService } from './bot-personality.service';
import { ImageGenerationService } from './image-generation.service';
import { Message } from '../entities/message.entity';
import { MessageType } from '../../common/enums/message-type.enum';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(
    private imageGenerationService: ImageGenerationService,
    private botPersonalityService: BotPersonalityService,
  ) {
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
      // 봇 성격 정보 가져오기
      const personality =
        botSettings.personality ||
        (await this.botPersonalityService.findById(botSettings.personalityId));

      if (!personality) {
        throw new Error('봇 성격 정보를 찾을 수 없습니다.');
      }

      const systemPrompt = personality.systemPrompt;

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

  async summarizeInterpretation(
    interpretationContent: string,
  ): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '해몽 내용을 이미지 생성에 적합하도록 100자 이내로 핵심 키워드와 상징적 의미만 간결하게 요약해주세요. 구체적인 시각적 요소와 감정을 포함하되, 불필요한 설명은 제거하세요.',
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
    const summarizedInterpretation = await this.summarizeInterpretation(
      interpretationContent,
    );

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
    try {
      // 봇 성격 정보 가져오기
      const personality =
        botSettings.personality ||
        (await this.botPersonalityService.findById(botSettings.personalityId));

      if (!personality) {
        const defaultPersonality =
          await this.botPersonalityService.getDefaultPersonality();
        return defaultPersonality.welcomeMessage;
      }

      return personality.welcomeMessage;
    } catch (error) {
      console.error('Welcome message generation error:', error);
      return `안녕하세요! 저는 여러분의 꿈을 해석해드리는 해몽 전문가입니다.

꿈의 내용을 자세히 들려주시면 정성스럽게 해몽해드리겠습니다.
편안하게 이야기해주세요!`;
    }
  }

  async getDefaultBotSettings(): Promise<BotSettings> {
    const defaultPersonality =
      await this.botPersonalityService.getDefaultPersonality();
    return {
      personalityId: defaultPersonality.id,
      personality: defaultPersonality,
    };
  }
}
