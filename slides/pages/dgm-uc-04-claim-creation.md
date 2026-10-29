---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 04 of 07</div>

<div class="dgm-section-title">Claim <span class="accent">creation</span></div>

<div class="dgm-actors">Rescue partner</div>

<div class="dgm-cases">Claim a listing, including eligibility, reservation and idempotent retry</div>

<!--
USE CASE 04: CLAIM CREATION

Four figures follow: the analysis model and its sequence, which say what the
system must contain to support these use cases, then the design model and its
sequence, which say how it was built.
-->

---
class: flex flex-col dgm-page
---

# Claim creation: analysis model

<div class="dgm-sub">Reserving a listing: eligibility, concurrency and repeated requests.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 475" fill="none">
<UmlDefs p="a3" />
<UmlActor :x="48" :y="180" label="Rescue partner" />
<line x1="64" y1="172" x2="100" y2="160" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="120" :w="220" name="ListingDetailView" stereotype="boundary" :ops="['viewListing(id)', 'claim(listingId, qty)']" />
<line x1="320" y1="150" x2="370" y2="95" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="320" y1="175" x2="370" y2="250" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="370" :y="40" :w="255" name="ClaimEligibility" stereotype="control" :ops="['assertOrgApproved()', 'assertRescuePartner()', 'assertNotOwnDonor()', 'assertListingAvailable()']" :accent="true" />
<UmlClass :x="370" :y="210" :w="255" name="ClaimCreation" stereotype="control" :ops="['replayIfRetried(key)', 'reserveListing(id)', 'recordClaim()', 'completeIdempotency()']" :accent="true" />
<line x1="625" y1="110" x2="700" y2="230" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a3-open)" />
<line x1="625" y1="240" x2="700" y2="90" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a3-open)" />
<line x1="625" y1="260" x2="700" y2="260" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a3-open)" />
<line x1="625" y1="290" x2="700" y2="380" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a3-open)" />
<UmlClass :x="700" :y="25" :w="250" name="Claim" stereotype="entity" :attrs="['listing, claimingOrg', 'status, requestedQuantity', 'requestedAt']" :ops="['isActive()', 'canTransitionTo(s)']" />
<UmlClass :x="700" :y="195" :w="250" name="Listing" stereotype="entity" :attrs="['donorOrg, status', 'version']" :ops="['reserveIfAvailable()']" />
<UmlClass :x="700" :y="335" :w="250" name="IdempotencyRecord" stereotype="entity" :attrs="['rescueOrg, key', 'requestFingerprint', 'status, claimId']" :ops="['matchesFingerprint(fp)']" />
<line x1="760" y1="158" x2="760" y2="195" stroke="#8a8a8a" stroke-width="1.2" />
<text x="766" y="180" style="font-size:9px" fill="#5a5a5a">1 &nbsp; 0..* claims, at most one active</text>
<path d="M950 100 H962 V400 H950" stroke="#8a8a8a" stroke-width="1.2" fill="none" />
<text x="966" y="114" style="font-size:9px" fill="#5a5a5a">0..1</text>
<text x="966" y="392" style="font-size:9px" fill="#5a5a5a">1</text>
<UmlNote :x="990" :y="25" :w="195" title="invariant" :lines="['A listing may have many', 'claims over its lifetime but', 'at most one active claim at', 'any time. A partial unique', 'index enforces it.']" />
<UmlNote :x="990" :y="145" :w="195" title="idempotency" :lines="['A claim carries a key scoped', 'to the rescue organisation.', 'An identical retry replays', 'the original claim; a retry', 'mid-flight gets 409.']" />
<UmlNote :x="990" :y="265" :w="195" title="transaction" :lines="['Reserving the listing,', 'creating the claim, writing', 'the audit entry and', 'completing the idempotency', 'record all commit together.']" />
<UmlNote :x="990" :y="385" :w="195" title="after commit" :lines="['The notification is published', 'after the claim commits, not', 'inside the transaction.']" />
</svg>
</div>

<!--
FIGURE: CLAIM CREATION, ANALYSIS MODEL

