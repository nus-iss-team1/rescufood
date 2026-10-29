---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 06 of 07</div>

<div class="dgm-section-title">Collection <span class="accent">and handover</span></div>

<div class="dgm-actors">Rescue partner &middot; Food donor</div>

<div class="dgm-cases">Generate pickup code &middot; Look up claim by code &middot; Verify the pickup code &middot; Report a no-show</div>

<!--
USE CASE 06: COLLECTION AND HANDOVER

Four figures follow: the analysis model and its sequence, which say what the
system must contain to support these use cases, then the design model and its
sequence, which say how it was built.
-->

---
class: flex flex-col dgm-page
---

# Collection and handover: analysis model

<div class="dgm-sub">Generating a pickup code, verifying it in person, and what happens when it fails.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 520" fill="none">
<UmlDefs p="a4" />
<UmlActor :x="48" :y="120" label="Rescue partner" />
<UmlActor :x="48" :y="400" label="Food donor" />
<line x1="64" y1="108" x2="100" y2="90" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="392" x2="100" y2="378" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="50" :w="210" name="PickupCodeView" stereotype="boundary" :ops="['generateCode()', 'showCode()']" />
<UmlClass :x="100" :y="330" :w="210" name="VerifyPickupView" stereotype="boundary" :ops="['lookupByCode(code)', 'verifyCode(claimId, code)', 'reportNoShow(reason)']" />
<line x1="310" y1="90" x2="370" y2="88" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="310" y1="378" x2="370" y2="375" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="370" :y="40" :w="255" name="PickupCodeIssue" stereotype="control" :ops="['assertClaimant(user)', 'assertCooldownElapsed()', 'reuseOrMintCode()']" :accent="true" />
<UmlClass :x="370" :y="320" :w="255" name="PickupVerification" stereotype="control" :ops="['assertDonorOwnsListing()', 'compareConstantTime()', 'countFailedAttempt()', 'completeHandover()']" :accent="true" />
<line x1="625" y1="80" x2="690" y2="90" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a4-open)" />
<line x1="625" y1="110" x2="690" y2="270" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a4-open)" />
<line x1="625" y1="345" x2="690" y2="150" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a4-open)" />
<line x1="625" y1="375" x2="690" y2="300" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a4-open)" />
<line x1="625" y1="410" x2="690" y2="440" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a4-open)" />
<UmlClass :x="690" :y="30" :w="250" name="PickupCode" stereotype="entity" :attrs="['codeHash', 'expiresAt', 'attempts', 'generatedAt']" :ops="['matches(code)', 'isLive(now)', 'voidAfterThirdFailure()']" />
<UmlClass :x="690" :y="230" :w="250" name="Claim" stereotype="entity" :attrs="['listing, claimingOrg', 'status', 'collectedAt, collectedQty']" :ops="['complete(verifier)', 'reportNoShow(by)']" />
<UmlClass :x="690" :y="400" :w="250" name="Listing" stereotype="entity" :attrs="['donorOrg', 'status']" :ops="['markCollected()']" />
<line x1="750" y1="193" x2="750" y2="230" stroke="#8a8a8a" stroke-width="1.2" />
<text x="756" y="215" style="font-size:9px" fill="#5a5a5a">1 &nbsp; 0..1 live code</text>
<line x1="750" y1="363" x2="750" y2="400" stroke="#8a8a8a" stroke-width="1.2" />
<text x="756" y="385" style="font-size:9px" fill="#5a5a5a">0..* &nbsp; 1</text>
<UmlNote :x="980" :y="30" :w="205" title="why its own class" :lines="['PickupCode verifies a', 'presented code, counts', 'failed attempts and voids', 'itself after three. Keeping', 'it separate let that rule be', 'specified and tested apart', 'from the claim lifecycle.']" />
<UmlNote :x="980" :y="200" :w="205" title="the rules" :lines="['Six digits, one hour expiry,', 'three attempts, sixty second', 'cooldown before a', 'replacement may be minted.']" />
<UmlNote :x="980" :y="320" :w="205" title="verification" :lines="['The code is compared against', 'a stored hash in constant', 'time, so the time taken to', 'reject one reveals nothing.']" />
<UmlNote :x="980" :y="430" :w="205" title="handover" :lines="['One transaction marks the', 'claim completed and the', 'listing collected.']" />
</svg>
</div>

