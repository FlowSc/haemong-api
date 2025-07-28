import { User } from '../entities/user.entity';
import { UserStatsDto } from './user-stats.dto';

export class UserProfileDto {
  user: Omit<User, 'password'>;
  stats: UserStatsDto;
}
