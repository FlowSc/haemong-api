import { User } from '../src/auth/entities/user.entity';

declare module 'express' {
  interface Request {
    user?: User;
  }
}