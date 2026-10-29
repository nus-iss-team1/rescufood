---
class: dgm-centre
---

<div class="dgm-eyebrow">Part one</div>

<div class="dgm-section-title">Architecture <span class="accent">design</span></div>

<div class="dgm-actors">Figures for section 3.2</div>

<div class="dgm-cases">The deployable components &middot; the four logical layers &middot; the packages
inside each service</div>

<!--
PART ONE: ARCHITECTURE DESIGN

Four figures that describe the system as a whole, before the use cases break
it down feature by feature.
-->

---
class: flex flex-col dgm-page
---

# Software architecture

<div class="dgm-sub">UML component view: the deployable components, the interfaces each one offers, and what it depends on.</div>

<div class="dgm-figure">
<svg viewBox="-84 0 1408 640" fill="none">
<UmlDefs p="cmp" />
<UmlPackage :x="60" :y="8" :w="790" :h="92" label="client layer" :dashed="true" />
<UmlComponent :x="82" :y="30" :w="370" :h="58" name="Platform web app" stereotype="Next.js 15" :lines="['used by donors and rescue partners']" />
<UmlComponent :x="472" :y="30" :w="358" :h="58" name="Admin console" stereotype="React + Vite" :lines="['platform administrators, runs locally']" />
<line x1="267" y1="88" x2="267" y2="122" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#cmp-open)" />
<text x="274" y="110" style="font-size:9px" fill="#5a5a5a">«use»</text>
<line x1="651" y1="88" x2="651" y2="122" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#cmp-open)" />
<text x="658" y="110" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlPackage :x="60" :y="122" :w="790" :h="84" label="shared SDK" :dashed="true" />
<UmlComponent :x="82" :y="142" :w="370" :h="52" name="@rescufood/listings-sdk" stereotype="library" />
<UmlComponent :x="472" :y="142" :w="358" :h="52" name="@rescufood/profile-sdk" stereotype="library" />
<line x1="460" y1="206" x2="460" y2="238" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#cmp-arr)" />
<text x="468" y="226" style="font-size:9px" fill="#5a5a5a">HTTPS / JSON</text>
<UmlComponent :x="120" :y="238" :w="680" :h="58" name="Amazon API Gateway" stereotype="gateway" :lines="['the only publicly addressable component · path-based routing · TLS terminates here']" :accent="true" />
<line x1="143" y1="296" x2="143" y2="307" stroke="#1f6b45" stroke-width="1.4" />
<path d="M130 320 A13 13 0 0 1 156 320" stroke="#1f6b45" stroke-width="1.4" fill="none" />
<circle cx="143" cy="320" r="7" fill="#ffffff" stroke="#1f6b45" stroke-width="1.4" />
<line x1="143" y1="327" x2="143" y2="364" stroke="#1f6b45" stroke-width="1.4" />
<text x="163" y="316" style="font-size:9.5px;font-weight:600" fill="#111111">«interface» ProfileAPI</text>
<text x="163" y="329" style="font-size:9px" fill="#5a5a5a">/api/profile</text>
<line x1="368" y1="296" x2="368" y2="307" stroke="#1f6b45" stroke-width="1.4" />
<path d="M355 320 A13 13 0 0 1 381 320" stroke="#1f6b45" stroke-width="1.4" fill="none" />
<circle cx="368" cy="320" r="7" fill="#ffffff" stroke="#1f6b45" stroke-width="1.4" />
<line x1="368" y1="327" x2="368" y2="364" stroke="#1f6b45" stroke-width="1.4" />
<text x="388" y="316" style="font-size:9.5px;font-weight:600" fill="#111111">«interface» ListingsAPI</text>
<text x="388" y="329" style="font-size:9px" fill="#5a5a5a">/api/listings · /api/requests</text>
<line x1="772" y1="296" x2="772" y2="307" stroke="#1f6b45" stroke-width="1.4" />
<path d="M759 320 A13 13 0 0 1 785 320" stroke="#1f6b45" stroke-width="1.4" fill="none" />
<circle cx="772" cy="320" r="7" fill="#ffffff" stroke="#1f6b45" stroke-width="1.4" />
<line x1="772" y1="327" x2="772" y2="364" stroke="#1f6b45" stroke-width="1.4" />
<text x="752" y="316" text-anchor="end" style="font-size:9.5px;font-weight:600" fill="#111111">«interface» NotificationsAPI</text>
<text x="752" y="329" text-anchor="end" style="font-size:9px" fill="#5a5a5a">/api/notifications</text>
<UmlPackage :x="20" :y="330" :w="865" :h="158" label="service layer" :dashed="true" />
<UmlComponent :x="40" :y="364" :w="205" :h="96" name="profile-service" stereotype="service" :lines="['Go · chi · pgx','users, organisations,','admin approval workflow']" />
<UmlComponent :x="265" :y="364" :w="205" :h="96" name="listings-service" stereotype="service" :lines="['NestJS · TypeScript','listings, claims,','pickup verification']" />
<UmlComponent :x="505" :y="372" :w="130" :h="80" name="events queue" stereotype="AWS SQS" :lines="['+ dead-letter queue']" :muted="true" />
<UmlComponent :x="670" :y="364" :w="205" :h="96" name="notifications-service" stereotype="service" :lines="['NestJS · queue consumer','email + in-app feed']" />
<line x1="470" y1="412" x2="505" y2="412" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#cmp-arr)" />
<text x="487" y="404" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">publish</text>
<line x1="635" y1="412" x2="670" y2="412" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#cmp-arr)" />
<text x="652" y="404" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">consume</text>
<path d="M143 460 V472 H570 V452" stroke="#1f6b45" stroke-width="1.4" fill="none" marker-end="url(#cmp-arr)" />
<text x="175" y="467" style="font-size:8.5px" fill="#5a5a5a">publish org_approved</text>
<line x1="300" y1="488" x2="300" y2="542" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#cmp-open)" />
<text x="307" y="518" style="font-size:9px" fill="#5a5a5a">owns tables</text>
<line x1="595" y1="488" x2="595" y2="542" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#cmp-open)" />
<text x="602" y="518" style="font-size:9px" fill="#5a5a5a">owns tables</text>
<UmlPackage :x="120" :y="516" :w="610" :h="108" label="data layer" :dashed="true" />
<UmlComponent :x="145" :y="542" :w="310" :h="68" name="PostgreSQL · rescufood" stereotype="database" :lines="['organisations, users, audit_log','listings, requests, idempotency keys']" />
<UmlComponent :x="480" :y="542" :w="230" :h="68" name="PostgreSQL · notifications" stereotype="database" :lines="['delivery records','in-app feed']" />
<UmlNote :x="760" :y="516" :w="340" title="schema ownership" :lines="['Each service defines and migrates only its own','tables. Profile and Listings share one database,','so a listing holds a real foreign key to the','organisation that posted it. Notifications keeps','its delivery records in a separate database.']" />
<UmlPackage :x="915" :y="60" :w="310" :h="180" label="AWS managed" :dashed="true" />
<UmlComponent :x="935" :y="92" :w="270" :h="54" name="Amazon Cognito" stereotype="identity provider" :lines="['user pool · JWT bearer tokens']" />
<UmlComponent :x="935" :y="164" :w="270" :h="54" name="S3 + CloudFront" stereotype="storage + CDN" :lines="['listing images, private bucket']" />
<UmlComponent :x="935" :y="404" :w="270" :h="54" name="Email provider" stereotype="external" :lines="['SMTP relay']" />
<line x1="875" y1="430" x2="935" y2="430" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#cmp-open)" />
<text x="905" y="422" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">send</text>
<path d="M885 350 H900 V119 H935" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" fill="none" marker-end="url(#cmp-open)" />
<text transform="rotate(-90 889 252)" x="889" y="252" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">every service validates the bearer token</text>
<path d="M850 55 H870 V191 H935" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" fill="none" marker-end="url(#cmp-open)" />
<text transform="rotate(-90 864 128)" x="864" y="128" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a">images via CDN</text>
</svg>
</div>

<!--
FIGURE: COMPONENT DIAGRAM

RescuFood is built as a set of independently deployable components rather than
a single application. The component diagram shows four tiers and the contracts
between them.

The client layer holds two web applications. The platform web app is used by
Food Donors and Rescue Partners; the admin console is a compact React
application reserved for platform administrators and is run locally rather than
hosted, because its only users are the project team (ADR-0001). Neither client
calls a service directly. Both depend on a shared typed SDK, which is the only
place that knows the shape of a backend request. This keeps frontend and
backend work independent: a contract change flows through the SDK instead of
through manual coordination.

Everything enters the system through a single API Gateway. It is the only
publicly addressable component, routes purely by path, and is where TLS
terminates. The three backend services sit in private subnets behind it and
each offers one provided interface, drawn as a ball on the component boundary:
ProfileAPI, ListingsAPI and NotificationsAPI. The gateway carries the matching
required interface, drawn as a socket. Because the dependency is expressed as
an interface rather than a host, the services were able to move from a public
load balancer in Sprint 2 to gateway plus VPC Link in Sprint 3 without any
change to the clients.

The service layer is partitioned by domain responsibility. Profile owns users,
organisations and the administrative approval workflow. Listings owns food
listings, claims and pickup verification, which is the core donation lifecycle.
Notifications delivers email and populates the in-app alert feed. Services do
not call each other synchronously for side effects. Profile and Listings
publish events onto an SQS queue and Notifications consumes them, so a slow
email can never block a claim; a dead-letter queue captures messages that
exhaust their delivery attempts.

The data layer is a deliberate trade-off. Profile and Listings share one
PostgreSQL database, which allows a listing or claim to hold a real foreign key
to the organisation and user it belongs to, and allows the Profile service to
write an account change and its audit entry in a single transaction. Ownership
is still enforced at the schema level: each service defines and migrates only
its own tables, Profile with golang-migrate and the two NestJS services with
Drizzle. Notifications keeps its delivery records in a separate database
because they never need to be joined with listings or claims. The cost of
sharing an instance is that the services are less independently deployable than
the diagram suggests, and the databases would be split if the system went
further.

Every request carries a Cognito bearer token which each service validates
independently, so authentication does not depend on the gateway alone.
-->

---
class: flex flex-col dgm-page
---

# Logical architecture

<div class="dgm-sub">The four layers of the system and the packages that sit in each one.</div>

<div class="dgm-figure">
<svg viewBox="-60 0 1320 600" fill="none">
<UmlDefs p="lay" />
<line x1="30" y1="40" x2="30" y2="556" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#lay-arr)" />
<text transform="rotate(-90 22 300)" x="22" y="300" text-anchor="middle" style="font-size:9.5px;font-weight:600" fill="#1f6b45">dependencies run downward only</text>
<UmlPackage :x="60" :y="20" :w="1110" :h="108" label="client layer" :dashed="true" />
<UmlComponent :x="84" :y="48" :w="250" :h="56" name="web/platform" stereotype="Next.js app" :lines="['app/ · components/ · hooks/ · lib/']" />
<UmlComponent :x="352" :y="48" :w="230" :h="56" name="web/admin-console" stereotype="React + Vite" :lines="['src/ · lib/']" />
<UmlComponent :x="600" :y="48" :w="180" :h="56" name="web/ui" stereotype="library" :lines="['shared components']" />
<UmlComponent :x="798" :y="48" :w="175" :h="56" name="sdk/listings" stereotype="library" :lines="['ListingsApi']" />
<UmlComponent :x="991" :y="48" :w="160" :h="56" name="sdk/profile" stereotype="library" :lines="['ProfileApi']" />
<line x1="615" y1="128" x2="615" y2="152" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#lay-arr)" />
<UmlPackage :x="60" :y="152" :w="1110" :h="88" label="edge layer" :dashed="true" />
<UmlComponent :x="160" :y="176" :w="400" :h="52" name="Amazon API Gateway" stereotype="gateway" :lines="['path-based routing · TLS · the only public component']" />
<UmlComponent :x="620" :y="176" :w="400" :h="52" name="CloudFront + S3" stereotype="content delivery" :lines="['listing images served from a private bucket']" />
<line x1="615" y1="240" x2="615" y2="264" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#lay-arr)" />
<UmlPackage :x="60" :y="264" :w="1110" :h="190" label="service layer" :dashed="true" />
<UmlPackage :x="84" :y="292" :w="330" :h="150" label="profile-service (Go)" />
<UmlChip :x="96" :y="320" :w="140" :h="26" label="internal/api" />
<UmlChip :x="246" :y="320" :w="156" :h="26" label="internal/domain" />
<UmlChip :x="96" :y="352" :w="140" :h="26" label="internal/store" />
<UmlChip :x="246" :y="352" :w="156" :h="26" label="internal/auth" />
<UmlChip :x="96" :y="384" :w="140" :h="26" label="internal/notify" />
<UmlChip :x="246" :y="384" :w="156" :h="26" label="cmd/server" />
<UmlChip :x="96" :y="412" :w="306" :h="22" label="db/migrations · golang-migrate" />
<UmlPackage :x="434" :y="292" :w="330" :h="150" label="listings-service (NestJS)" />
<UmlChip :x="446" :y="320" :w="148" :h="26" label="listings/" />
<UmlChip :x="604" :y="320" :w="148" :h="26" label="requests/" />
<UmlChip :x="446" :y="352" :w="148" :h="26" label="statistics/" />
<UmlChip :x="604" :y="352" :w="148" :h="26" label="audit/" />
<UmlChip :x="446" :y="384" :w="148" :h="26" label="auth/ · common/" />
<UmlChip :x="604" :y="384" :w="148" :h="26" label="storage/ · health/" />
<UmlChip :x="446" :y="412" :w="306" :h="22" label="db/ · migrations with Drizzle" />
<UmlPackage :x="784" :y="292" :w="330" :h="150" label="notifications-service (NestJS)" />
<UmlChip :x="796" :y="320" :w="148" :h="26" label="notifications/" />
<UmlChip :x="954" :y="320" :w="148" :h="26" label="sqs consumer" />
<UmlChip :x="796" :y="352" :w="148" :h="26" label="templates/" />
<UmlChip :x="954" :y="352" :w="148" :h="26" label="mailer/" />
<UmlChip :x="796" :y="384" :w="148" :h="26" label="auth/ · common/" />
<UmlChip :x="954" :y="384" :w="148" :h="26" label="health/" />
<UmlChip :x="796" :y="412" :w="306" :h="22" label="db/ · migrations with Drizzle" />
<line x1="615" y1="454" x2="615" y2="478" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#lay-arr)" />
<UmlPackage :x="60" :y="478" :w="1110" :h="100" label="data layer" :dashed="true" />
<UmlComponent :x="90" :y="502" :w="330" :h="58" name="PostgreSQL · rescufood" stereotype="database" :lines="['profile tables + listings tables']" />
<UmlComponent :x="440" :y="502" :w="280" :h="58" name="PostgreSQL · notifications" stereotype="database" :lines="['delivery records, in-app feed']" />
<UmlComponent :x="740" :y="502" :w="180" :h="58" name="Amazon SQS" stereotype="queue" :lines="['+ dead-letter queue']" />
<UmlComponent :x="940" :y="502" :w="200" :h="58" name="Amazon S3" stereotype="object store" :lines="['listing images']" />
</svg>
</div>

<!--
FIGURE: LOGICAL ARCHITECTURE

The system is structured across four logical layers, and the rule that holds
them together is that dependencies run downward only. No layer reaches back up.

The client layer contains two applications and three shared libraries. The
platform web app and the admin console both compose their screens from
web/ui and both talk to the backend only through the two SDK packages. Putting
the SDK in its own package is what makes the boundary real: the apps depend on
the ListingsApi and ProfileApi interfaces, not on HTTP.

The edge layer is the system's public surface. The API Gateway is the single
entry point for backend calls and routes by path alone, so adding a service is
a routing rule rather than a new public endpoint. CloudFront and S3 sit beside
it to deliver listing images, which keeps large static content off the service
path entirely.

The service layer holds the three services, each a package in its own right and
each internally layered the same way: an API or controller package at the edge,
a domain package holding the rules, and a store or repository package holding
the SQL. Cross-cutting packages (auth, common, health) are present in all three
because every service validates its own bearer token and exposes its own health
check. Each service also owns its migrations, which is what keeps schema
ownership aligned with code ownership even though two services share a database
instance.

The data layer holds the stateful resources. Two PostgreSQL databases, the SQS
queue that carries domain events between services, and the S3 bucket that holds
listing images.

Partitioning the codebase this way had a practical benefit beyond tidiness.
Because each service is a separate directory with its own pipeline, members
could work concurrently in different domains without merge conflicts in shared
application code, and a change to one service runs only that service's build.
-->

---
class: flex flex-col dgm-page
---

# Logical packages: listings-service

<div class="dgm-sub">Package diagram of the service that carries the core donation lifecycle.</div>

<div class="dgm-figure">
<svg viewBox="-115 0 1430 650" fill="none">
<UmlDefs p="pkg" />
<UmlPackage :x="70" :y="24" :w="560" :h="104" label="presentation" />
<UmlChip :x="86" :y="54" :w="255" :h="30" label="listings.controller.ts" />
<UmlChip :x="351" :y="54" :w="263" :h="30" label="requests.controller.ts" />
<UmlChip :x="86" :y="92" :w="255" :h="30" label="statistics.controller.ts" />
<UmlChip :x="351" :y="92" :w="263" :h="30" label="audit.controller.ts" />
<line x1="350" y1="128" x2="350" y2="152" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pkg-arr)" />
<text x="358" y="145" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlPackage :x="70" :y="152" :w="560" :h="142" label="application (services)" />
<UmlChip :x="86" :y="182" :w="255" :h="30" label="listings.service.ts" />
<UmlChip :x="351" :y="182" :w="263" :h="30" label="requests.service.ts" />
<UmlChip :x="86" :y="220" :w="255" :h="30" label="listing-expiry.service.ts" />
<UmlChip :x="351" :y="220" :w="263" :h="30" label="pickup-reminder.service.ts" />
<UmlChip :x="86" :y="258" :w="255" :h="30" label="listing-image-upload.service.ts" />
<UmlChip :x="351" :y="258" :w="263" :h="30" label="audit.service.ts" />
<line x1="350" y1="294" x2="350" y2="322" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pkg-arr)" />
<text x="358" y="313" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlPackage :x="70" :y="322" :w="560" :h="142" label="domain rules (pure functions)" />
<UmlChip :x="86" :y="352" :w="255" :h="30" label="publication-validation.util.ts" />
<UmlChip :x="351" :y="352" :w="263" :h="30" label="listing-status.util.ts" />
<UmlChip :x="86" :y="390" :w="255" :h="30" label="request-status.util.ts" />
<UmlChip :x="351" :y="390" :w="263" :h="30" label="request-access.util.ts" />
<UmlChip :x="86" :y="428" :w="255" :h="30" label="pickup-code.util.ts" />
<UmlChip :x="351" :y="428" :w="263" :h="30" label="request-fingerprint.util.ts" />
<path d="M70 240 H40 V540 H70" stroke="#1f6b45" stroke-width="1.4" fill="none" marker-end="url(#pkg-arr)" />
<text transform="rotate(-90 33 390)" x="33" y="390" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlPackage :x="70" :y="492" :w="560" :h="142" label="persistence (repositories)" />
<UmlChip :x="86" :y="522" :w="255" :h="30" label="listings.repository.ts" />
<UmlChip :x="351" :y="522" :w="263" :h="30" label="requests.repository.ts" />
<UmlChip :x="86" :y="560" :w="255" :h="30" label="idempotency.repository.ts" />
<UmlChip :x="351" :y="560" :w="263" :h="30" label="listing-images.repository.ts" />
<UmlChip :x="86" :y="598" :w="255" :h="30" label="audit.repository.ts" />
<UmlChip :x="351" :y="598" :w="263" :h="30" label="db/schema.ts (Drizzle)" />
<UmlPackage :x="690" :y="24" :w="460" :h="104" label="cross-cutting" />
<UmlChip :x="706" :y="54" :w="205" :h="30" label="auth/ guards" />
<UmlChip :x="925" :y="54" :w="209" :h="30" label="common/request-logging" />
<UmlChip :x="706" :y="92" :w="205" :h="30" label="health/" />
<UmlChip :x="925" :y="92" :w="209" :h="30" label="dto/ validation" />
<line x1="630" y1="76" x2="690" y2="76" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pkg-arr)" />
<text x="660" y="68" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlPackage :x="690" :y="200" :w="460" :h="104" label="integration" />
<UmlChip :x="706" :y="236" :w="205" :h="34" label="notifications.publisher.ts" sub="publishes to SQS" />
<UmlChip :x="925" :y="236" :w="209" :h="34" label="storage/s3.service.ts" sub="presigned uploads" />
<line x1="630" y1="245" x2="690" y2="245" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pkg-arr)" />
<text x="660" y="237" text-anchor="middle" style="font-size:9px" fill="#5a5a5a">«use»</text>
<UmlNote :x="690" :y="340" :w="460" title="layering rule" :lines="['Controllers hold no business rules: they bind HTTP','to a service call and shape the response. Services','hold no SQL: they call repositories. Domain rules','are pure functions, so every rule can be unit','tested without a database, and the repositories','are tested against a real PostgreSQL in CI.']" />
<UmlComponent :x="690" :y="528" :w="460" :h="70" name="PostgreSQL · rescufood" stereotype="database" :lines="['listings, listing_images, requests,','request_idempotency_keys, audit_log']" />
<line x1="630" y1="563" x2="690" y2="563" stroke="#8a8a8a" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#pkg-open)" />
</svg>
</div>

