import { BadRequestException } from '@nestjs/common';
import {
  assertListingIsEditable,
  assertValidStatusTransition,
} from './listing-status.util';

describe('assertValidStatusTransition', () => {
  it('allows publishing a draft', () => {
    expect(() =>
      assertValidStatusTransition('draft', 'available'),
    ).not.toThrow();
  });

  it('allows cancelling from draft, available or reserved', () => {
    expect(() =>
      assertValidStatusTransition('draft', 'cancelled'),
    ).not.toThrow();
    expect(() =>
      assertValidStatusTransition('available', 'cancelled'),
    ).not.toThrow();
    expect(() =>
      assertValidStatusTransition('reserved', 'cancelled'),
    ).not.toThrow();
  });

  it('allows unpublishing back to draft', () => {
    expect(() =>
      assertValidStatusTransition('available', 'draft'),
    ).not.toThrow();
  });

  it('is a no-op when the status is unchanged, even for terminal states', () => {
    expect(() =>
      assertValidStatusTransition('cancelled', 'cancelled'),
    ).not.toThrow();
  });

  it('rejects setting a request/pickup-driven status directly', () => {
    expect(() => assertValidStatusTransition('draft', 'reserved')).toThrow(
      BadRequestException,
    );
    expect(() => assertValidStatusTransition('available', 'collected')).toThrow(
      BadRequestException,
    );
    expect(() => assertValidStatusTransition('available', 'expired')).toThrow(
      BadRequestException,
    );
  });

  it('rejects any transition out of a terminal state', () => {
    for (const terminal of ['collected', 'expired', 'cancelled'] as const) {
      expect(() => assertValidStatusTransition(terminal, 'available')).toThrow(
        BadRequestException,
      );
    }
  });

  it('rejects reserved -> anything but cancelled', () => {
    for (const next of [
      'draft',
      'available',
      'collected',
      'expired',
    ] as const) {
      expect(() => assertValidStatusTransition('reserved', next)).toThrow(
        BadRequestException,
      );
    }
  });
});

describe('assertListingIsEditable', () => {
  it('allows draft and available', () => {
    expect(() => assertListingIsEditable('draft')).not.toThrow();
    expect(() => assertListingIsEditable('available')).not.toThrow();
  });

  it('rejects reserved and every terminal status', () => {
    for (const locked of [
      'reserved',
      'collected',
      'expired',
      'cancelled',
    ] as const) {
      expect(() => assertListingIsEditable(locked)).toThrow(
        BadRequestException,
      );
    }
  });
});
