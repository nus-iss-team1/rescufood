/**
 * Formats elapsed duration milliseconds into human-readable representations:
 * - "< 15 mins" (if < 15 minutes)
 * - "42 mins" (if < 60 minutes)
 * - "1 hr 25 mins" (if >= 60 minutes)
 * - "2 days 3 hrs" (if >= 24 hours)
 * - "--" (if null/undefined/invalid)
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) {
    return "--";
  }

  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 15) {
    return "< 15 mins";
  }
  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    if (remMinutes === 0) {
      return `${hours} hr${hours === 1 ? "" : "s"}`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"} ${remMinutes} min${remMinutes === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (remHours === 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${days} day${days === 1 ? "" : "s"} ${remHours} hr${remHours === 1 ? "" : "s"}`;
}
