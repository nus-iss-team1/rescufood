"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { Calendar, MapPin, Package, AlertTriangle, ShieldCheck } from "lucide-react";

import { type Listing, type ListingRequest } from "@rescufood/listings-sdk";
import {
  categoryLabels,
  requestStatusLabels,
  requestStatusVariant,
  isActiveRequest,
  quantity,
  pickupWindow,
  shortDate,
} from "@/lib/listing-labels";
import {
  acceptRequestAction,
  declineRequestAction,
  cancelRequestAction,
} from "@/app/requests/actions";

import { Button } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { Badge } from "@rescufood/ui/components/badge";
import { AnimateIn } from "@/components/animate-in";
import { Textarea } from "@rescufood/ui/components/textarea";
import { Label } from "@rescufood/ui/components/label";

function SubmitButton({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "destructive" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? "Please wait..." : children}
    </Button>
  );
}

export function RequestDetailView({
  request,
  listing,
  isDonor,
  competingClaimsCount,
}: {
  request: ListingRequest;
  listing: Listing;
  isDonor: boolean;
  competingClaimsCount: number;
}) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState("");
  const [customDeclineReason, setCustomDeclineReason] = useState("");
  
  const [acceptState, acceptFormAction] = useActionState(acceptRequestAction, {});
  const [declineState, declineFormAction] = useActionState(declineRequestAction, {});

  const finalDeclineReason = selectedDeclineReason === "Other" 
    ? customDeclineReason 
    : selectedDeclineReason;

  const handleDeclineSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!finalDeclineReason.trim()) {
      e.preventDefault();
      alert("Please provide a reason for declining.");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <AnimateIn>
          <Card>
            <CardHeader>
              <CardTitle>Surplus Food Lot Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {listing.images.length > 0 && (
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={listing.images[0].url}
                    alt="Listing image"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {listing.category ? categoryLabels[listing.category] : "Uncategorized"}
                    </Badge>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {listing.description || "No description provided."}
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-0.5 opacity-80">Full Lot</div>
                    <div className="text-xl font-bold">
                      {listing.remainingQuantity && listing.unit 
                        ? quantity(listing.remainingQuantity, listing.unit) 
                        : "Unknown quantity"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 pt-4 border-t">
                {listing.allergens.length > 0 && (
                  <div className="flex gap-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5" />
                    <div>
                      <span className="font-semibold text-destructive">Allergens:</span>{" "}
                      <span className="text-foreground">{listing.allergens.join(", ")}</span>
                    </div>
                  </div>
                )}
                
                {listing.handlingInstructions && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Package className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Handling:</span>{" "}
                      {listing.handlingInstructions}
                    </div>
                  </div>
                )}
                
                {listing.pickupWindowStart && listing.pickupWindowEnd && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Pickup Window:</span>{" "}
                      {pickupWindow(listing.pickupWindowStart, listing.pickupWindowEnd)}
                    </div>
                  </div>
                )}
                
                {listing.pickupLocation && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">Location:</span>{" "}
                      {listing.pickupLocation}
                    </div>
                  </div>
                )}
                
                {listing.useBy && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
                    <div>
                      <span className="font-medium text-foreground">Use By:</span>{" "}
                      {shortDate(listing.useBy)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimateIn>
      </div>

      <div className="space-y-6">
        <AnimateIn>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl">Request Status</CardTitle>
                <Badge variant={requestStatusVariant[request.status]}>
                  {requestStatusLabels[request.status]}
                </Badge>
              </div>
              <CardDescription>
                Claimed on {shortDate(request.requestedAt)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {request.status === "accepted" && (
                <div className="rounded-md bg-success/15 p-4 text-sm text-success-foreground">
                  <p className="font-medium">This request is accepted.</p>
                  <p className="mt-1">
                    {isDonor
                      ? "You have reserved this lot for the rescue partner. They will arrive to collect it."
                      : "Your request was approved. Please prepare for collection according to the pickup window."}
                  </p>
                </div>
              )}
              {request.status === "declined" && (
                <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
                  <p className="font-medium">This request was declined.</p>
                  <p className="mt-1">Reason: {request.declineReason}</p>
                </div>
              )}
              {request.status === "cancelled" && (
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  <p className="font-medium">This request was cancelled.</p>
                  {request.cancellationReason && (
                    <p className="mt-1">Reason: {request.cancellationReason}</p>
                  )}
                </div>
              )}
            </CardContent>
            {isActiveRequest(request.status) && (!isDonor || request.status === "accepted") && (
              <CardFooter className="border-t pt-4">
                <form action={cancelRequestAction} className="w-full">
                  <input type="hidden" name="requestId" value={request.id} />
                  <SubmitButton variant="outline" className="w-full">
                    Cancel Request
                  </SubmitButton>
                </form>
              </CardFooter>
            )}
          </Card>
        </AnimateIn>

        {isDonor && request.status === "pending" && (
          <AnimateIn>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Review Claim
                </CardTitle>
                <CardDescription>
                  This rescue partner has requested the full lot.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-background/50 border p-4 text-sm text-muted-foreground flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-warning" />
                  <p>
                    Accepting this claim will immediately transition the listing to RESERVED and automatically supersede any other pending claims for this lot.
                  </p>
                </div>
                {competingClaimsCount > 0 && (
                  <p className="text-sm font-medium">
                    Note: There {competingClaimsCount === 1 ? "is" : "are"} {competingClaimsCount} other pending claim{competingClaimsCount === 1 ? "" : "s"} for this lot.
                  </p>
                )}
                
                {acceptState.error && (
                  <p className="text-sm text-destructive">{acceptState.error}</p>
                )}
                {declineState.error && (
                  <p className="text-sm text-destructive">{declineState.error}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-stretch gap-3">
                {!declineOpen ? (
                  <div className="flex gap-3">
                    <form action={acceptFormAction} className="flex-1">
                      <input type="hidden" name="requestId" value={request.id} />
                      <SubmitButton className="w-full">Accept Request</SubmitButton>
                    </form>
                    <Button variant="outline" onClick={() => setDeclineOpen(true)} className="flex-1">
                      Decline
                    </Button>
                  </div>
                ) : (
                  <form action={declineFormAction} onSubmit={handleDeclineSubmit} className="space-y-4 w-full rounded-md border p-4 bg-background">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="declineReason" value={finalDeclineReason} />
                    
                    <h4 className="font-medium text-sm">Provide a decline reason</h4>
                    
                    <div className="space-y-2">
                      {[
                        "Food already allocated",
                        "Cannot accommodate pickup window",
                        "Food damaged / quality issue",
                        "Logistical constraint",
                        "Other"
                      ].map((reason) => (
                        <div key={reason} className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`reason-${reason}`}
                            name="reason-radio"
                            value={reason}
                            checked={selectedDeclineReason === reason}
                            onChange={(e) => setSelectedDeclineReason(e.target.value)}
                            className="size-4"
                          />
                          <Label htmlFor={`reason-${reason}`} className="text-sm font-normal cursor-pointer">
                            {reason}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {selectedDeclineReason === "Other" && (
                      <div className="mt-3">
                        <Label htmlFor="custom-reason" className="sr-only">Custom Reason</Label>
                        <Textarea
                          id="custom-reason"
                          placeholder="Please explain why..."
                          value={customDeclineReason}
                          onChange={(e) => setCustomDeclineReason(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => setDeclineOpen(false)}>
                        Cancel
                      </Button>
                      <SubmitButton variant="destructive" className="flex-1">
                        Confirm Decline
                      </SubmitButton>
                    </div>
                  </form>
                )}
              </CardFooter>
            </Card>
          </AnimateIn>
        )}
      </div>
    </div>
  );
}