<!--
FIGURE: LISTINGS-SERVICE PACKAGE DIAGRAM

Listings is the service where the hard design lives, so it is the one worth
showing in full. Its packages are arranged as four layers with a strict
dependency direction, plus two supporting packages on the right.

The presentation package contains only controllers and their DTOs. A controller
binds an HTTP route to one service call, validates the request shape and maps
the result onto a response. It holds no business rules at all, which is what
allows the same rule to be reached from more than one route without being
duplicated.

The application package contains the services that hold the workflow:
ListingsService for the listing lifecycle, RequestsService for claiming and
pickup, and two scheduled services that expire overdue listings and queue
pickup reminders. These services decide what is allowed; they contain no SQL.

The domain package is deliberately separate and deliberately boring. It is a
set of pure functions: whether a draft is complete enough to publish, which
status transitions are legal, who is a party to a claim, how a pickup code is
generated, hashed and compared, and how a claim request is fingerprinted for
idempotency. Because these functions take values and return values, every
business rule can be unit tested in milliseconds with no database.

The persistence package holds one repository per aggregate plus the Drizzle
schema. Repositories are the only code that issues SQL. This is the Repository
pattern, and its payoff shows up twice in the project: services can be unit
tested against an in-memory fake, and the repositories themselves are tested
against a real PostgreSQL instance through Testcontainers on every pull
request.

