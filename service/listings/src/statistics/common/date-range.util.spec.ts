import { toDateRange } from './date-range.util';

describe('toDateRange', () => {
  it('starts at Singapore midnight on `from` and ends at Singapore midnight after `to`', () => {
    expect(toDateRange('2026-03-01', '2026-03-31')).toEqual({
      start: new Date('2026-02-28T16:00:00.000Z'),
      end: new Date('2026-03-31T16:00:00.000Z'),
    });
  });

  it('covers the whole of a single day when `from` and `to` are equal', () => {
    const { start, end } = toDateRange('2026-10-06', '2026-10-06');

    expect(end!.getTime() - start!.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('rolls the end over a month and year boundary', () => {
    expect(toDateRange(undefined, '2026-12-31').end).toEqual(
      new Date('2026-12-31T16:00:00.000Z'),
    );
  });

  it('leaves a missing side unbounded', () => {
    expect(toDateRange('2026-03-01', undefined)).toEqual({
      start: new Date('2026-02-28T16:00:00.000Z'),
      end: undefined,
    });
    expect(toDateRange()).toEqual({ start: undefined, end: undefined });
  });
});
