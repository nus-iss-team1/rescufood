import { BadRequestException } from '@nestjs/common';
import { assertValidRequestStatusTransition } from './request-status.util';

describe('assertValidRequestStatusTransition', () => {
  it.each([
    ['pending', 'accepted'],
    ['pending', 'declined'],
    ['pending', 'cancelled'],
    ['accepted', 'cancelled'],
  ] as const)('allows %s -> %s', (current, next) => {
    expect(() =>
      assertValidRequestStatusTransition(current, next),
    ).not.toThrow();
  });

  it.each([
    ['pending', 'pending'],
    ['pending', 'completed'],
    ['pending', 'expired'],
    ['accepted', 'accepted'],
    ['accepted', 'accepted'],
    ['accepted', 'declined'],
    ['accepted', 'completed'],
    ['declined', 'accepted'],
    ['declined', 'cancelled'],
    ['cancelled', 'pending'],
    ['completed', 'cancelled'],
    ['no_show', 'cancelled'],
    ['expired', 'cancelled'],
  ] as const)('rejects %s -> %s', (current, next) => {
    expect(() => assertValidRequestStatusTransition(current, next)).toThrow(
      BadRequestException,
    );
  });
});
