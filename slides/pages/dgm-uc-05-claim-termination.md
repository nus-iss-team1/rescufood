---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 05 of 07</div>

<div class="dgm-section-title">Claim <span class="accent">termination</span></div>

<div class="dgm-actors">Rescue partner &middot; Food donor &middot; the system</div>

<div class="dgm-cases">Cancel a claim &middot; Report a no-show &middot; Expire an overdue claim &middot; Expire an overdue listing</div>

<!--
USE CASE 05: CLAIM TERMINATION

Four figures follow: the analysis model and its sequence, which say what the
system must contain to support these use cases, then the design model and its
sequence, which say how it was built.
-->

---
class: flex flex-col dgm-page
---

# Claim termination: analysis model

<div class="dgm-sub">How a claim ends, who may end it, and what happens to the listing afterwards.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 490" fill="none">
<UmlDefs p="a6" />
<UmlActor :x="48" :y="110" label="Rescue partner" />
<UmlActor :x="48" :y="330" label="Food donor" />
<line x1="64" y1="100" x2="100" y2="100" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="322" x2="100" y2="330" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="60" :w="225" name="ClaimView" stereotype="boundary" :ops="['cancelClaim(reason)', 'reportNoShow(reason)']" />
<UmlClass :x="100" :y="290" :w="225" name="DonorClaimView" stereotype="boundary" :ops="['cancelClaim(reason)', 'reportNoShow(reason)']" />
<line x1="325" y1="100" x2="380" y2="150" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="325" y1="330" x2="380" y2="195" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="380" :y="120" :w="255" name="ClaimTermination" stereotype="control" :ops="['assertParty(user)', 'assertOutcomeAllowed()', 'applyOutcome(status, reason)']" :accent="true" />
<UmlClass :x="380" :y="260" :w="255" name="ListingReinstatement" stereotype="control" :ops="['reopenIfRelistable()', 'expireIfTooLate()']" :accent="true" />
<UmlClass :x="380" :y="390" :w="255" name="ScheduledSweeps" stereotype="control · scheduled" :ops="['expireOverdueClaims()', 'expireOverdueListings()']" :accent="true" />
<line x1="507" y1="215" x2="507" y2="260" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#a6-arr)" />
<text x="514" y="245" style="font-size:8.5px" fill="#5a5a5a">then</text>
<line x1="635" y1="150" x2="700" y2="110" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a6-open)" />
<line x1="635" y1="275" x2="700" y2="170" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a6-open)" />
<line x1="635" y1="300" x2="700" y2="300" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a6-open)" />
<line x1="635" y1="405" x2="700" y2="190" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a6-open)" />
<line x1="635" y1="430" x2="700" y2="350" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a6-open)" />
<UmlClass :x="700" :y="30" :w="250" name="Claim" stereotype="entity" :attrs="['status', 'cancelledBy, cancelledAt', 'noShowBy, noShowAt']" :ops="['cancel(by, reason)', 'reportNoShow(by)', 'expire()', 'isPartyTo(user)']" />
<UmlClass :x="700" :y="240" :w="250" name="Listing" stereotype="entity" :attrs="['status', 'pickupWindow']" :ops="['reopen()', 'expire()']" />
<line x1="760" y1="193" x2="760" y2="240" stroke="#8a8a8a" stroke-width="1.2" />
<text x="766" y="220" style="font-size:9px" fill="#5a5a5a">0..* &nbsp; 1</text>
<UmlNote :x="985" :y="25" :w="200" title="terminal states" :lines="['A claim is Active, then one', 'of four permanent outcomes:', 'Completed, Cancelled,', 'No-show or Expired. None of', 'them can be left.']" />
<UmlNote :x="985" :y="145" :w="200" title="relist policy" :lines="['A claim cancelled early', 'returns the listing to', 'Available so it can be', 'claimed again. Cancelled too', 'late and the listing expires.']" />
<UmlNote :x="985" :y="265" :w="200" title="no-show window" :lines="['A no-show may only be', 'reported once the pickup', 'window has opened, and by', 'either party.']" />
<UmlNote :x="985" :y="370" :w="200" title="no user involved" :lines="['Scheduled sweeps close', 'claims and listings whose', 'window has passed, so an', 'abandoned claim still ends.']" />
</svg>
</div>

