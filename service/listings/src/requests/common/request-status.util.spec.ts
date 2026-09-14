import { BadRequestException } from '@nestjs/common';
import { assertValidRequestStatusTransition } from './request-status.util';

describe('assertValidRequestStatusTransition', () => {
  it.each([
    ['active', 'cancelled'],
    ['active', 'no_show'],
  ] as const)('allows %s -> %s', (current, next) => {
    expect(() =>
      assertValidRequestStatusTransition(current, next),
    ).not.toThrow();
  });

  it.each([
    ['active', 'active'],
    ['active', 'completed'],
    ['active', 'expired'],
    ['cancelled', 'no_show'],
    ['completed', 'cancelled'],
    ['no_show', 'cancelled'],
    ['expired', 'cancelled'],
  ] as const)('rejects %s -> %s', (current, next) => {
    expect(() => assertValidRequestStatusTransition(current, next)).toThrow(
      BadRequestException,
    );
  });
});