Note the dependency that skips a layer. The application package depends on both
the domain package and the persistence package; the domain package depends on
nothing. The cross-cutting package carries the JWT guard, the organisation
membership and admin guards, request logging and the health endpoint, which
presentation applies as decorators. The integration package isolates the two
outbound dependencies, SQS and S3, so that neither the services nor the
repositories know those technologies exist.
-->

---
class: flex flex-col dgm-page
---

# Logical packages: profile and notifications

<div class="dgm-sub">The same layering expressed in two different stacks, Go and NestJS.</div>

<div class="dgm-figure">
<svg viewBox="-16 0 1232 560" fill="none">
<UmlDefs p="pk2" />
<UmlPackage :x="40" :y="14" :w="530" :h="530" label="profile-service (Go)" :dashed="true" />
<UmlPackage :x="64" :y="48" :w="482" :h="76" label="cmd/" />
<UmlChip :x="78" :y="80" :w="225" :h="32" label="cmd/server" sub="HTTP entry point" />
<UmlChip :x="315" :y="80" :w="217" :h="32" label="cmd/migrate" sub="golang-migrate runner" />
<line x1="305" y1="124" x2="305" y2="144" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<UmlPackage :x="64" :y="144" :w="482" :h="96" label="internal/api" />
<UmlChip :x="78" :y="176" :w="225" :h="26" label="router.go · middleware.go" />
<UmlChip :x="315" :y="176" :w="217" :h="26" label="orgs.go · admin.go" />
<UmlChip :x="78" :y="208" :w="225" :h="26" label="me.go · auth_login.go" />
<UmlChip :x="315" :y="208" :w="217" :h="26" label="respond.go · sanitize.go" />
<line x1="180" y1="240" x2="180" y2="268" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<line x1="430" y1="240" x2="430" y2="268" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<UmlPackage :x="64" :y="268" :w="232" :h="96" label="internal/domain" />
<UmlChip :x="78" :y="300" :w="204" :h="26" label="organisation.go · user.go" />
<UmlChip :x="78" :y="332" :w="204" :h="26" label="audit.go · errors.go" />
<UmlPackage :x="314" :y="268" :w="232" :h="96" label="internal/store" />
<UmlChip :x="328" :y="300" :w="204" :h="26" label="organisations.go · users.go" />
<UmlChip :x="328" :y="332" :w="204" :h="26" label="transitions.go · audit.go" />
<line x1="314" y1="316" x2="296" y2="316" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<UmlPackage :x="64" :y="388" :w="482" :h="70" label="supporting packages" />
<UmlChip :x="78" :y="416" :w="146" :h="28" label="internal/auth" />
<UmlChip :x="236" :y="416" :w="146" :h="28" label="internal/config" />
<UmlChip :x="394" :y="416" :w="138" :h="28" label="internal/notify" />
<UmlChip :x="64" :y="478" :w="482" :h="30" label="db/migrations · owns organisations, users, audit_log, login_restrictions" />
<UmlPackage :x="620" :y="14" :w="540" :h="530" label="notifications-service (NestJS)" :dashed="true" />
<UmlPackage :x="644" :y="48" :w="492" :h="76" label="inbound" />
<UmlChip :x="658" :y="80" :w="230" :h="32" label="sqs-consumer.service.ts" sub="long-polls the queue" />
<UmlChip :x="900" :y="80" :w="222" :h="32" label="notifications.controller.ts" sub="in-app feed API" />
<line x1="890" y1="124" x2="890" y2="144" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<UmlPackage :x="644" :y="144" :w="492" :h="96" label="delivery" />
<UmlChip :x="658" :y="176" :w="230" :h="26" label="mailer.service.ts" />
<UmlChip :x="900" :y="176" :w="222" :h="26" label="templates.ts" />
<UmlChip :x="658" :y="208" :w="230" :h="26" label="in-app-templates.ts" />
<UmlChip :x="900" :y="208" :w="222" :h="26" label="notification-message.dto.ts" />
<line x1="890" y1="240" x2="890" y2="268" stroke="#1f6b45" stroke-width="1.4" marker-end="url(#pk2-arr)" />
<UmlPackage :x="644" :y="268" :w="492" :h="96" label="persistence" />
<UmlChip :x="658" :y="300" :w="230" :h="26" label="notifications.repository.ts" />
<UmlChip :x="900" :y="300" :w="222" :h="26" label="db/schema.ts" />
<UmlChip :x="658" :y="332" :w="464" :h="26" label="owns the separate notifications database" />
<UmlPackage :x="644" :y="388" :w="492" :h="70" label="supporting packages" />
<UmlChip :x="658" :y="416" :w="146" :h="28" label="auth/" />
<UmlChip :x="816" :y="416" :w="146" :h="28" label="common/" />
<UmlChip :x="974" :y="416" :w="148" :h="28" label="health/" />
<UmlChip :x="644" :y="478" :w="492" :h="30" label="db/migrations · Drizzle · owns notifications" />
</svg>
</div>

