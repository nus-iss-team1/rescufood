import 'express';

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