Claiming is the principal case study of the design chapter, and it is split
here because creating a claim and ending one answer different questions.
Creation is about who may take the food and what happens when two partners
reach for it at the same moment. Ending it is about who may call it off and
what becomes of the listing afterwards.

Only one actor can create a claim. The Rescue Partner does it from the listing
detail screen, which is why discovery and claiming share a boundary: in
practice the claim is made from the screen the partner is already reading.

Eligibility is modelled as its own control class rather than folded into
creation, because the four checks it performs are genuinely independent of the
reservation mechanics. The organisation must be approved, it must be a rescue
partner rather than a donor, it must not be claiming its own listing, and the
listing must still be available. Separating them keeps the reservation logic
free of policy, and keeps the policy testable without a database.

Three entities carry the state. Listing owns reserveIfAvailable rather than
exposing a status setter, because reserving is conditional by nature: it either
succeeds against an available listing or it does nothing. Modelling it as a
behaviour rather than an assignment is what makes the invariant expressible.

IdempotencyRecord is an entity, not a technical detail. It has its own
lifecycle, it is scoped to the rescue organisation rather than to a user, and
it carries a fingerprint of the claim-defining fields so that a key reused with
different content is a conflict rather than a replay. Giving it
matchesFingerprint as a behaviour is what lets that distinction live in the
model rather than in a comparison buried in the service.

The four notes are the trade-offs the report records. Double allocation is
prevented by a conditional update rather than locks or a queue, so connections
are not exhausted under load. A retry arriving mid-flight is rejected rather
than held open. The notification is published after commit rather than through
an outbox.
-->

---
class: flex flex-col dgm-page
---

# Claim creation: analysis sequence

<div class="dgm-sub">Claiming a listing: replay a retry, check eligibility, then reserve.</div>

<div class="dgm-figure">
<img src="/sequences/04-claim-creation-analysis.png" alt="analysis sequence diagram" />
</div>

<!--
FIGURE: CLAIM CREATION, ANALYSIS SEQUENCE

The analysis sequence traces claiming a listing. ClaimCreation first asks
whether this idempotency key has been seen before; a repeated request
receives its original claim, or a conflict if the key was reused for
different content. A new request passes the eligibility checks and then asks
the Listing to reserve itself. Only one competing partner can succeed; the
other is told the listing has already been claimed. The successful path
creates the Claim and completes the idempotency record.
-->

---
class: flex flex-col dgm-page
---

# Claim creation: design model