<!--
FIGURE: CLAIM TERMINATION, ANALYSIS MODEL

Creating a claim has one actor. Ending one has three, and that is the reason
this half of the workflow is modelled separately.

A claim begins Active and concludes in one of four permanent terminal states.
It becomes Completed if the donor verifies the pickup code, Cancelled if either
party calls it off, No-show if either party reports a missed pickup after the
window opens, or Expired if the window closes without anyone acting. None of
the four can be left, which is why Claim carries explicit cancel, reportNoShow
and expire operations rather than a single status setter: each terminal state
records different evidence, including who ended it and why.

Both parties can cancel and both can report a no-show, so the two boundaries
offer the same operations to different actors. What keeps that safe is
isPartyTo on the Claim itself. The entity knows the claiming organisation and,
through its listing, the donor organisation, so it is the object that can
decide whether a given caller is entitled to act on it. Putting that decision
anywhere else would mean repeating it on every route that ends a claim.

ListingReinstatement is a second control class because ending a claim is only
half of the outcome. The listing that was reserved has to go somewhere. If the
claim failed or was cancelled early the listing returns to Available and can be
claimed again, which is the point of the whole platform: food that was promised
and released should still be rescuable. If it was cancelled too late for anyone
else to collect it, the listing expires instead. Separating this from
ClaimTermination keeps the relist decision in one place, where it can be stated
as a rule about time rather than scattered through the cancellation paths.

The third actor is the system itself. Scheduled sweeps close claims and
listings whose pickup window has passed, which is what guarantees that a claim
abandoned by both parties still reaches a terminal state rather than sitting
Active forever and holding food hostage.
-->

---
class: flex flex-col dgm-page
---

# Claim termination: analysis sequence

<div class="dgm-sub">Cancelling a claim: party check, then the listing is reopened or expired.</div>

<div class="dgm-figure">
<img src="/sequences/05-claim-termination-analysis.png" alt="analysis sequence diagram" />
</div>

<!--
FIGURE: CLAIM TERMINATION, ANALYSIS SEQUENCE

The analysis sequence traces a Rescue Partner cancelling a claim.
ClaimTermination checks that the caller is a party to the claim and that the
claim can still be cancelled. ListingReinstatement then settles the listing:
it is reopened if there is still time for someone else to rescue the food,
and expired if not. Finally the Claim records who cancelled it and why.
-->

---
class: flex flex-col dgm-page
---

# Claim termination: design model

