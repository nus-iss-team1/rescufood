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

/** The whole card carrying a label, found from the label itself. */
function card(label: string): HTMLElement {
  const el = screen.getByText(label).closest('[data-slot="card"]');
  if (!el) throw new Error(`no card for ${label}`);
  return el as HTMLElement;
}

function renderKpis(
  overrides: Partial<React.ComponentProps<typeof DonorKpis>> = {},
) {
  return render(
    <DonorKpis
      summary={summary({})}
      metrics={null}
      awaitingVerification={0}
      {...overrides}
    />,
  );
}

describe("DonorKpis", () => {
  it("shows the lifecycle counts a donor acts on", () => {
    renderKpis({
      summary: summary({ available: 12, reserved: 3, collected: 8 }),
    });

    expect(card("Available")).toHaveTextContent("12");
    expect(card("Awaiting pickup")).toHaveTextContent("3");
    expect(card("Collected")).toHaveTextContent("8");
  });

  it("links each count to its filtered listing view", () => {
    renderKpis({ summary: summary({ available: 1 }) });

    expect(
      screen.getByRole("link", { name: "View listings" }),
    ).toHaveAttribute("href", "/listings?status=available");
    expect(screen.getByRole("link", { name: "Claimed lots" })).toHaveAttribute(
      "href",
      "/listings?status=reserved",
    );
    expect(
      screen.getByRole("link", { name: "Completed pickups" }),
    ).toHaveAttribute("href", "/listings?status=collected");
    expect(screen.getByRole("link", { name: "Rescue impact" })).toHaveAttribute(
      "href",
      "/reports",
    );
  });

  it("falls back to zero when a count is absent", () => {
    renderKpis();

    expect(card("Available")).toHaveTextContent("0");
  });

  it("renders zero rescued when no metrics loaded", () => {
    renderKpis({ summary: null });

    expect(card("Rescued")).toHaveTextContent("0");
  });

  it("shows the primary rescued unit with its amount", () => {
    renderKpis({
      metrics: metrics([
        { unit: "kg", amount: 420, formattedAmount: "420", lots: 9 },
      ]),
    });

    const rescued = card("Rescued");
    expect(rescued).toHaveTextContent("420");
    expect(rescued).toHaveTextContent("kg");
  });

  it("counts the remaining units rather than summing across them", () => {
    renderKpis({
      metrics: metrics([
        { unit: "kg", amount: 420, formattedAmount: "420", lots: 9 },
        { unit: "trays", amount: 12, formattedAmount: "12", lots: 2 },
        { unit: "boxes", amount: 5, formattedAmount: "5", lots: 1 },
      ]),
    });

    const rescued = card("Rescued");
    expect(rescued).toHaveTextContent("420");
    expect(rescued).toHaveTextContent("+2 more units");
    // 420 + 12 + 5 would be meaningless across incompatible units.
    expect(rescued).not.toHaveTextContent("437");
  });

  it("badges the claims waiting on a pickup code", () => {
    renderKpis({ awaitingVerification: 2 });

    expect(card("Awaiting pickup")).toHaveTextContent("2 to verify");
  });

  it("drops the badge when nothing is waiting", () => {
    renderKpis({ awaitingVerification: 0 });

    expect(card("Awaiting pickup")).not.toHaveTextContent("to verify");
  });
});
