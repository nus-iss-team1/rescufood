import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StatsFiltersDto } from './stats-filters.dto';

async function errorsFor(query: object): Promise<string[]> {
  const dto = plainToInstance(StatsFiltersDto, query);
  const errors = await validate(dto);
  return errors.map((e) => e.property);
}

describe('StatsFiltersDto', () => {
  it('accepts no period at all', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it('accepts calendar dates on either or both ends', async () => {
    expect(await errorsFor({ from: '2026-03-01', to: '2026-03-31' })).toEqual(
      [],
    );
    expect(await errorsFor({ from: '2028-02-29' })).toEqual([]);
    expect(await errorsFor({ to: '2026-12-31' })).toEqual([]);
  });

  it.each([
    ['a timestamp', '2026-03-01T00:00:00Z'],
    ['an unpadded date', '2026-3-1'],
    ['a day the month does not have', '2026-02-30'],
    ['a month that does not exist', '2026-13-01'],
    ['free text', 'last week'],
  ])('rejects %s on either end', async (_label, value) => {
    expect(await errorsFor({ from: value })).toEqual(['from']);
    expect(await errorsFor({ to: value })).toEqual(['to']);
  });

  it('accepts a period that starts and ends on the same day', async () => {
    expect(await errorsFor({ from: '2026-03-01', to: '2026-03-01' })).toEqual(
      [],
    );
  });

  it('rejects a period that ends before it starts, naming both dates', async () => {
    const dto = plainToInstance(StatsFiltersDto, {
      from: '2026-03-31',
      to: '2026-03-01',
    });

    const errors = await validate(dto);

    expect(errors.map((e) => e.property)).toEqual(['to']);
    expect(Object.values(errors[0].constraints ?? {})).toEqual([
      'to (2026-03-01) must not be before from (2026-03-31)',
    ]);
  });

  it('compares across a year boundary', async () => {
    expect(await errorsFor({ from: '2026-12-31', to: '2027-01-01' })).toEqual(
      [],
    );
    expect(await errorsFor({ from: '2027-01-01', to: '2026-12-31' })).toEqual([
      'to',
    ]);
  });

  it('reports only the malformed date, not the order, when one end is invalid', async () => {
    expect(await errorsFor({ from: 'last week', to: '2026-03-01' })).toEqual([
      'from',
    ]);
  });
});
