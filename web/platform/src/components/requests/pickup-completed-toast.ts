import { toast } from "@rescufood/ui/components/sonner";

// Shares one id per request, so a repeat call updates the toast instead of stacking a second.
export function toastPickupCompleted(requestId: string) {
  toast.success("Pickup completed", {
    id: `pickup-completed-${requestId}`,
    description: "The lot has been marked as collected.",
  });
}
