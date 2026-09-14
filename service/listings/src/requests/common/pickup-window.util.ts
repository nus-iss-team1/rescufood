const TZ = 'Asia/Singapore';

const DATE_FMT = new Intl.DateTimeFormat('en-SG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TZ,
});

const TIME_FMT = new Intl.DateTimeFormat('en-SG', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TZ,
});

const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TZ,
});

// "Wed, 30 Sept 2026, 3:00 pm" - weekday, date, and time in Singapore.
export function formatInstant(date: Date): string {
  return `${DATE_FMT.format(date)}, ${TIME_FMT.format(date)}`;
}

// "Wed, 30 Sept 2026, 3:00 pm – 7:00 pm" for a same-day window; both dates are
// shown when the window crosses midnight in Singapore. Undefined if either end
// is unset.
export function formatWindow(
  start: Date | null,
  end: Date | null,
): string | undefined {
  if (!start || !end) return undefined;
  const endText =
    DAY_KEY_FMT.format(start) === DAY_KEY_FMT.format(end)
      ? TIME_FMT.format(end)
      : formatInstant(end);
  return `${formatInstant(start)} – ${endText}`;
}
