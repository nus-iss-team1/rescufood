import { requestFingerprint } from './request-fingerprint.util';

const dto = (listingId: string, idempotencyKey = 'k') => ({
  listingId,
  idempotencyKey,
});

describe('requestFingerprint', () => {
  it('is stable for the same claim-defining fields', () => {
    expect(requestFingerprint(dto('listing-1'))).toBe(
      requestFingerprint(dto('listing-1')),
    );
  });

  it('ignores the idempotency key itself', () => {
    expect(requestFingerprint(dto('listing-1', 'k1'))).toBe(
      requestFingerprint(dto('listing-1', 'k2')),
    );
  });

  it('differs when the listing differs', () => {
    expect(requestFingerprint(dto('listing-1'))).not.toBe(
      requestFingerprint(dto('listing-2')),
    );
  });

  it('is a sha256 hex digest', () => {
    expect(requestFingerprint(dto('listing-1'))).toMatch(/^[0-9a-f]{64}$/);
  });
});
