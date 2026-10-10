// Singapore has no daylight saving, so every calendar day there is 24 hours.
const SGT_OFFSET = '+08:00';
const DAY_MS = 24 * 60 * 60 * 1000;

// Half-open instant range: start inclusive, end exclusive; a missing side is unbounded.
export type DateRange = { start?: Date; end?: Date };

// Maps inclusive YYYY-MM-DD Singapore days onto [start of `from`, start of the day after `to`).
export function toDateRange(from?: string, to?: string): DateRange {
  return {
    start: from ? sgtMidnight(from) : undefined,
    end: to ? new Date(sgtMidnight(to).getTime() + DAY_MS) : undefined,
  };
}

function sgtMidnight(date: string): Date {
  return new Date(`${date}T00:00:00${SGT_OFFSET}`);
}
