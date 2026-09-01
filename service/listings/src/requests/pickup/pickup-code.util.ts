import { createHash, randomInt, timingSafeEqual } from 'crypto';

export const PICKUP_CODE_LENGTH = 6;
export const PICKUP_CODE_TTL_MINUTES = 60;

// Failed verify attempts allowed against a single generated code before it's
// force-invalidated and the caller has to generate a new one. Bounds online
// guessing of the 10^6 code space to a negligible success rate - see
// RequestsService.verifyPickupCode.
export const MAX_PICKUP_CODE_ATTEMPTS = 3;

// 6-digit numeric OTP, zero-padded (e.g. "042917") - short enough to type,
// or to fall back on if a QR render of it fails to scan.
export function createPickupCode(): string {
  return randomInt(0, 10 ** PICKUP_CODE_LENGTH)
    .toString()
    .padStart(PICKUP_CODE_LENGTH, '0');
}

// Only the hash is ever persisted (see requests.pickupCodeHash) - the raw
// code is returned to the generating caller once and never stored.
export function hashPickupCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

// Constant-time comparison so a wrong guess can't be timed to learn how
// many leading hash bytes it got right.
export function pickupCodeMatches(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashPickupCode(code));
  const expected = Buffer.from(hash);
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
