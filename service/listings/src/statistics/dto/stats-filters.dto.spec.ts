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
});
