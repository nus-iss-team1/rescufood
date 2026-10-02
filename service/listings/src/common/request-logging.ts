import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthenticatedUser } from './types/express';

// Attaches the caller to every request log, so a denied report or audit read
// is reviewable by *who* was refused. The response body is never logged, so
// the data they were refused stays out of the logs.
//
// Typed against IncomingMessage because that is pino-http's customProps
// signature; the guards put `user` on it before any 403 is thrown.
export function requestActor(req: IncomingMessage): {
  userId?: string;
  role?: string;
} {
  const { user } = req as IncomingMessage & { user?: AuthenticatedUser };
  return { userId: user?.userId, role: user?.role };
}

// pino-http has no status-based default - without this every response logs
// at info, which buries a denial among the successful requests.
export function requestLogLevel(
  _req: IncomingMessage,
  res: ServerResponse,
  err?: Error,
): 'info' | 'warn' | 'error' {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}
