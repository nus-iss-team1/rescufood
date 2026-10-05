import { describe, expect, it } from "vitest";
import {
  isActiveRequest,
  longDateTime,
  pickupWindow,
  quantity,
  shortDate,
} from "./listing-labels";

describe("isActiveRequest", () => {
  it("is true only for the active status", () => {
    expect(isActiveRequest("active")).toBe(true);
  });

  it("is false for every terminal status", () => {
    expect(isActiveRequest("cancelled")).toBe(false);
    expect(isActiveRequest("completed")).toBe(false);
    expect(isActiveRequest("no_show")).toBe(false);
    expect(isActiveRequest("expired")).toBe(false);
  });
});

describe("quantity", () => {
  it("trims trailing zeros after the decimal point", () => {
    expect(quantity("5.00", "kg")).toBe("5 kg");
  });

  it("trims trailing zeros but keeps significant decimals", () => {
    expect(quantity("5.50", "kg")).toBe("5.5 kg");
  });

  it("leaves whole numbers without a decimal point untouched", () => {
    expect(quantity("12", "loaves")).toBe("12 loaves");
  });
});

describe("pickupWindow", () => {
  it("omits the repeated date when the window is same-day", () => {
    expect(
      pickupWindow("2025-06-15T05:30:00.000Z", "2025-06-15T10:00:00.000Z"),
    ).toBe("15 Jun, 1:30 pm – 6:00 pm");
  });

  it("includes both dates when the window spans multiple days", () => {
    expect(
      pickupWindow("2025-06-15T05:30:00.000Z", "2025-06-16T10:00:00.000Z"),
    ).toBe("15 Jun, 1:30 pm – 16 Jun, 6:00 pm");
  });
});

describe("shortDate", () => {
  it("formats without a year", () => {
    expect(shortDate("2025-06-15T05:30:00.000Z")).toBe("15 Jun, 1:30 pm");
  });
});

describe("longDateTime", () => {
  it("formats with a year", () => {
    expect(longDateTime("2025-06-15T05:30:00.000Z")).toBe(
      "15 Jun 2025, 1:30 pm",
    );
  });
});
