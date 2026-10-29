---
class: dgm-centre
---

<div class="dgm-eyebrow">Use case 03 of 07</div>

<div class="dgm-section-title">Listing <span class="accent">and discovery</span></div>

<div class="dgm-actors">Food donor &middot; Rescue partner</div>

<div class="dgm-cases">Create a listing &middot; Publish a listing &middot; Edit a listing &middot; Cancel a listing &middot; Delete a draft &middot; Browse listings &middot; View listing detail</div>

<!--
USE CASE 03: LISTING AND DISCOVERY

Two figures follow: the analysis model, which says what the system must
contain to support these use cases, and the design model, which says how it
was built.
-->

---
class: flex flex-col dgm-page
---

# Listing and discovery: analysis model

<div class="dgm-sub">Publishing a food listing, and finding one.</div>

<div class="dgm-figure">
<svg viewBox="0 0 1200 500" fill="none">
<UmlDefs p="a7" />
<UmlActor :x="48" :y="150" label="Food donor" />
<UmlActor :x="48" :y="400" label="Rescue partner" />
<line x1="64" y1="140" x2="100" y2="122" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="64" y1="392" x2="100" y2="370" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="100" :y="60" :w="210" name="ListingEditorView" stereotype="boundary" :ops="['saveDraft(details)', 'publish()', 'edit()', 'cancel(reason)', 'deleteDraft()']" />
<UmlClass :x="100" :y="330" :w="210" name="ListingBrowserView" stereotype="boundary" :ops="['browse(filters)', 'viewListing(id)']" />
<line x1="310" y1="122" x2="380" y2="110" stroke="#8a8a8a" stroke-width="1.2" />
<line x1="310" y1="370" x2="380" y2="370" stroke="#8a8a8a" stroke-width="1.2" />
<UmlClass :x="380" :y="60" :w="250" name="ListingPublication" stereotype="control" :ops="['checkOwnership(user)', 'validateForPublication()', 'applyTransition(next)']" :accent="true" />
<UmlClass :x="380" :y="330" :w="250" name="ListingDiscovery" stereotype="control" :ops="['listAvailable(filters)', 'resolveImageUrls()']" :accent="true" />
<line x1="630" y1="100" x2="700" y2="110" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a7-open)" />
<line x1="630" y1="130" x2="700" y2="280" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a7-open)" />
<line x1="630" y1="355" x2="700" y2="160" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a7-open)" />
<line x1="630" y1="380" x2="700" y2="290" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#a7-open)" />
<UmlClass :x="700" :y="30" :w="240" name="Listing" stereotype="entity" :attrs="['category, description', 'quantity, unit, allergens', 'useBy, pickupWindow', 'pickupLocation', 'status, version']" :ops="['isCompleteForPublish()', 'canTransitionTo(status)', 'canStillBeEdited()']" />
<UmlClass :x="700" :y="240" :w="240" name="ListingImage" stereotype="entity" :attrs="['objectKey', 'contentType', 'position']" />
<UmlClass :x="700" :y="380" :w="240" name="Organisation" stereotype="entity" :attrs="['name', 'type: donor', 'status']" />
<line x1="760" y1="208" x2="760" y2="240" stroke="#8a8a8a" stroke-width="1.2" />
<text x="766" y="222" style="font-size:9px" fill="#5a5a5a">1 &nbsp; 0..*</text>
<path d="M940 420 H965 V120 H940" stroke="#8a8a8a" stroke-width="1.2" fill="none" />
<text x="952" y="412" style="font-size:9px" fill="#5a5a5a">1</text>
<text x="952" y="136" style="font-size:9px" fill="#5a5a5a">0..*</text>
<text transform="rotate(-90 959 270)" x="959" y="270" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">posts</text>
<UmlNote :x="995" :y="30" :w="190" title="lifecycle" :lines="['Draft to Published to', 'Claimed to Completed.', 'Publishing can be undone', 'while unclaimed. Completed,', 'Expired and Cancelled are', 'permanent.']" />
<UmlNote :x="995" :y="180" :w="190" title="validation" :lines="['A draft becomes available', 'only when category,', 'description, quantity, unit,', 'allergens, use-by, location', 'and pickup window are all', 'present.']" />
<UmlNote :x="995" :y="330" :w="190" title="concurrency" :lines="['Every edit carries the row', 'version. A stale write is', 'rejected with 409 Conflict', 'rather than overwriting.', 'Deleting a draft is a soft', 'delete.']" />
</svg>
</div>

<!--
FIGURE: LISTING AND DISCOVERY ANALYSIS MODEL

This use case is a relatively bounded example of requirements decomposition,
which is why it is worth modelling before the harder ones. The Donor manages
the whole listing lifecycle through drafts, publishing, editing, cancellation
and draft-only deletion. The Rescue Partner's side is read-only discovery.

The model separates the two concerns into different boundaries and different
control classes, because they have different rules. Publication must check
ownership, completeness and the legality of the state transition; discovery
must filter to what is actually available and resolve image URLs.

Listing is the entity that carries the decisions. It knows the donor, the
contents, the use-by date, the pickup window and its own status, and it decides
whether it is complete enough to publish, whether it may still be edited, and
which transitions are legal. Allocating those decisions to Listing rather than
to the control class is what allows the same rule to be reached from the
publish route, the edit route and a scheduled expiry job without being written
three times.

Two constraints shaped the design. The first is that a listing is only
partially populated while it is a draft, so the completeness check belongs at
the publish transition rather than at every save. The second is concurrency:
the listing carries a version, every update is conditional on that version, and
a stale edit is rejected with 409 Conflict instead of silently overwriting a
change made in another tab or by a colleague.

