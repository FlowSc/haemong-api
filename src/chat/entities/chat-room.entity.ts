import { BotSettings } from './bot-settings.entity';

export class ChatRoom {
  id: string;
  userId: string;
  title: string;
  date: string; // YYYY-MM-DD format
  botSettings: BotSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
