// Stub for the ESM-only `jose`, mapped in jest-integration.json.

export function createRemoteJWKSet(): () => never {
  return () => {
    throw new Error('jose is stubbed in integration tests');
  };
}

export function jwtVerify(): Promise<never> {
  return Promise.reject(new Error('jose is stubbed in integration tests'));
}

export type JWTVerifyGetKey = unknown;