<div class="dgm-sub">Three complementary controls, implemented in RequestsService.create.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 505" fill="none">
<UmlDefs p="d3" />
<UmlClass :x="40" :y="40" :w="250" name="RequestsController" stereotype="controller" :ops="['@Post create(dto, key)', '@Get findAll()']" :accent="true" />
<UmlClass :x="40" :y="180" :w="250" name="RequestsService" stereotype="service" :ops="['create(dto, user, key)', 'replayIdempotent(rec)']" :accent="true" />
<UmlClass :x="40" :y="330" :w="250" name="NotificationsPublisher" stereotype="publisher" :ops="['claimCreated(to, payload)']" />
<UmlComponent :x="40" :y="440" :w="250" :h="52" name="notifications queue" stereotype="AWS SQS" :muted="true" />
<line x1="165" y1="120" x2="165" y2="180" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<text x="172" y="156" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="165" y1="260" x2="165" y2="330" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<line x1="165" y1="395" x2="165" y2="440" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d3-arr)" />
<text x="172" y="428" style="font-size:8.5px" fill="#5a5a5a">after commit</text>
<UmlClass :x="370" :y="30" :w="265" name="IdempotencyRepository" stereotype="repository" :ops="['claimSlot(org, key, fp)', 'find(org, key)', 'complete(id, claimId)', 'release(id)', 'deleteExpired(now)']" />
<UmlClass :x="370" :y="200" :w="265" name="RequestsRepository" stereotype="repository" :ops="['reserveListingForClaim(id)', 'create(values)']" />
<UmlClass :x="370" :y="320" :w="265" name="request-fingerprint.util" stereotype="domain rule" :ops="['fingerprint(dto)']" />
<UmlClass :x="370" :y="420" :w="265" name="audit.service" stereotype="service" :ops="['record(actor, action, entity)']" />
<line x1="290" y1="195" x2="370" y2="110" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<line x1="290" y1="225" x2="370" y2="235" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<line x1="290" y1="250" x2="370" y2="345" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<line x1="290" y1="258" x2="370" y2="445" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d3-open)" />
<UmlClass :x="690" :y="40" :w="250" name="request_idempotency_keys" stereotype="table" :attrs="['rescue_org_id, idempotency_key', 'request_fingerprint', 'status, claim_id, expires_at']" />
<UmlClass :x="690" :y="200" :w="250" name="requests" stereotype="table" :attrs="['listing_id, rescue_org_id', 'status, requested_quantity', 'unique index on (listing_id)', 'where status = active']" />
<line x1="635" y1="90" x2="690" y2="85" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d3-open)" />
<line x1="635" y1="240" x2="690" y2="245" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d3-open)" />
<UmlNote :x="965" :y="30" :w="220" title="three complementary controls" :lines="['One: an idempotency key scoped', 'to the rescue organisation.', 'Two: a conditional reservation', 'that updates the listing only', 'while it is still available.', 'Three: a partial unique index', 'on active claims per listing.']" />
<UmlNote :x="965" :y="185" :w="220" title="the losing request" :lines="['A competing claim validates,', 'then fails the conditional', 'update and returns 409. No', 'locks and no queue, so', 'connections are not', 'exhausted under load.']" />
<UmlNote :x="965" :y="330" :w="220" title="a retry mid-flight" :lines="['A retry that arrives while', 'the original is still pending', 'is rejected with 409 rather', 'than held open. A fifteen', 'minute TTL reclaims keys', 'abandoned by a crashed', 'client.']" />
</svg>
</div>

<!--
FIGURE: CLAIM CREATION, DESIGN MODEL

This is the implementation of the analysis model opposite, and it shows why
reliable behaviour here depends on three distinct mechanisms rather than one
validation check.

RequestsService.create is the method the report walks through. It first looks
for an existing idempotency record, before validating listing availability. The
order matters: checking the record first is what allows an identical retry to
retrieve its original claim even after the listing is no longer available,
which would otherwise fail validation and return the wrong answer to a client
that had already succeeded.

For a new request the service acquires an idempotency slot through claimSlot,
then does the real work inside one database transaction. That transaction
reserves the listing, creates the claim, records the audit event and marks the
idempotency record completed.

reserveListingForClaim is the conditional update that prevents double
allocation. It updates the listing only while it is still available and has not
been deleted, so when two partners claim the same food at the same moment one
update matches and the other matches no rows and returns 409. This was chosen
over row locks or a queue precisely because it does not hold a database
connection while it waits.

The partial unique index on the requests table is the third control. It permits
many claims per listing over time but at most one with status active, so even a
path that bypassed the service could not create a second live claim.

The request fingerprint is what separates a genuine retry from a key reused for
different content. The same key with a different fingerprint is a conflict, not
a replay.

The publisher sits outside the transaction. The claim is committed first and
the notification published afterwards.
-->

---
class: flex flex-col dgm-page
---

# Claim creation: design sequence

<div class="dgm-sub">RequestsService.create in the order the code runs.</div>

<div class="dgm-figure">
<img src="/sequences/04-claim-creation-design.png" alt="design sequence diagram" />
</div>

<!--
FIGURE: CLAIM CREATION, DESIGN SEQUENCE

The design sequence follows RequestsService.create in the order the code
runs. It fingerprints the request and looks up the idempotency key before
reading the listing. It then checks that the listing is available and its
pickup window open (400 otherwise), and that the caller belongs to an
active, approved rescue partner (403 otherwise). claimSlot reserves the key,
and one transaction reserves the listing, creates the claim, records the
audit event and completes the idempotency record. claimCreated is published
after the commit; if the transaction fails, the slot is released so the
client can retry.
-->