ListingImage is modelled separately from Listing because images are uploaded
independently of the listing body, and because the stored object key is not the
URL that is eventually served to a browser.
-->

---
class: flex flex-col dgm-page
---

# Listing and discovery: design model

<div class="dgm-sub">The listings service classes behind the publish and browse routes.</div>

<div class="dgm-figure">
<svg viewBox="-27 0 1254 570" fill="none">
<UmlDefs p="d7" />
<UmlClass :x="30" :y="40" :w="235" name="ListingsApi" stereotype="interface" :ops="['createDraft(input)', 'publish(id, version)', 'listListings(filters)', 'getListing(id)']" />
<UmlClass :x="30" :y="200" :w="235" name="auth guards" stereotype="guard" :ops="['JwtAuthGuard', 'ActiveOrgMemberGuard', 'OrgMembershipGuard', 'AdminGuard']" />
<UmlClass :x="310" :y="30" :w="250" name="ListingsController" stereotype="controller" :ops="['@Post create()', '@Get findAll()', '@Get(:id) findOne()', '@Patch update()', '@Delete remove()']" :accent="true" />
<UmlClass :x="310" :y="210" :w="250" name="ListingsService" stereotype="service" :ops="['create(input, user)', 'update(id, dto, user)', 'remove(id, user)', 'findAll(query, user)', 'findOne(id, user)']" :accent="true" />
<UmlClass :x="310" :y="380" :w="250" name="publication-validation.util" stereotype="domain rule" :ops="['validateForPublication(l)']" />
<UmlClass :x="310" :y="470" :w="250" name="listing-status / access.util" stereotype="domain rule" :ops="['canTransition(from, to)', 'assertDonorOwnsListing()']" />
<UmlClass :x="640" :y="210" :w="255" name="ListingsRepository" stereotype="repository" :ops="['create(values)', 'findById(id)', 'findMany(filter)', 'updateWithVersion(id, v, p)', 'delete(id)']" />
<UmlClass :x="640" :y="380" :w="255" name="ListingImagesRepository" stereotype="repository" :ops="['insert(listingId, key)', 'findFirstImageKeys(ids)']" />
<UmlClass :x="640" :y="40" :w="255" name="ListingImageUploadService" stereotype="service" :ops="['createUploadUrl(listingId)', 'confirmUpload(key)']" />
<UmlClass :x="935" :y="40" :w="235" name="S3Service" stereotype="gateway" :ops="['presignPut(key)', 'presignGet(key)']" />
<UmlClass :x="935" :y="230" :w="235" name="listings" stereotype="table" :attrs="['id, donor_org_id, created_by', 'status, version', 'published_at, deleted_at']" />
<line x1="265" y1="95" x2="310" y2="80" stroke="#1f6b45" stroke-width="1.3" marker-end="url(#d7-arr)" />
<text x="262" y="72" style="font-size:8.5px" fill="#5a5a5a">HTTPS</text>
<line x1="310" y1="130" x2="265" y2="240" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<text x="294" y="202" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="435" y1="155" x2="435" y2="210" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<line x1="435" y1="335" x2="435" y2="380" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<path d="M310 300 H285 V510 H310" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" fill="none" marker-end="url(#d7-open)" />
<line x1="560" y1="270" x2="640" y2="270" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<text x="600" y="263" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">«use»</text>
<line x1="560" y1="220" x2="640" y2="110" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<line x1="895" y1="80" x2="935" y2="80" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#d7-open)" />
<line x1="895" y1="270" x2="935" y2="275" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#d7-open)" />
<path d="M895 110 H912 V420 H895" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="5 4" fill="none" marker-end="url(#d7-open)" />
<UmlNote :x="935" :y="380" :w="235" title="optimistic locking" :lines="['updateWithVersion updates the', 'row only while the version', 'still matches, so a stale', 'edit returns 409 instead of', 'overwriting a concurrent', 'change.']" />
</svg>
</div>

<!--
FIGURE: LISTING AND DISCOVERY DESIGN MODEL

The design model shows the same use case in the listings service, and it is
where the three structural patterns of the backend become visible.

ListingsApi is an interface, not a class. The SDK defines it once and ships two
implementations, a real HTTP client and an in-memory mock that mirrors the
server's rules including its status transitions. That is a Strategy, and it is
what let the whole frontend be built and demonstrated before the listings
service was ready; switching between them is one flag.

ListingsController carries the five routes and no rules. The guards sit beside
it rather than inside it: the JWT guard validates the Cognito token, and the
organisation membership and admin guards decide whether this caller may act for
this organisation. Keeping them as decorators means a new route inherits the
same checks by declaration rather than by remembering to call them.

ListingsService holds the workflow and calls into two pure-function modules for
the rules. validateForPublication is the gate that stops an incomplete draft
from becoming available, and the status and access utilities decide whether a
transition is legal and whether this donor owns this listing. Because these are
pure functions they are unit tested without a database, and because the rule
lives in one place the same check also backs the database CHECK constraint.

ListingsRepository is the only class that issues SQL, which is the Repository
pattern. The method worth naming is updateWithVersion: it updates the row only
while the version still matches, so two editors cannot overwrite each other and
the loser gets a 409 rather than silent data loss.

The image path is deliberately separate. ListingImageUploadService hands the
browser a presigned S3 URL so that image bytes never pass through the service
at all, and only the resulting object key is recorded.
-->
