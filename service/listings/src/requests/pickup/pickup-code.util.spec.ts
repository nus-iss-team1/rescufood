import {
  createPickupCode,
  hashPickupCode,
  pickupCodeMatches,
  PICKUP_CODE_LENGTH,
} from './pickup-code.util';

describe('createPickupCode', () => {
  it('generates a zero-padded numeric code of the configured length', () => {
    for (let i = 0; i < 50; i++) {
      const code = createPickupCode();
      expect(code).toHaveLength(PICKUP_CODE_LENGTH);
      expect(code).toMatch(/^\d+$/);
    }
  });
});

describe('pickupCodeMatches', () => {
  it('returns true for the code that produced the hash', () => {
    const code = '042917';
    expect(pickupCodeMatches(code, hashPickupCode(code))).toBe(true);
  });

  it('returns false for a different code', () => {
    expect(pickupCodeMatches('000000', hashPickupCode('111111'))).toBe(false);
  });

  it('returns false rather than throwing when the hash is a different length', () => {
    expect(pickupCodeMatches('042917', 'not-a-real-hash')).toBe(false);
  });
});
