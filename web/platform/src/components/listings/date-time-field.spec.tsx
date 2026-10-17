import { render, screen } from "@testing-library/react";
import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { DateTimeField } from "./date-time-field";

function hiddenInput(container: HTMLElement, name: string) {
  return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
}

describe("DateTimeField", () => {
  it("submits the local value as a UTC instant", () => {
    const { container } = render(
      <DateTimeField
        id="useBy"
        name="useBy"
        label="Use by"
        value="2026-10-06T00:32:00"
      />,
    );

    expect(hiddenInput(container, "useBy").value).toBe(
      dayjs("2026-10-06T00:32:00").toISOString(),
    );
    expect(screen.getByRole("button", { name: "Use by" })).toHaveTextContent(
      "6 Oct 2026",
    );
  });

  it("shows a placeholder and submits nothing while no date is set", () => {
    const { container } = render(
      <DateTimeField id="useBy" name="useBy" label="Use by" value="" />,
    );

    expect(screen.getByRole("button", { name: "Use by" })).toHaveTextContent(
      "Pick a date",
    );
    expect(hiddenInput(container, "useBy").value).toBe("");
  });

  it("follows the controlled value", () => {
    const { container, rerender } = render(
      <DateTimeField
        id="useBy"
        name="useBy"
        label="Use by"
        value="2026-10-06T00:32:00"
      />,
    );

    rerender(
      <DateTimeField
        id="useBy"
        name="useBy"
        label="Use by"
        value="2026-12-24T18:05:00"
      />,
    );

    expect(hiddenInput(container, "useBy").value).toBe(
      dayjs("2026-12-24T18:05:00").toISOString(),
    );
  });
});
