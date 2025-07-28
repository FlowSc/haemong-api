export class UserStatsDto {
  totalDreamInterpretations: number;
  totalImagesGenerated: number;
  totalChatRooms: number;
  currentMonthInterpretations: number;
  isPremiumUser: boolean;
  joinedDate: Date;
  lastActivityDate?: Date;
}
