import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthenticatedUser } from './types/express';
import { requestActor, requestLogLevel } from './request-logging';

const request = (user?: AuthenticatedUser) =>
  ({ user }) as unknown as IncomingMessage;
const response = (statusCode: number) =>
  ({ statusCode }) as unknown as ServerResponse;

describe('requestActor', () => {
  it('reports the caller so a denial names who was refused', () => {
    expect(
      requestActor(request({ userId: 'u1', role: 'admin', orgId: 'o1' })),
    ).toEqual({ userId: 'u1', role: 'admin' });
  });

  it('omits the org - a denial needs who, not what they belong to', () => {
    expect(
      requestActor(request({ userId: 'u1', role: 'user', orgId: 'o1' })),
    ).not.toHaveProperty('orgId');
  });

  it('stays undefined on an unauthenticated request', () => {
    expect(requestActor(request())).toEqual({
      userId: undefined,
      role: undefined,
    });
  });
});

describe('requestLogLevel', () => {
  it('warns on a denial, so it stands out from successful traffic', () => {
    expect(requestLogLevel(request(), response(403))).toBe('warn');
    expect(requestLogLevel(request(), response(401))).toBe('warn');
  });

  it('errors on a server fault', () => {
    expect(requestLogLevel(request(), response(500))).toBe('error');
    expect(requestLogLevel(request(), response(200), new Error('boom'))).toBe(
      'error',
    );
  });

  it('leaves successful requests at info', () => {
    expect(requestLogLevel(request(), response(200))).toBe('info');
    expect(requestLogLevel(request(), response(201))).toBe('info');
  });
});
