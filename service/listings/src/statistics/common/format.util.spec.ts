import { formatAmount, formatDuration } from './format.util';

const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe('formatDuration', () => {
  it.each([
    [null, '--'],
    [Number.NaN, '--'],
    [-1, '--'],
    [0, '< 15 mins'],
    [15 * MIN - 1, '< 15 mins'],
    [15 * MIN, '15 mins'],
    [59 * MIN + 59_999, '59 mins'],
    [HR, '1 hr'],
    [HR + MIN, '1 hr 1 min'],
    [HR + 25 * MIN, '1 hr 25 mins'],
    [2 * HR, '2 hrs'],
    [23 * HR + 59 * MIN, '23 hrs 59 mins'],
    [DAY, '1 day'],
    [DAY + HR, '1 day 1 hr'],
    [2 * DAY + 3 * HR + 59 * MIN, '2 days 3 hrs'],
  ])('formats %p ms as %p', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('formatAmount', () => {
  it.each([
    [0, '0'],
    [44, '44'],
    [18.5, '18.5'],
    [25.75, '25.75'],
    [1250.5, '1,250.5'],
    [0.30000000000000004, '0.3'],
  ])('formats %p as %p', (amount, expected) => {
    expect(formatAmount(amount)).toBe(expected);
  });
});
