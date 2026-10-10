import { relistBlockedReason, type RelistPolicy } from './relist-policy.util';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-06T08:00:00Z');
const policy: RelistPolicy = { cutoffMs: 3 * HOUR, minPickupMs: 3 * HOUR };

const at = (offsetHours: number) =>
  new Date(NOW.getTime() + offsetHours * HOUR);
const window = (startHours: number, endHours: number) => ({
  pickupWindowStart: at(startHours),
  pickupWindowEnd: at(endHours),
});

describe('relistBlockedReason', () => {
  it('allows relisting when cancelled before the cutoff with time to spare', () => {
    expect(relistBlockedReason(window(5, 9), NOW, policy)).toBeNull();
  });

  it('allows relisting exactly at the cutoff', () => {
    expect(relistBlockedReason(window(3, 7), NOW, policy)).toBeNull();
  });

  it('blocks relisting once the cutoff has passed', () => {
    expect(relistBlockedReason(window(2.9, 7), NOW, policy)).toBe(
      'past_cutoff',
    );
  });

  it('blocks relisting while the window is already open', () => {
    expect(relistBlockedReason(window(-1, 8), NOW, policy)).toBe('past_cutoff');
  });

  it('blocks relisting when too little pickup time remains', () => {
    const shortPolicy = { cutoffMs: HOUR, minPickupMs: 3 * HOUR };
    expect(relistBlockedReason(window(1.5, 2.5), NOW, shortPolicy)).toBe(
      'insufficient_pickup_time',
    );
  });

  it('allows relisting with exactly the minimum pickup time left', () => {
    const shortPolicy = { cutoffMs: HOUR, minPickupMs: 3 * HOUR };
    expect(relistBlockedReason(window(1, 3), NOW, shortPolicy)).toBeNull();
  });

  it('blocks relisting when the listing has no pickup window', () => {
    expect(
      relistBlockedReason(
        { pickupWindowStart: null, pickupWindowEnd: null },
        NOW,
        policy,
      ),
    ).toBe('past_cutoff');
  });
});
