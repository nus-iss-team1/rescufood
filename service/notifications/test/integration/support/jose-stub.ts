// Stub for the ESM-only `jose` (see jest-integration.json); no signature check.

export function createRemoteJWKSet(): () => never {
  return () => {
    throw new Error('jose key resolution is stubbed in integration tests');
  };
}

export function jwtVerify(
  token: string,
  _getKey: unknown,
  options?: { issuer?: string },
): Promise<{ payload: Record<string, unknown> }> {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return Promise.reject(new Error('malformed token'));
  }

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(
      Buffer.from(segments[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  } catch {
    return Promise.reject(new Error('unreadable token payload'));
  }

  if (options?.issuer && claims.iss !== options.issuer) {
    return Promise.reject(new Error('unexpected issuer'));
  }
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    return Promise.reject(new Error('token expired'));
  }
  return Promise.resolve({ payload: claims });
}

export type JWTVerifyGetKey = unknown;