<!--
FIGURE: COLLECTION AND HANDOVER ANALYSIS MODEL

Handover extends the analysis from state transitions into credential
verification, which is why it is modelled separately from claiming.

The use cases divide by party. The Rescue Partner generates the six-digit
pickup code and shows it in person. The Donor looks a claim up by code, which
matters when several of their claims are active at once, and verifies it to
finalise the collection. Reporting a no-show is shared: once the pickup window
has opened, either party can report that the other did not appear.

The modelling decision worth defending is that PickupCode is its own class
rather than four attributes on Claim. It has behaviour of its own: it verifies
a presented code, counts failed attempts and voids itself after three. Keeping
it separate is what allowed that rule to be specified and tested independently
of the claim lifecycle, and it keeps Claim free of a concern that only applies
during a few minutes of its life.

The code is held as a hash, and verification compares in constant time, so a
timing difference cannot reveal how much of a presented code was correct. The
plaintext is retained only so the generating party can be shown their own code
again after a page reload, and it is never serialised to the other party.

The failure path was modelled explicitly rather than treated as an error case.
Each wrong code increments the attempt counter and returns an invalid-code
response. On the third failure the code is voided, and recovery moves to the
Rescue Partner, who must wait out a sixty second cooldown before a replacement
can be minted. That cooldown is what stops a voided code from being replaced
instantly in a loop.

Completion itself is a single transaction that marks the claim completed and
the listing collected, so the two can never disagree.
-->

---
class: flex flex-col dgm-page
---

# Collection and handover: analysis sequence

<div class="dgm-sub">Verifying a pickup code: three attempts, then the handover completes.</div>

<div class="dgm-figure">
<img src="/sequences/06-collection-and-handover-analysis.png" alt="analysis sequence diagram" />
</div>

<!--
FIGURE: COLLECTION AND HANDOVER, ANALYSIS SEQUENCE

The analysis sequence traces the donor verifying a pickup code.
PickupVerification confirms that the donor owns the listing, then asks the
PickupCode whether it is still live and whether the presented code matches.
A wrong or expired code counts as a failed attempt, and the third failure
voids the code. A matching code completes the handover: the Claim is
completed and the Listing marked collected.
-->

---
class: flex flex-col dgm-page
---

# Collection and handover: design model

