const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// timeAgo renders an ISO timestamp as "2 days ago"-style text.
export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

// absolute renders an ISO timestamp in the viewer's locale and zone, for
// titles and detail views where "2 days ago" is too vague.
export function absolute(iso: string): string {
  return new Date(iso).toLocaleString();
}

// startOfDayIso and endOfDayIso turn a date input's "YYYY-MM-DD" into the
// inclusive bounds the audit api expects. Both ends are UTC, so a filter
// means the same thing wherever it is set from.
export function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}
