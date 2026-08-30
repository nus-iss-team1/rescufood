const WINDOW_FORMAT = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Singapore',
});

// "5 Sep 2026, 3:00 pm – 5 Sep 2026, 7:00 pm", or undefined if either end is unset.
export function formatWindow(
  start: Date | null,
  end: Date | null,
): string | undefined {
  if (!start || !end) return undefined;
  return `${WINDOW_FORMAT.format(start)} – ${WINDOW_FORMAT.format(end)}`;
}
