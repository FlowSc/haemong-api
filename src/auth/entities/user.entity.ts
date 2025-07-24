import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum';

export class User {
  id: string;
  email: string;
  nickname: string;
  password?: string;
  provider: AuthProvider;
  providerId?: string;
  subscriptionStatus: SubscriptionStatus;
  premiumExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
