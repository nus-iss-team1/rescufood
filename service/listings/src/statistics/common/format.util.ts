const MINUTE_MS = 60_000;

// "< 15 mins", "42 mins", "1 hr 25 mins" or "2 days 3 hrs"; "--" when there is no value.
export function formatDuration(ms: number | null): string {
  if (ms === null || Number.isNaN(ms) || ms < 0) return '--';

  const minutes = Math.floor(ms / MINUTE_MS);
  if (minutes < 15) return '< 15 mins';
  if (minutes < 60) return `${minutes} mins`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return compound(hours, 'hr', minutes % 60, 'min');

  return compound(Math.floor(hours / 24), 'day', hours % 24, 'hr');
}

// Grouped thousands and at most two decimals, e.g. "1,250.5".
export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

function compound(
  major: number,
  majorUnit: string,
  minor: number,
  minorUnit: string,
): string {
  const head = plural(major, majorUnit);
  return minor === 0 ? head : `${head} ${plural(minor, minorUnit)}`;
}