<!--
FIGURE: PROFILE AND NOTIFICATIONS PACKAGE DIAGRAMS

The two remaining services are shown together because the point of the figure
is that the same layering survives a change of language. Microservices were
chosen partly for polyglot freedom, so members could work in their strongest
language; what this diagram shows is that the freedom was in the stack, not in
the structure.

Profile is written in Go and follows the conventional Go layout. cmd/ holds the
two binaries, the HTTP server and the migration runner. internal/api holds the
chi router, the authentication and admin middleware and the handler files, one
per area of the API. internal/domain holds the business objects and their
rules: Organisation knows whether a status change is legal and carries Approve,
Reject and Suspend; User is a knowing object with no decisions of its own;
AuditEntry is immutable once written. internal/store holds the SQL, with one
file per table plus transitions.go, which wraps a status change and its audit
entry in a single transaction so no administrative change can be recorded
without its reason. The supporting packages carry token parsing, configuration
and the SQS publisher.

Notice the arrow from internal/store back to internal/domain. The store depends
on the domain, never the reverse, which is the same rule the listings service
applies between its repository and domain packages.

Notifications is the smallest service and the only one with two different ways
in. The SQS consumer long-polls the queue and is how events from the other two
services arrive; the controller serves the in-app feed to the platform web app.
Both converge on the same delivery package, which renders the message from a
template and sends it, and on the same repository, which records each delivery
and refuses a duplicate for an event that has already been delivered. The
service owns a separate database, since a delivery record is never joined to a
listing or a claim.
-->
