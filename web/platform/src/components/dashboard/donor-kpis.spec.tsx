import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrgSummary, RescuedMetrics } from "@rescufood/listings-sdk";
import { DonorKpis } from "./donor-kpis";

function summary(listings: Record<string, number>): OrgSummary {
  return {
    orgId: "org-1",
    listings: { total: 0, ...listings },
    claims: { total: 0 },
    asOf: "2025-06-15T00:00:00.000Z",
  };
}

function metrics(
  rescuedByUnit: RescuedMetrics["rescuedByUnit"],
): RescuedMetrics {
  return {
    orgId: "org-1",
    rescuedByUnit,
    lotsCollected: 3,
    claimsCompleted: 3,
    avgTimeToClaimMs: null,
    medianTimeToClaimMs: null,
    formattedAvgTimeToClaim: "--",
    formattedMedianTimeToClaim: "--",
    timeToClaimCount: 0,
    asOf: "2025-06-15T00:00:00.000Z",
  };
}

/** The tile whose label matches, as its link. */
function tile(label: string) {
  return screen.getByRole("link", { name: new RegExp(label) });
}

describe("DonorKpis", () => {
  it("shows the four lifecycle counts a donor acts on", () => {
    render(
      <DonorKpis
        summary={summary({ available: 12, reserved: 3, collected: 8 })}
        metrics={null}
      />,
    );

    expect(tile("Available now")).toHaveTextContent("12");
    expect(tile("Awaiting pickup")).toHaveTextContent("3");
    expect(tile("Collected")).toHaveTextContent("8");
  });

  it("links each count to its filtered listing view", () => {
    render(<DonorKpis summary={summary({ available: 1 })} metrics={null} />);

    expect(tile("Available now")).toHaveAttribute(
      "href",
      "/listings?status=available",
    );
    expect(tile("Awaiting pickup")).toHaveAttribute(
      "href",
      "/listings?status=reserved",
    );
    expect(tile("Rescued")).toHaveAttribute("href", "/reports");
  });

  it("falls back to zero when a count is absent", () => {
    render(<DonorKpis summary={summary({})} metrics={null} />);

    expect(tile("Available now")).toHaveTextContent("0");
  });

  it("renders zero rescued when no metrics loaded", () => {
    render(<DonorKpis summary={null} metrics={null} />);

    expect(tile("Rescued")).toHaveTextContent("0");
  });

  it("shows the primary rescued unit with its amount", () => {
    render(
      <DonorKpis
        summary={summary({})}
        metrics={metrics([
          { unit: "kg", amount: 420, formattedAmount: "420", lots: 9 },
        ])}
      />,
    );

    const rescued = tile("Rescued");
    expect(rescued).toHaveTextContent("420");
    expect(rescued).toHaveTextContent("kg");
  });

  it("counts the remaining units rather than summing across them", () => {
    render(
      <DonorKpis
        summary={summary({})}
        metrics={metrics([
          { unit: "kg", amount: 420, formattedAmount: "420", lots: 9 },
          { unit: "trays", amount: 12, formattedAmount: "12", lots: 2 },
          { unit: "boxes", amount: 5, formattedAmount: "5", lots: 1 },
        ])}
      />,
    );

    const rescued = tile("Rescued");
    expect(rescued).toHaveTextContent("420");
    expect(rescued).toHaveTextContent("+ 2 more units");
    expect(rescued).not.toHaveTextContent("437");
  });
});
