export interface PersonalityTraits {
  traits: string[];
  tone: string;
  approach: string;
  keywords: string[];
}

export class BotPersonality {
  id: number;
  name: string;
  displayName: string;
  gender: string;
  style: string;
  personalityTraits: PersonalityTraits;
  systemPrompt: string;
  welcomeMessage: string;
  imageStylePrompt?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
