// One row of a `group by status` count query.
export type StatusCount = { status: string; count: number };

// A count for every value of a status enum, plus their sum.
export type StatusTally<TStatus extends string> = Record<TStatus, number> & {
  total: number;
};

// Folds the rows a grouped count returned into a tally over `statuses`.
// Postgres omits groups with no rows, so the tally starts at zero for every
// status and only the statuses actually present are overlaid - a status with
// no records reads as 0 rather than being missing from the response.
export function tallyByStatus<TStatus extends string>(
  statuses: readonly TStatus[],
  rows: StatusCount[],
): StatusTally<TStatus> {
  const counts = Object.fromEntries(
    statuses.map((status) => [status, 0]),
  ) as Record<TStatus, number>;

  let total = 0;
  for (const row of rows) {
    if (!(row.status in counts)) continue;
    counts[row.status as TStatus] = row.count;
    total += row.count;
  }

  return { ...counts, total };
}
