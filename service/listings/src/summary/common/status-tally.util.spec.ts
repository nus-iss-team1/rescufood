import { tallyByStatus } from './status-tally.util';

const statuses = ['draft', 'available', 'collected'] as const;

describe('tallyByStatus', () => {
  it('returns zero for every status when nothing was counted', () => {
    expect(tallyByStatus(statuses, [])).toEqual({
      draft: 0,
      available: 0,
      collected: 0,
      total: 0,
    });
  });

  it('fills statuses the query did not return with zero', () => {
    expect(
      tallyByStatus(statuses, [{ status: 'available', count: 3 }]),
    ).toEqual({ draft: 0, available: 3, collected: 0, total: 3 });
  });

  it('totals the counted statuses', () => {
    const tally = tallyByStatus(statuses, [
      { status: 'draft', count: 2 },
      { status: 'collected', count: 5 },
    ]);

    expect(tally).toEqual({ draft: 2, available: 0, collected: 5, total: 7 });
  });

  it('ignores a status outside the enum rather than inventing a key', () => {
    const tally = tallyByStatus(statuses, [
      { status: 'draft', count: 1 },
      { status: 'retired', count: 9 },
    ]);

    expect(tally).toEqual({ draft: 1, available: 0, collected: 0, total: 1 });
  });
});
