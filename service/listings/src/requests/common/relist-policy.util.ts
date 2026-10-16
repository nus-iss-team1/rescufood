export const DEFAULT_CLAIM_CANCEL_CUTOFF_HOURS = 3;
export const DEFAULT_RELIST_MIN_PICKUP_HOURS = 3;

export const relistBlockedReasons = [
  'past_cutoff',
  'insufficient_pickup_time',
] as const;
export type RelistBlockedReason = (typeof relistBlockedReasons)[number];

export interface RelistPolicy {
  // Latest a claim can be cancelled before the window opens and still relist.
  cutoffMs: number;
  // Least pickup time that must remain before the window closes to relist.
  minPickupMs: number;
}

// Why a listing whose claim was cancelled at `now` must not go back to available; null if it may.
export function relistBlockedReason(
  window: { pickupWindowStart: Date | null; pickupWindowEnd: Date | null },
  now: Date,
  policy: RelistPolicy,
): RelistBlockedReason | null {
  const start = window.pickupWindowStart?.getTime();
  const end = window.pickupWindowEnd?.getTime();

  if (start === undefined || end === undefined) {
    return 'past_cutoff';
  }

  // Multi-day windows: if at least a full day (24 hours) remains before the
  // window closes, partners can still collect on following days.
  const hasSubsequentDaysRemaining = end - now.getTime() >= 24 * 60 * 60 * 1000;
  if (!hasSubsequentDaysRemaining && now.getTime() > start - policy.cutoffMs) {
    return 'past_cutoff';
  }

  // Not enough pickup time remains before the window closes.
  if (end - now.getTime() < policy.minPickupMs) {
    return 'insufficient_pickup_time';
  }

  return null;
}