<div class="dgm-sub">Pickup code generation, lookup and verification in the listings service.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 540" fill="none">
<UmlDefs p="d4" />
<UmlClass :x="40" :y="40" :w="255" name="RequestsController" stereotype="controller" :ops="['@Post :id/pickup-code', '@Post lookup-code', '@Post :id/verify', '@Patch :id (no-show)']" :accent="true" />
<UmlClass :x="40" :y="220" :w="290" name="RequestsService" stereotype="service" :ops="['generatePickupCode(id, user)', 'lookupByPickupCode(code, user)', 'verifyPickupCode(id, code, user)']" :accent="true" />
<UmlClass :x="40" :y="390" :w="290" name="NotificationsPublisher" stereotype="publisher" :ops="['pickupCompleted(to, payload)', 'pickupReminder(to, payload)']" />
<UmlClass :x="400" :y="30" :w="280" name="pickup-code.util" stereotype="domain rule" :attrs="['PICKUP_CODE_LENGTH = 6', 'PICKUP_CODE_TTL_MINUTES = 60', 'MAX_PICKUP_CODE_ATTEMPTS = 3', 'REGEN_COOLDOWN_SECONDS = 60']" :ops="['createPickupCode()', 'hashPickupCode(code)', 'pickupCodeMatches(code, hash)']" />
<UmlClass :x="400" :y="250" :w="280" name="RequestsRepository" stereotype="repository" :ops="['findActiveWithLiveCodeForDonor()', 'incrementPickupCodeAttempts(id)', 'markListingCollectedIfDone(id)', 'updateStatus(id, status)']" />
<UmlClass :x="730" :y="250" :w="255" name="requests" stereotype="table" :attrs="['pickup_code, pickup_code_hash', 'code_expires_at', 'pickup_code_attempts', 'verified_by, collected_at']" />
<line x1="167" y1="150" x2="167" y2="220" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d4-open)" />
<text x="174" y="190" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="330" y1="250" x2="400" y2="160" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d4-open)" />
<line x1="330" y1="285" x2="400" y2="295" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d4-open)" />
<line x1="185" y1="315" x2="185" y2="390" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d4-open)" />
<line x1="680" y1="300" x2="730" y2="300" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d4-open)" />
<line x1="730" y1="100" x2="690" y2="115" stroke="#8a8a8a" stroke-width="1.1" stroke-dasharray="3 3" />
<UmlNote :x="730" :y="30" :w="255" title="constant-time compare" :lines="['pickupCodeMatches compares', 'against the stored hash in', 'constant time, so the time', 'taken to reject a code does', 'not leak how much of it was', 'right.']" />
<UmlNote :x="730" :y="400" :w="255" title="failure path" :lines="['Each wrong code increments', 'the attempt counter and', 'returns 400. On the third', 'failure the code is voided', 'and the partner waits out the', 'cooldown before a new one.']" />
<UmlNote :x="1010" :y="140" :w="175" title="reuse before mint" :lines="['Generating a code returns', 'the existing one while it', 'is still live, and mints a', 'new one with a fresh', 'attempt counter otherwise.']" />
</svg>
</div>

<!--
FIGURE: COLLECTION AND HANDOVER DESIGN MODEL

Three routes carry this use case, and all three land on RequestsService, which
keeps the rules in one place rather than spreading them across the handlers.

generatePickupCode validates that the caller is the claiming party and that the
cooldown has elapsed, then either returns the existing code while it is still
live or mints a new one with a fresh attempt counter and a one hour expiry.
Reusing a live code is what makes the screen safe to reload: the partner sees
the same six digits rather than invalidating the code they have already shown.

lookupByPickupCode exists because a donor may have several active claims at the
same pickup window. findActiveWithLiveCodeForDonor resolves the presented code
to the one claim it belongs to, scoped to claims on that donor's own listings,
so a code cannot be used to discover someone else's claim.

verifyPickupCode is the security-sensitive path. It loads the claim and the
listing, verifies that the caller owns the listing, and compares the presented
code against the stored hash with a constant-time comparison. A single
transaction then marks the claim completed and the listing collected.

All of the constants and all of the comparison logic live in pickup-code.util
as pure functions, which is why the rules are visible as named constants rather
than as magic numbers scattered through the service. It also means the three
rules that matter, six digits, one hour, three attempts, are unit tested
directly.

The failure path is handled by incrementPickupCodeAttempts rather than by an
exception. The counter is persisted, so attempts cannot be reset by retrying
from a new session, and the third failure voids the code.

As everywhere else in the service, the notification is published after the
transaction has committed.
-->

---
class: flex flex-col dgm-page
---

# Collection and handover: design sequence

<div class="dgm-sub">RequestsService.verifyPickupCode: failed attempts persisted, success in one transaction.</div>

<div class="dgm-figure">
<img src="/sequences/06-collection-and-handover-design.png" alt="design sequence diagram" />
</div>

<!--
FIGURE: COLLECTION AND HANDOVER, DESIGN SEQUENCE

The design sequence follows RequestsService.verifyPickupCode. After loading
the claim and listing and checking that the caller is the donor, the service
compares the code with pickupCodeMatches, which treats an expired code as no
match. A failed attempt is persisted with incrementPickupCodeAttempts; on
the third, the code is cleared, a PickupCodeExhausted audit event is
recorded, and the caller receives 400. A matching code completes the claim,
marks the listing collected if nothing else is outstanding, and records the
audit events in one transaction. pickupCompleted is published after the
commit.
-->
