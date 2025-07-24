import { Injectable } from '@nestjs/common';
import { getSupabaseAdminClient } from '../../config/supabase.config';

@Injectable()
export class NicknameService {
  private readonly words = [
    '꿈꾸는',
    '빛나는',
    '신비한',
    '환상의',
    '마법의',
    '황금의',
    '은빛의',
    '별빛의',
    '달빛의',
    '바람의',
    '구름의',
    '하늘의',
    '바다의',
    '숲속의',
    '산속의',
    '꽃의',
    '나비',
    '새벽',
    '석양',
    '무지개',
    '별똥별',
    '꽃잎',
    '이슬',
    '진주',
  ];

  generateRandomNickname(): string {
    const randomWord =
      this.words[Math.floor(Math.random() * this.words.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `${randomWord}${randomNumber}`;
  }

  async generateUniqueNickname(): Promise<string> {
    let nickname = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 50;

    while (!isUnique && attempts < maxAttempts) {
      nickname = this.generateRandomNickname();
      isUnique = await this.checkNicknameAvailability(nickname);
      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        'Unable to generate unique nickname after maximum attempts',
      );
    }

    return nickname;
  }

  async checkNicknameAvailability(nickname: string): Promise<boolean> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from('users')
        .select('id')
        .eq('nickname', nickname)
        .single();

      if (error && error.code === 'PGRST116') {
        return true;
      }

      if (error) {
        throw error;
      }

      return !data;
    } catch (error) {
      if (error.code === 'PGRST116') {
        return true;
      }
      throw error;
    }
  }
}
