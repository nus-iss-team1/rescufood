import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatDuration", () => {
  it.each([null, undefined, Number.NaN, -1])(
    "shows a placeholder for %s",
    (ms) => {
      expect(formatDuration(ms)).toBe("--");
    },
  );

  it("collapses anything under 15 minutes", () => {
    expect(formatDuration(0)).toBe("< 15 mins");
    expect(formatDuration(15 * MIN - 1)).toBe("< 15 mins");
  });

  it("shows whole minutes from 15 up to an hour", () => {
    expect(formatDuration(15 * MIN)).toBe("15 mins");
    expect(formatDuration(59 * MIN + 59_000)).toBe("59 mins");
  });

  it("shows hours, adding minutes only when there are some", () => {
    expect(formatDuration(HOUR)).toBe("1 hr");
    expect(formatDuration(HOUR + MIN)).toBe("1 hr 1 min");
    expect(formatDuration(2 * HOUR + 25 * MIN)).toBe("2 hrs 25 mins");
  });

  it("shows days, adding hours only when there are some", () => {
    expect(formatDuration(DAY)).toBe("1 day");
    expect(formatDuration(DAY + HOUR)).toBe("1 day 1 hr");
    expect(formatDuration(2 * DAY + 3 * HOUR + 59 * MIN)).toBe("2 days 3 hrs");
  });
});