<div class="dgm-sub">One decide method for three outcomes, plus the sweeps that need no user at all.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 510" fill="none">
<UmlDefs p="d6" />
<UmlClass :x="40" :y="30" :w="255" name="RequestsController" stereotype="controller" :ops="['@Patch decide(id, dto)', '@Get findOne(id)']" :accent="true" />
<UmlClass :x="40" :y="170" :w="255" name="RequestsService" stereotype="service" :ops="['decide(id, dto, user)', 'getOrThrow(id)']" :accent="true" />
<UmlClass :x="40" :y="320" :w="255" name="NotificationsPublisher" stereotype="publisher" :ops="['claimCancelled(to, payload)', 'listingExpired(to, payload)']" />
<UmlComponent :x="40" :y="440" :w="255" :h="52" name="notifications queue" stereotype="AWS SQS" :muted="true" />
<line x1="167" y1="110" x2="167" y2="170" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<text x="174" y="148" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="167" y1="250" x2="167" y2="320" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<line x1="167" y1="400" x2="167" y2="440" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d6-arr)" />
<text x="174" y="428" style="font-size:8.5px" fill="#5a5a5a">after commit</text>
<UmlClass :x="370" :y="25" :w="270" name="request-access / status.util" stereotype="domain rule" :ops="['assertParty(user, claim)', 'canTransition(from, to)', 'mayReportNoShow(now)']" />
<UmlClass :x="370" :y="150" :w="270" name="relist-policy.util" stereotype="domain rule" :ops="['shouldReopen(listing, now)', 'shouldExpire(listing, now)']" />
<UmlClass :x="370" :y="260" :w="270" name="RequestsRepository" stereotype="repository" :ops="['updateStatus(id, status)', 'reopenListingAfterClaim()', 'expireListingAfterClaim()', 'cancelActiveClaim(id)']" />
<UmlClass :x="370" :y="400" :w="270" name="listing-expiry · pickup-reminder" stereotype="scheduled" :ops="['expireOverdueListings()', 'markDuePickupReminders()', 'queuePickupReminders()']" />
<line x1="295" y1="185" x2="370" y2="90" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<line x1="295" y1="205" x2="370" y2="185" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<line x1="295" y1="230" x2="370" y2="300" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<line x1="505" y1="400" x2="505" y2="370" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d6-open)" />
<UmlClass :x="690" :y="150" :w="250" name="requests" stereotype="table" :attrs="['status, cancelled_at', 'cancellation_reason', 'cancelled_by, no_show_by', 'no_show_at']" />
<UmlClass :x="690" :y="300" :w="250" name="listings" stereotype="table" :attrs="['status, version', 'published_at']" />
<line x1="640" y1="290" x2="690" y2="230" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d6-open)" />
<line x1="640" y1="330" x2="690" y2="335" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d6-open)" />
<UmlNote :x="965" :y="30" :w="220" title="who may act" :lines="['assertParty resolves the', 'caller against both the', 'claiming organisation and the', 'donor organisation, so a', 'third party gets 403.']" />
<UmlNote :x="965" :y="150" :w="220" title="relist policy" :lines="['Whether a released listing', 'returns to Available or', 'expires is one injected', 'policy function, so the', 'cut-off can be changed', 'without touching the service.']" />
<UmlNote :x="965" :y="285" :w="220" title="terminal states" :lines="['canTransition refuses every', 'move out of Completed,', 'Cancelled, No-show and', 'Expired, so a terminal claim', 'cannot be revived.']" />
<UmlNote :x="965" :y="405" :w="220" title="sweeps" :lines="['The scheduled services run', 'on a timer with no user and', 'no token, closing whatever', 'the window has passed.']" />
</svg>
</div>

<!--
FIGURE: CLAIM TERMINATION, DESIGN MODEL

One service method carries three of the four outcomes. RequestsService.decide
takes the requested outcome in its DTO, which is why cancelling and reporting a
no-show are the same route rather than two. The branching that matters is not
which verb was used but whether this caller is a party to this claim and
whether the transition is legal from the current status, and both of those
questions are answered by pure functions before anything is written.

assertParty is the enforcement of the analysis model's isPartyTo. It resolves
the caller's organisation against both the claiming organisation and the donor
organisation on the listing, so either side passes and anyone else gets a 403
rather than a confusing 404. mayReportNoShow adds the time condition: the
pickup window must have opened, so a no-show cannot be reported pre-emptively.

relist-policy.util is a small Strategy. Whether a released listing returns to
Available or expires instead is a decision about how late is too late, and it
is an injected policy function rather than an inline comparison. That is what
lets the cut-off be changed, and tested, without touching the service.

The repository carries the two paired operations that matter:
reopenListingAfterClaim and expireListingAfterClaim. Ending the claim and
settling the listing happen together, so the two records cannot disagree about
whether the food is available.

The scheduled services at the bottom are the part with no user in the picture
at all. They run on a timer, find listings and claims whose window has passed,
and close them. They hold no token and pass no caller, which is why the
authorisation checks live in the service's decide path rather than in the
repository: the sweeps legitimately bypass them.

As everywhere else in the service, notifications are published after the
transaction has committed.
-->

---
class: flex flex-col dgm-page
---

# Claim termination: design sequence

<div class="dgm-sub">RequestsService.decide for a cancellation.</div>

<div class="dgm-figure">
<img src="/sequences/05-claim-termination-design.png" alt="design sequence diagram" />
</div>

<!--
FIGURE: CLAIM TERMINATION, DESIGN SEQUENCE

The design sequence follows RequestsService.decide for a cancellation. It
loads the claim and its listing, checks that the transition from active to
cancelled is valid and that the caller is a party, and asks
relistBlockedReason whether it is too late to relist. One transaction then
expires or reopens the listing, updates the claim only if it is still active
(409 otherwise), and records the audit events. claimEnded is published after
the commit, and the response tells the caller whether the listing was
relisted.
-->
