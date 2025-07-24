import { BotGender } from '../../common/enums/bot-gender.enum';
import { BotStyle } from '../../common/enums/bot-style.enum';

export class GeneratedImage {
  id: string;
  userId: string;
  chatRoomId: string;
  imageUrl: string;
  imagePrompt?: string;
  botGender: BotGender;
  botStyle: BotStyle;
  generationModel: string;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}