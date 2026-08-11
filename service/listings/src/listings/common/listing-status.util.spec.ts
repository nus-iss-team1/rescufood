import { BadRequestException } from '@nestjs/common';
import { assertValidStatusTransition } from './listing-status.util';

describe('assertValidStatusTransition', () => {
  it('allows publishing a draft', () => {
    expect(() =>
      assertValidStatusTransition('draft', 'available'),
    ).not.toThrow();
  });

  it('allows cancelling from draft or available', () => {
    expect(() =>
      assertValidStatusTransition('draft', 'cancelled'),
    ).not.toThrow();
    expect(() =>
      assertValidStatusTransition('available', 'cancelled'),
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
    for (const terminal of [
      'reserved',
      'collected',
      'expired',
      'cancelled',
    ] as const) {
      expect(() => assertValidStatusTransition(terminal, 'available')).toThrow(
        BadRequestException,
      );
    }
  });
});
