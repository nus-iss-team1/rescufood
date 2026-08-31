import 'express';

export interface AuthenticatedUser {
  // Raw Cognito `sub` as set by JwtAuthGuard - the same id producers put on
  // an in-app notification's recipient_user_id.
  userId: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
