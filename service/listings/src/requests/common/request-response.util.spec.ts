import { toPublicRequest } from './request-response.util';
import type { ListingRequest } from '../requests.repository';

const fullRequest: ListingRequest = {
  id: 'request-1',
  listingId: 'listing-1',
  rescueOrgId: 'org-rescue',
  claimedBy: 'user-rescue',
  status: 'active',
  requestedQuantity: '5.00',
  requestedAt: new Date('2026-08-06T00:00:00Z'),
  cancelledAt: null,
  cancellationReason: '',
  pickupCode: '424242',
  pickupCodeHash: 'super-secret-hash',
  codeExpiresAt: new Date('2026-08-06T02:00:00Z'),
  codeGeneratedBy: 'user-donor',
  pickupCodeAttempts: 3,
  verifiedBy: null,
  collectedQuantity: null,
  collectedAt: null,
  noShowReason: '',
  pickupOpenReminderSentAt: null,
  pickupCloseReminderSentAt: null,
  createdAt: new Date('2026-08-06T00:00:00Z'),
  updatedAt: new Date('2026-08-06T01:00:00Z'),
};

describe('toPublicRequest', () => {
  it('omits the raw pickup code, its hash, and the attempt counter', () => {
    const result = toPublicRequest(fullRequest);

    expect(result).not.toHaveProperty('pickupCode');
    expect(result).not.toHaveProperty('pickupCodeHash');
    expect(result).not.toHaveProperty('pickupCodeAttempts');
  });

  it('keeps every other field intact', () => {
    const {
      pickupCode,
      pickupCodeHash,
      pickupCodeAttempts,
      pickupOpenReminderSentAt,
      pickupCloseReminderSentAt,
      ...expected
    } = fullRequest;
    void pickupCode;
    void pickupCodeHash;
    void pickupCodeAttempts;
    void pickupOpenReminderSentAt;
    void pickupCloseReminderSentAt;

    expect(toPublicRequest(fullRequest)).toEqual(expected);
  });
});
