---
theme: default
title: RescuFood — SWE5006 Practice Project
info: |
  ## RescuFood
  Designing Modern Software Systems (SWE5006) — Practice Project Presentation.
  NUS-ISS Team 1.
class: flex flex-col justify-center text-center
colorSchema: light
fonts:
  sans: Geist
  serif: Geist
  mono: Geist Mono
  weights: '400,500,600,700,800'
drawings:
  persist: false
transition: fade
mdc: true
---

<div class="text-8xl font-extrabold leading-none">
Rescu<span class="accent">Food</span>
</div>

<div class="rule-green mt-10" style="margin-left:auto;margin-right:auto"></div>

<div class="text-base mt-10" style="color:#00000099">
Discover, claim and hand over surplus food before it is thrown away.
</div>

<div class="text-sm mt-12 dgm-wide" style="color:#00000066">
SWE5006 &middot; Designing Modern Software Systems &middot; NUS-ISS Team 1
</div>

<div class="text-xs mt-4 font-mono" style="color:#00000066">
github.com/nus-iss-team1/rescufood
</div>

<!--
TITLE

Hold here while people settle. One line: RescuFood is a real-time platform
that moves surplus food from the people who have it to the charities who
can use it, before it spoils. Over the next ~40 minutes we'll walk the
problem, how we ran the project, the design, the patterns that solved the
hard parts, our DevSecOps pipeline, and a live demo. Questions are welcome
inside each section.
-->

---

# What we'll cover

<div class="mt-10 mx-auto" style="max-width:40rem">

<div class="flex items-baseline"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">01</span><span class="text-lg">Overview &mdash; the problem and our scope</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">02</span><span class="text-lg">Project conduct &amp; agile practices</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">03</span><span class="text-lg">Analysis &amp; design</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">04</span><span class="text-lg">Design patterns &mdash; the hard problems</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">05</span><span class="text-lg">DevSecOps engineering &amp; automation</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">06</span><span class="text-lg">Demo</span></div>

</div>

<!--
AGENDA

Read the six markers once, quickly. This maps to the six segments the
graders expect. Tell them the timings are roughly: overview 3, conduct 6,
design 9, patterns 8, devsecops 7, demo 10 - Q&A folded into each. Then move.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 01</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
The <span class="accent">problem</span>
</div>

<!--
SECTION MARKER

Say the title and move on. Marker, not a slide to talk over.
-->

---

# Surplus food is a coordination problem

<div class="mt-8 grid grid-cols-2 gap-10 px-6">

<div>
<div class="dgm text-xs" style="color:#00000066">Today</div>
<div class="mt-4 flex flex-col" style="gap:0.75rem">
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#0000001a;background:#ffffff">Phone calls between donors and rescue partners</div>
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#0000001a;background:#ffffff">Ad-hoc chat groups</div>
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#0000001a;background:#ffffff">Spreadsheets that go stale</div>
</div>
<div class="mt-4 text-sm" style="color:#00000099">Double allocations. Missed pickups. Food spoils.</div>
</div>

<div>
<div class="dgm text-xs" style="color:#1f6b45">With RescuFood</div>
<div class="mt-4 flex flex-col" style="gap:0.75rem">
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">Donors post a listing the moment food is free</div>
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">Rescue partners claim it &mdash; first come, first served</div>
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">Pickup verified by OTP / QR, tracked to handover</div>
</div>
<div class="mt-4 text-sm" style="color:#1f6b45">One claim per listing. One source of truth.</div>
</div>

</div>

<!--
THE PROBLEM

Surplus food is time-sensitive. A tray of bread is useful for a few hours,
then it's waste. The blocker is never goodwill - it's coordination. Donors
and rescue partners today rely on calls, chat groups and spreadsheets,
which means two partners show up for the same tray, or nobody shows up.

RescuFood makes the workflow digital and real-time. A donor posts a
listing the instant food becomes available; a rescue partner claims it on
a first-come-first-served basis; and the handover is verified and tracked.
The core promise is on the right: one claim per listing, one source of
truth. Hold that phrase - the whole design defends it.
-->

---

# Scope: what we built

<div class="mt-6 px-6">

<div class="grid grid-cols-3 gap-4">
  <div class="rounded-lg border px-4 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="dgm text-xs" style="color:#1f6b45">Identity</div>
    <div class="text-sm mt-2 font-semibold">Users, orgs, approval</div>
    <div class="text-xs mt-1" style="color:#00000099">Donors and rescue partners register; admins approve organisations.</div>
  </div>
  <div class="rounded-lg border px-4 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="dgm text-xs" style="color:#1f6b45">Listings &amp; claims</div>
    <div class="text-sm mt-2 font-semibold">Post, browse, claim</div>
    <div class="text-xs mt-1" style="color:#00000099">The core loop. Claiming is the hard part &mdash; section 04.</div>
  </div>
  <div class="rounded-lg border px-4 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="dgm text-xs" style="color:#1f6b45">Pickup &amp; notify</div>
    <div class="text-sm mt-2 font-semibold">Verify, hand over, notify</div>
    <div class="text-xs mt-1" style="color:#00000099">OTP / QR-verified handover; email + in-app notifications.</div>
  </div>
</div>

<div class="mt-8 grid grid-cols-2 gap-8">
<div>
<div class="dgm text-xs" style="color:#1f6b45">Design goals</div>
<div class="text-sm mt-3" style="color:#000000">Robust &middot; maintainable &middot; extensible &middot; secure by default</div>
</div>
<div>
<div class="dgm text-xs" style="color:#00000066">Out of scope</div>
<div class="text-sm mt-3" style="color:#00000099">Horizontal scale &amp; auto-scaling &mdash; a proof of concept, not a load test</div>
</div>
</div>

</div>

<!--
SCOPE

Three capability areas. Identity: donors and rescue partners register, and
an admin approves organisations before they can transact - that approval
gate matters because a claim reserves real food. Listings and claims are
the core loop and the source of our most interesting design work, so I'll
defer the detail to section 4. Pickup and notify closes the loop: an
OTP/QR-verified handover, plus email and in-app notifications.

Design goals, bottom left, are the DMSS quality attributes - robustness,
maintainability, extensibility, security by default. Bottom right, the
honest boundary: this is a proof of concept, so horizontal scaling and
auto-scaling are deliberately out of scope. We optimised for correct and
maintainable, not for ten million users.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 02</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
How we <span class="accent">ran</span> it
</div>

<!--
SECTION MARKER
-->

---

# Agile, in practice

<div class="mt-8 px-6">

<div class="grid grid-cols-2 gap-10">
<div>
<div class="dgm text-xs" style="color:#1f6b45">Cadence</div>
<div class="mt-3 flex flex-col" style="gap:0.6rem">
  <div class="text-sm">Scrum &middot; six two-week sprints</div>
  <div class="text-sm">Backlog &rarr; sprint plan &rarr; review &rarr; retrospective</div>
  <div class="text-sm">Fortnightly progress reports to ISS</div>
</div>
</div>
<div>
<div class="dgm text-xs" style="color:#1f6b45">Engineering discipline</div>
<div class="mt-3 flex flex-col" style="gap:0.6rem">
  <div class="text-sm">Tests written with the feature (TDD where it paid off)</div>
  <div class="text-sm">Every change lands via pull request &amp; review</div>
  <div class="text-sm">Continuous integration on every PR</div>
</div>
</div>
</div>

<div class="mt-8 flex items-center" style="gap:1rem">
  <div class="rounded-lg border px-5 py-3 text-center" style="border-color:#0000001a;background:#ffffff">
    <div class="text-2xl font-bold" style="color:#1f6b45">36<span class="text-base" style="color:#00000099">/36</span></div>
    <div class="dgm text-xs mt-1" style="color:#00000066">Sprint 2 points</div>
  </div>
  <div class="rounded-lg border px-5 py-3 text-center" style="border-color:#0000001a;background:#ffffff">
    <div class="text-2xl font-bold" style="color:#1f6b45">32<span class="text-base" style="color:#00000099">/40</span></div>
    <div class="dgm text-xs mt-1" style="color:#00000066">Sprint 3 points</div>
  </div>
  <div class="flex-1 rounded-lg border px-5 py-3" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">
    <div class="text-sm" style="color:#000000">Retro format: <span class="font-semibold">went well</span> &middot; <span class="font-semibold">could be better</span> &middot; <span class="font-semibold">try next</span> &mdash; one concrete change carried forward each sprint.</div>
  </div>
</div>

</div>

<!--
AGILE PRACTICE

We ran Scrum over six two-week sprints - each starts from the backlog, gets
a sprint plan, and closes with a review and a retrospective. The fortnightly
progress reports ISS asked for fell straight out of that rhythm; we didn't
write them separately.

Top right is the engineering side of "essential practices for agile teams":
tests written alongside features, every change through a pull request and
review, and CI on every one of those PRs. Nothing reaches a branch without
going green first.

The numbers are real velocity from our burndowns - Sprint 2 closed 36 of 36
points, Sprint 3 closed 32 of 40, about 80%. We're being honest that not
every sprint hit 100%; the shortfall in Sprint 3 was the CDN and API Gateway
migration running long, and it carried into the next sprint.

The green box is our retrospective format. The point isn't the three
headings, it's that every sprint we carried exactly one concrete change
forward - PR automation after Sprint 1, tests-in-CI after Sprint 2. That's
how the pipeline in section 5 got as strict as it is.
-->

---

# Status &amp; effort

<div class="mt-8 px-6">

<div class="grid grid-cols-2 gap-10">
<div>
<div class="dgm text-xs" style="color:#1f6b45">Where we are</div>
<div class="mt-3 flex flex-col" style="gap:0.5rem">
  <div class="flex items-baseline"><span class="mr-3" style="color:#1f6b45">&check;</span><span class="text-sm">Three services + two web apps, deployed to prod</span></div>
  <div class="flex items-baseline"><span class="mr-3" style="color:#1f6b45">&check;</span><span class="text-sm">Core loop working end to end: post &rarr; claim &rarr; pickup</span></div>
  <div class="flex items-baseline"><span class="mr-3" style="color:#1f6b45">&check;</span><span class="text-sm">CI/CD across all three environments</span></div>
</div>
<div class="dgm text-xs mt-6" style="color:#00000066">Outstanding</div>
<div class="mt-3 flex flex-col" style="gap:0.5rem">
  <div class="flex items-baseline"><span class="mr-3" style="color:#00000066">&middot;</span><span class="text-sm" style="color:#00000099">Richer conflict/retry UX on claim</span></div>
  <div class="flex items-baseline"><span class="mr-3" style="color:#00000066">&middot;</span><span class="text-sm" style="color:#00000099">Broaden SAST gating once findings are triaged</span></div>
</div>
</div>
<div>
<div class="dgm text-xs" style="color:#1f6b45">Effort</div>
<div class="mt-3 text-sm" style="color:#00000099">Team of 7 &middot; ~80 hours each &middot; <span class="font-semibold" style="color:#000000">560 person-hours</span>. Split across web, identity, listings/claims, notifications and infrastructure.</div>
<div class="mt-5 rounded-lg border px-5 py-4" style="border-color:#0000001a;background:#ffffff">
<div class="text-xs dgm" style="color:#00000066">Six sprints &mdash; four delivered</div>
<div class="text-sm mt-2">S1 CI/CD + auth &middot; S2 IaC + IAM + QA &middot; S3 claim, OTP, notify, CDN+API GW &middot; S4 pickup completion</div>
</div>
</div>
</div>

</div>

<!--
STATUS & EFFORT

Quick and honest. Where we are: three backend services and two web apps are
deployed; the core loop works end to end; and CI/CD runs across all three
environments. Outstanding work is genuine but small - a richer conflict and
retry experience on the claim screen, and turning on fail-on-findings for
the security scanners once we've triaged the backlog. We chose not to block
the pipeline on untriaged findings rather than rubber-stamp them.

Effort: seven of us, about 80 hours each, so roughly 560 person-hours,
split across the areas listed. The plan is six two-week sprints; four are
delivered and evidenced. The one-liner traces the arc: Sprint 1 stood up
CI/CD and authentication, Sprint 2 the infrastructure-as-code, sandbox
environments, IAM and the first automated QA cases, Sprint 3 the
claim/reservation workflow, pickup OTP, notifications and the move from a
public load balancer to CDN plus API Gateway, and Sprint 4 pickup
completion. Name who owned what if asked.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 03</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Analysis &amp; <span class="accent">design</span>
</div>

<!--
SECTION MARKER
-->

---

# The system, from the top

<div class="mt-6 px-4">

<div class="flex items-center justify-center" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-3 text-center" style="border-color:#0000001a;background:#ffffff;width:11rem">
    <div class="text-sm font-semibold">Platform web</div>
    <div class="text-xs" style="color:#00000099">Next.js &middot; donors &amp; partners</div>
  </div>
  <div class="rounded-lg border px-4 py-3 text-center" style="border-color:#0000001a;background:#ffffff;width:11rem">
    <div class="text-sm font-semibold">Admin console</div>
    <div class="text-xs" style="color:#00000099">React SPA &middot; local only</div>
  </div>
</div>

<div class="text-center mt-2" style="color:#00000066">&darr;&nbsp;&nbsp;HTTPS / JSON&nbsp;&nbsp;&darr;</div>

<div class="flex items-center justify-center mt-1" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-1.5 text-center text-xs font-medium" style="border-color:#0000001a;background:#f2f0ed;width:23rem;color:#3a3a3a">CDN &middot; API Gateway &nbsp;<span style="color:#5a5a5a">(hardened ingress, Sprint 3)</span></div>
</div>

<div class="text-center my-1" style="color:#00000066">&darr;</div>

<div class="flex items-center justify-center" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-3 text-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem">
    <div class="text-sm font-semibold">Profile</div>
    <div class="text-xs" style="color:#00000099">Go &middot; users, orgs, approval</div>
  </div>
  <div class="rounded-lg border px-4 py-3 text-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem">
    <div class="text-sm font-semibold">Listings</div>
    <div class="text-xs" style="color:#00000099">NestJS &middot; listings, claims, pickup</div>
  </div>
  <div class="rounded-lg border px-4 py-3 text-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem">
    <div class="text-sm font-semibold">Notifications</div>
    <div class="text-xs" style="color:#00000099">NestJS &middot; queue consumer</div>
  </div>
</div>

<div class="flex items-center justify-center mt-2" style="gap:0.6rem">
  <div class="text-center" style="width:11rem"></div>
  <div class="text-center" style="width:11rem"><span style="color:#00000066">&rarr; SQS &rarr;</span></div>
  <div class="text-center" style="width:11rem"></div>
</div>

<div class="flex items-center justify-center mt-1" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-2 text-center text-xs font-mono" style="border-color:#0000001a;background:#f2f0ed;width:23rem;color:#00000099">PostgreSQL (per service)</div>
  <div class="rounded-lg border px-4 py-2 text-center text-xs font-mono" style="border-color:#0000001a;background:#f2f0ed;width:11rem;color:#00000099">AWS ECS Fargate</div>
</div>

</div>

<!--
ARCHITECTURE

Top-down, as the guidelines ask. Two front ends: the Next.js platform app
for donors and rescue partners, and a React admin console. One design
decision worth flagging - the console runs locally only (that's ADR-0001).
Deploying it would mean another Fargate task, load-balancer rule and
pipeline, for an audience that is just our team. The admin API stays
protected by an admin claim on the token, so keeping the UI local costs us
nothing in security. That's the kind of deliberate, documented trade-off
the module is looking for.

Everything talks over HTTPS and JSON, through a CDN and API Gateway. That
edge is itself a decision - in Sprint 2 the services sat behind a public
load balancer, and in Sprint 3 we moved the traffic path to CDN plus API
Gateway to harden the ingress. Architecture that adapted as we learned, not
frozen up front.

Behind it, three backend services: profile in Go owns identity and the
org-approval workflow; listings in NestJS owns the core loop and is where
the hard design lives; notifications in NestJS is a queue consumer. Services
don't call each other synchronously for
side-effects - listings emits an event onto SQS and notifications reacts.
That decoupling is deliberate: a slow email never blocks a claim.

Each service owns its own PostgreSQL - no shared database, so services stay
independently deployable. It all runs on ECS Fargate via CloudFormation.
-->

---
class: flex flex-col
---

<div class="dgm-wide text-xs px-6 pt-2" style="color:#3a3a3a;flex:0 0 auto">Physical architecture &middot; AWS</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
  <img src="/infra.svg" alt="RescuFood physical architecture on AWS" style="max-height:100%;max-width:100%;object-fit:contain" />
</div>

<!--
PHYSICAL ARCHITECTURE

This is the deployment view - the logical picture from the last slide,
placed on real AWS. Walk it left to right, briefly; don't read every box.

Traffic enters through API Gateway, which terminates TLS, and crosses a VPC
Link into the VPC. Inside, an internal load balancer path-routes to the
Fargate services - /api/profile to profile, /api/listings and /api/requests
to listings, and so on. The services run across two availability zones.

Data sits in isolated subnets with no internet route: RDS PostgreSQL,
Multi-AZ per environment, encrypted with a managed master secret. Identity
is Cognito, with donor, rescue-partner and admin groups. Listing images go
to a private S3 bucket fronted by CloudFront. And the notifications path is
SQS with a dead-letter queue - the same decoupling we showed logically,
here in infrastructure.

The one thing to call out as honest: a single NAT gateway in AZ A - a
deliberate cost trade-off for a proof of concept, and the obvious first
change if this went to real production traffic.

If the SVG isn't in place yet: export infra-plan.drawio to slides/infra.svg
(VS Code Draw.io extension -> Export -> SVG), then this slide fills in.
-->

---

# From analysis to design

<div class="mt-8 px-6">

<div class="flex items-center justify-center" style="gap:1rem">
  <div class="rounded-lg border px-5 py-4 text-center" style="border-color:#0000001a;background:#ffffff;width:12rem">
    <div class="dgm text-xs" style="color:#00000066">Analysis</div>
    <div class="text-sm mt-2 font-semibold">User story</div>
    <div class="text-xs mt-1" style="color:#00000099">"As a rescue partner I claim a listing so no one else can take it."</div>
  </div>
  <div style="color:#1f6b45">&rarr;</div>
  <div class="rounded-lg border px-5 py-4 text-center" style="border-color:#0000001a;background:#ffffff;width:12rem">
    <div class="dgm text-xs" style="color:#00000066">Domain</div>
    <div class="text-sm mt-2 font-semibold">Listing, Claim, Org</div>
    <div class="text-xs mt-1" style="color:#00000099">Invariant: at most one active claim per listing.</div>
  </div>
  <div style="color:#1f6b45">&rarr;</div>
  <div class="rounded-lg border px-5 py-4 text-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:12rem">
    <div class="dgm text-xs" style="color:#1f6b45">Design</div>
    <div class="text-sm mt-2 font-semibold">Modules &amp; tables</div>
    <div class="text-xs mt-1" style="color:#00000099">Guarded transaction + unique index enforce the invariant.</div>
  </div>
</div>

<div class="mt-10 grid grid-cols-2 gap-8">
<div>
<div class="dgm text-xs" style="color:#1f6b45">Security, designed in</div>
<div class="mt-3 flex flex-col" style="gap:0.5rem">
  <div class="text-sm">JWT auth guard on every protected route</div>
  <div class="text-sm">Org-membership guard &mdash; you act only for your org</div>
  <div class="text-sm">Admin claim gates the admin API</div>
</div>
</div>
<div>
<div class="dgm text-xs" style="color:#1f6b45">Quality attributes</div>
<div class="mt-3 flex flex-col" style="gap:0.5rem">
  <div class="text-sm">Maintainability &mdash; one module per capability</div>
  <div class="text-sm">Extensibility &mdash; repositories hide the schema</div>
  <div class="text-sm">Robustness &mdash; invariants in the database, not just code</div>
</div>
</div>
</div>

</div>

<!--
ANALYSIS TO DESIGN

This is the transition DMSS cares about most - how a user story becomes a
design. Take the claim story on the left. In analysis it's one sentence.
We turn it into a domain model - Listing, Claim, Org - and the moment we
write that model we surface the invariant that defines the whole system:
at most one active claim per listing. Design is then the answer to "how do
we guarantee that invariant even under retries and races" - a guarded
transaction plus a unique index. Section 4 is that answer in full.

Security was designed in, not bolted on. Every protected route runs behind
a JWT auth guard; an org-membership guard ensures you can only act for your
own organisation; and the admin API is gated by an admin claim. On the
right, the quality attributes made concrete: a module per capability for
maintainability, repositories hiding the schema for extensibility, and -
the one I'd underline - invariants enforced in the database, not only in
application code. Code can have bugs; a unique index cannot be talked out
of its job.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 04</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
The hard problem: <span class="accent">claiming</span>
</div>

<!--
SECTION MARKER

This is our centrepiece. The graders want "design problems solved by
applying patterns" - this is ours, end to end.
-->

---

# One listing, one claim &mdash; even under retries

<div class="mt-8 px-6">

<div class="rounded-lg border px-6 py-4" style="border-color:#0000001a;background:#ffffff">
<div class="dgm text-xs" style="color:#00000066">The problem</div>
<div class="text-sm mt-2">A claim reserves a whole listing for one org. A network blip or a double-tap must never create two claims &mdash; and an honest retry must return the <span class="font-semibold">same</span> answer, not an error.</div>
</div>

<div class="mt-6 grid grid-cols-2 gap-6">
  <div class="rounded-lg border px-5 py-4" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">
    <div class="dgm text-xs" style="color:#1f6b45">Pattern 1 &middot; Idempotency key</div>
    <div class="text-sm mt-2">Each claim carries a key. First call does the work; identical retries replay the stored outcome.</div>
    <div class="text-xs mt-2 font-mono" style="color:#00000099">request_idempotency_keys</div>
  </div>
  <div class="rounded-lg border px-5 py-4" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">
    <div class="dgm text-xs" style="color:#1f6b45">Pattern 2 &middot; Guarded transaction</div>
    <div class="text-sm mt-2">A partial unique index makes "at most one active claim" a database law &mdash; not a hopeful check.</div>
    <div class="text-xs mt-2 font-mono" style="color:#00000099">requests_active_claim_per_listing_uq</div>
  </div>
</div>

</div>

<!--
THE HARD PROBLEM

Here's the problem stated plainly. A claim reserves an entire listing for
one organisation. Two things can go wrong: a network blip or a double-tap
could create two claims, and separately, an honest retry - the user's phone
resent the request - must come back with the same answer, not a confusing
error.

Two patterns, working together. Pattern one is an idempotency key: every
claim request carries a key, the first call does the real work, and an
identical retry replays the stored outcome instead of acting again. Pattern
two is a guarded transaction backed by a partial unique index, which makes
"at most one active claim per listing" a law the database enforces, not a
check we hope runs at the right time. The next slide shows how the key
handles each case.
-->

---

# The decision table does the reasoning

<div class="mt-6 px-6">

<table class="text-sm" style="width:100%;border-collapse:collapse">
<thead>
<tr style="border-bottom:2px solid #1f6b45">
<th class="text-left py-2" style="color:#1f6b45">Situation</th>
<th class="text-left py-2" style="color:#1f6b45">Result</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid #0000001a"><td class="py-2">New key</td><td class="py-2">Slot claimed, claim created, completed in one transaction</td></tr>
<tr style="border-bottom:1px solid #0000001a"><td class="py-2">Identical retry</td><td class="py-2">Original claim returned &mdash; no second claim</td></tr>
<tr style="border-bottom:1px solid #0000001a"><td class="py-2">Same key, different data</td><td class="py-2"><span class="font-mono">409</span>, original untouched, conflict audited</td></tr>
<tr style="border-bottom:1px solid #0000001a"><td class="py-2">Retry while first is in flight</td><td class="py-2"><span class="font-mono">409</span> "still processing" &mdash; retry gets the outcome</td></tr>
<tr><td class="py-2">Lost the race</td><td class="py-2">Re-read the winner and replay their result</td></tr>
</tbody>
</table>

<div class="mt-6 flex items-center" style="gap:1rem">
  <div class="rounded-lg border px-4 py-2 font-mono text-xs" style="border-color:#0000001a;background:#ffffff">INSERT … ON CONFLICT DO NOTHING</div>
  <div class="text-sm" style="color:#00000099">claims the slot atomically; the loser re-reads instead of erroring</div>
</div>

</div>

<!--
DECISION TABLE

This table is the design - it's lifted straight from our ADR-0002. Each row
is a situation the claim path must survive, and the point is that every one
resolves to a defined, tested outcome. New key: everything commits in one
transaction - the slot, the claim and the audit row together. Identical
retry: you get the original claim back, no duplicate. Same key but different
data: that's a client bug, so we 409 and audit it rather than silently
doing the wrong thing. Retry while the first is still running: a 409 that
says "still processing", and the retry picks up the real outcome. And if two
requests race, exactly one wins the ON CONFLICT and the loser re-reads the
winner's result instead of throwing.

The bottom line is the mechanism: INSERT ... ON CONFLICT DO NOTHING claims
the slot atomically. No lock held across a request, no lost updates. This
is what "solving a design problem with a pattern" looks like in our system.
-->

---

# The same patterns, reused everywhere

<div class="mt-8 px-6">

<div class="grid grid-cols-2 gap-5">
  <div class="rounded-lg border px-5 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="text-sm font-semibold">Repository</div>
    <div class="text-xs mt-1" style="color:#00000099">Every service talks to its schema through a repository. Swap the query, not the caller.</div>
  </div>
  <div class="rounded-lg border px-5 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="text-sm font-semibold">Guard</div>
    <div class="text-xs mt-1" style="color:#00000099">Auth and org-membership as composable guards on the routes that need them.</div>
  </div>
  <div class="rounded-lg border px-5 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="text-sm font-semibold">Publish / subscribe</div>
    <div class="text-xs mt-1" style="color:#00000099">Listings publishes events; notifications subscribes. Neither knows the other.</div>
  </div>
  <div class="rounded-lg border px-5 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="text-sm font-semibold">Scheduled sweeper</div>
    <div class="text-xs mt-1" style="color:#00000099">An hourly job prunes expired idempotency keys &mdash; retention without manual work.</div>
  </div>
</div>

<div class="mt-8 text-center text-sm" style="color:#00000099">
Patterns earn their place by being <span class="accent font-semibold">reused</span> &mdash; not applied once for show.
</div>

</div>

<!--
PATTERNS REUSED

Design patterns count when they're reused, not name-dropped once. Four that
recur across the codebase. Repository: every service reaches its schema
through one, so we change a query without touching callers - that's our
extensibility story. Guard: authentication and org-membership are
composable guards dropped onto the routes that need them. Publish/subscribe:
listings publishes an event and notifications subscribes, and crucially
neither service knows the other exists - that's what let us add
notifications without touching the claim path. And a scheduled sweeper: an
hourly cron prunes expired idempotency keys, so retention is automatic.

The line at the bottom is the message for the graders: we applied patterns
where they solved a real problem and reused them, rather than sprinkling one
in to tick a box.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 05</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
DevSecOps &amp; <span class="accent">automation</span>
</div>

<!--
SECTION MARKER
-->

---
class: flex flex-col justify-center
clicks: 1
---

<div class="text-5xl font-extrabold leading-tight px-16 text-center">
One branch per <span class="accent">environment</span>.
</div>

<div class="rule-green mt-8" style="margin-left:auto;margin-right:auto"></div>

<div class="text-xl mt-8 text-center transition-all duration-700" style="color:#00000099" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">
The branch you are on is the environment you are changing.
</div>

<!--
THE RULE

Our whole delivery model follows from one sentence. We keep three
long-lived branches, and each owns exactly one deployed environment.

Click. That's the mental model. If you know which branch you're on, you
know what you're about to affect. There is no separate deploy procedure to
remember, because there isn't one.
-->

---
class: flex flex-col justify-center
clicks: 5
---

# dev &rarr; qa &rarr; prod

<div class="mt-10">

<div class="flex items-center justify-center" style="gap:0.75rem">
  <div class="rounded-lg border text-sm py-2 px-4 font-medium text-center" style="border-color:#0000001a;background:#f2f0ed;color:#00000099">feat/* &nbsp;fix/*</div>
  <div style="color:#00000066">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center" style="width:8.5rem;border-color:#0000001a;background:#ffffff;color:#000000">develop</div>
  <div class="transition-all duration-700" style="color:#00000066" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-30'">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center transition-all duration-700" style="width:8.5rem" :style="$clicks >= 1 ? 'border-color:#0000001a;background:#ffffff;color:#000000' : 'border-color:#0000001a;background:#f2f0ed;color:#00000044'">qa</div>
  <div class="transition-all duration-700" style="color:#00000066" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-30'">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center transition-all duration-700" style="width:8.5rem" :style="$clicks >= 2 ? 'border-color:#1f6b45;background:#1f6b45;color:#ffffff' : 'border-color:#0000001a;background:#f2f0ed;color:#00000044'">main</div>
</div>

<div class="flex items-center justify-center mt-2" style="gap:0.75rem">
  <div class="text-sm py-2 px-4" style="width:8rem"></div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono" style="width:8.5rem;color:#00000066">dev.rescufood.com</div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono transition-all duration-700" style="width:8.5rem;color:#00000066" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">qa.rescufood.com</div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono transition-all duration-700" style="width:8.5rem;color:#00000066" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-0'">rescufood.com</div>
</div>

<div class="mt-10 mx-auto" style="max-width:36rem">
  <div class="flex items-baseline transition-all duration-700" :class="$clicks >= 3 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base">Every arrow is a <span class="accent font-semibold">pull request</span> with approval</span>
  </div>
  <div class="flex items-baseline mt-3 transition-all duration-700" :class="$clicks >= 4 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base">A promotion carries <span class="font-semibold">everything</span> since the last one</span>
  </div>
  <div class="flex items-baseline mt-3 transition-all duration-700" :class="$clicks >= 5 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base font-mono text-sm">git diff qa..develop</span><span class="text-base">&nbsp;is the release note</span>
  </div>
</div>

</div>

<!--
THE PIPELINE

This is the branching strategy the brief asked us to make explicit. Work
starts on a feature or fix branch and merges into develop - the one place
day-to-day work lands. develop deploys to dev.rescufood.com.

Click. Promoting to qa is a merge from develop; it deploys qa.rescufood.com.
Nothing is rebuilt by hand, nothing cherry-picked.

Click. Promoting to prod is a merge from qa into main - same shape - and
main deploys rescufood.com. Three branches, three environments, one route
into each.

Click. Every arrow is a pull request that requires approval, so every
promotion between environments is reviewed.

Click. A promotion carries whatever accumulated since the last one - no
release branch assembled under pressure.

Click. Which makes that git diff the entire release note. If you want to
know what's about to ship to qa, you read that diff. Nothing else is
authoritative.
-->

---
class: flex flex-col justify-center
clicks: 3
---

# Semantic versioning on prod

<div class="mt-10 px-8">

<div class="flex items-center justify-center" style="gap:1rem">
  <div class="rounded-lg border px-6 py-4 text-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">
    <div class="font-mono text-2xl font-bold" style="color:#1f6b45">v<span>1</span>.<span>4</span>.<span>2</span></div>
  </div>
  <div class="flex flex-col text-sm" style="gap:0.5rem">
    <div class="transition-all duration-700" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-30'"><span class="font-mono font-semibold">MAJOR</span> &mdash; a breaking API change</div>
    <div class="transition-all duration-700" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-30'"><span class="font-mono font-semibold">MINOR</span> &mdash; a backward-compatible feature</div>
    <div class="transition-all duration-700" :class="$clicks >= 3 ? 'opacity-100' : 'opacity-30'"><span class="font-mono font-semibold">PATCH</span> &mdash; a fix, no contract change</div>
  </div>
</div>

<div class="mt-10 mx-auto text-center text-sm" style="max-width:34rem;color:#00000099">
Each merge to <span class="font-mono">main</span> is tagged <span class="font-mono">vMAJOR.MINOR.PATCH</span>. The tag names the release, the image, and what to roll back to.
</div>

</div>

<!--
SEMANTIC VERSIONING

Promotion tells you where code is; the version tells you what it is. Every
merge to main is tagged with a semantic version.

Click. MAJOR goes up on a breaking API change - anything that would force a
client to change.

Click. MINOR for a backward-compatible feature.

Click. PATCH for a fix that changes no contract.

The tag is the anchor for the release, the built image, and the rollback
target. If prod misbehaves, "roll back to v1.4.1" is unambiguous - no
guessing which commit was live. Versioning and the branch model answer two
different questions: which environment, and which release.
-->

---
class: flex flex-col justify-center
clicks: 3
---

# What a push does

<div class="mt-10 px-8">

<div class="flex items-start" style="gap:2rem">
  <div class="rounded-lg border px-5 py-3 font-mono text-sm" style="border-color:#0000001a;background:#ffffff;color:#000000;white-space:nowrap">git push origin qa</div>
  <div class="flex-1">
    <div class="transition-all duration-700" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">
      <div class="text-base font-semibold">Builds only what changed</div>
      <div class="text-sm mt-1" style="color:#00000099">Path filters per service. Touch <span class="font-mono">service/listings</span>, only listings rebuilds.</div>
    </div>
    <div class="mt-5 transition-all duration-700" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-0'">
      <div class="text-base font-semibold">Tags the image for the environment</div>
      <div class="text-sm mt-1" style="color:#00000099"><span class="font-mono">:qa</span>, not <span class="font-mono">:main</span>. Parameter files name environments, never branches.</div>
    </div>
    <div class="mt-5 transition-all duration-700" :class="$clicks >= 3 ? 'opacity-100' : 'opacity-0'">
      <div class="text-base font-semibold">Rolls that environment only</div>
      <div class="text-sm mt-1" style="color:#00000099">The cluster is resolved from the branch. <span class="font-mono">qa</span> can never reach <span class="font-mono">rescufood-prod</span>.</div>
    </div>
  </div>
</div>

</div>

<!--
WHAT A PUSH DOES

One push, three automatic consequences.

Click. Each service has a path filter, so a change under service/listings
rebuilds listings and nothing else - a one-line fix doesn't redeploy the
whole platform.

Click. The image is tagged for the environment, not the branch. Pushing to
main produces a prod tag, because the CloudFormation parameter files read
environment names - nobody has to remember that main means prod.

Click. The target cluster is derived from the branch inside the workflow.
There's no input to get wrong and no way for a qa push to touch prod; the
GitHub Environment resolves the same way, so credentials follow too.
-->

---
class: flex flex-col justify-center
clicks: 3
---

# Security runs on every change

<div class="mt-10 px-10">

<div class="flex items-center justify-center" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-2 text-sm font-medium" style="border-color:#0000001a;background:#ffffff">Lint</div>
  <div style="color:#00000066">&rarr;</div>
  <div class="rounded-lg border px-4 py-2 text-sm font-medium" style="border-color:#0000001a;background:#ffffff">Unit test</div>
  <div style="color:#00000066">&rarr;</div>
  <div class="rounded-lg border px-4 py-2 text-sm font-medium" style="border-color:#0000001a;background:#ffffff">Build</div>
  <div style="color:#00000066">&rarr;</div>
  <div class="rounded-lg border px-4 py-2 text-sm font-medium" style="border-color:#0000001a;background:#ffffff">Integration<br/><span class="text-xs font-normal" style="color:#00000099">testcontainers</span></div>
</div>

<div class="mt-8 transition-all duration-700" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-20'">
<div class="dgm text-xs" style="color:#1f6b45">Static analysis, in parallel</div>
<div class="flex items-center mt-3" style="gap:0.6rem">
  <div class="rounded-lg border px-4 py-2 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)"><span class="font-semibold">CodeQL</span> &middot; security-extended</div>
  <div class="rounded-lg border px-4 py-2 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)"><span class="font-semibold">Semgrep</span> &middot; default, secrets, node</div>
  <div class="rounded-lg border px-4 py-2 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)"><span class="font-semibold">Trivy</span> &middot; deps, secrets, IaC</div>
</div>
</div>

<div class="mt-6 text-sm transition-all duration-700" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-0'" style="color:#00000099">
Findings upload to GitHub code scanning as SARIF &mdash; visible on the PR.
</div>
<div class="mt-2 text-sm transition-all duration-700" :class="$clicks >= 3 ? 'opacity-100' : 'opacity-0'" style="color:#00000099">
qa promotions also run the <span class="accent font-semibold">Playwright</span> suite against the deployed site.
</div>

</div>

<!--
SECURITY IN THE PIPELINE

This is the "Sec" in DevSecOps, and it's real, not a slide. Every PR runs
lint, unit tests, a build, and an integration suite - that last one spins
up a real Postgres with testcontainers, so we test against the actual
database, not a mock.

Click. In parallel, three static-analysis tools. CodeQL on the
security-extended query set. Semgrep with the default, secrets and Node
rule sets. Trivy scanning dependencies, secrets and infrastructure-as-code
misconfiguration. Three tools because they catch different things.

Click. Every finding uploads to GitHub code scanning as SARIF, so it shows
up right on the pull request - the reviewer sees security findings next to
the diff. We run report-only for now and will gate once the backlog is
triaged; that's a deliberate call, not an oversight.

Click. And promoting to qa additionally runs the Playwright end-to-end
suite against the deployed environment - a green qa is evidence the real
site works, not just that a local build passed.
-->

---
class: flex flex-col justify-center
clicks: 2
---

# The gates get stricter

<div class="mt-12 px-12">

<div class="flex flex-col" style="gap:0.75rem">
  <div class="flex items-center rounded-lg border px-6 py-4" style="border-color:#0000001a;background:#ffffff">
    <div class="font-mono text-base font-semibold" style="width:8rem">develop</div>
    <div class="text-sm" style="color:#00000099">Pull request &middot; one approval &middot; team may bypass</div>
  </div>
  <div class="flex items-center rounded-lg border px-6 py-4 transition-all duration-700" style="border-color:#0000001a;background:#ffffff" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-30'">
    <div class="font-mono text-base font-semibold" style="width:8rem">qa</div>
    <div class="text-sm" style="color:#00000099">Same, plus the end-to-end suite runs against the deployed site</div>
  </div>
  <div class="flex items-center rounded-lg border px-6 py-4 transition-all duration-700" :style="$clicks >= 2 ? 'border-color:#1f6b45;background:rgba(31,107,69,0.06)' : 'border-color:#0000001a;background:#ffffff'" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-30'">
    <div class="font-mono text-base font-semibold" style="width:8rem" :style="$clicks >= 2 ? 'color:#1f6b45' : ''">main</div>
    <div class="text-sm" :style="$clicks >= 2 ? 'color:#1f6b45' : 'color:#00000099'">No force pushes &middot; no deletion &middot; approval required, no exceptions</div>
  </div>
</div>

</div>

<!--
THE GATES

Same rule set on all three branches, tightened as you move right. Deletion
and force pushes are blocked everywhere.

Click. qa adds the real signal - the Playwright suite runs against the
deployed environment after every promotion, not against a local build. A
green qa is evidence, not a hope.

Click. main is the one branch with no bypass. Prod can't be force-pushed
and can't be merged without a review, including of the author's own change.
If that feels inconvenient, that's the point.

Worth saying out loud: we learned this the hard way. A change that passed
typecheck, lint and build still took dev down. The environment in front of
prod is what caught the second attempt - which is exactly why the approval
flow tightens as the blast radius grows.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 06</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
<span class="accent">Demo</span>
</div>

<!--
SECTION MARKER

Switch to the live environment now. Have qa.rescufood.com open and logged
in on two browser profiles (a donor and a rescue partner) before you get
here, so there's no fumbling.
-->

---

# What we'll show

<div class="mt-8 px-6">

<div class="flex flex-col" style="gap:0.75rem">
  <div class="flex items-baseline rounded-lg border px-5 py-3" style="border-color:#0000001a;background:#ffffff"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.2rem">1</span><span class="text-sm">Donor posts a listing &mdash; it appears in the browse feed in real time</span></div>
  <div class="flex items-baseline rounded-lg border px-5 py-3" style="border-color:#0000001a;background:#ffffff"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.2rem">2</span><span class="text-sm">Rescue partner claims it &mdash; and a second claim is refused</span></div>
  <div class="flex items-baseline rounded-lg border px-5 py-3" style="border-color:#0000001a;background:#ffffff"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.2rem">3</span><span class="text-sm">Pickup verified by OTP / QR &mdash; status tracked to handover</span></div>
  <div class="flex items-baseline rounded-lg border px-5 py-3" style="border-color:#0000001a;background:#ffffff"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.2rem">4</span><span class="text-sm">Notification arrives &mdash; email + in-app feed</span></div>
  <div class="flex items-baseline rounded-lg border px-5 py-3" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.2rem">5</span><span class="text-sm">The pipeline &mdash; a green PR, SARIF findings, a promotion</span></div>
</div>

</div>

<!--
DEMO SCRIPT

Narrate the running system, don't read this list. Drive the core loop on
qa: donor posts, the listing shows up live in the partner's feed. Partner
claims it - then try to claim from the second browser and show the refusal.
That refusal is the idempotency and unique-index work from section 4 doing
its job in front of them; call that back explicitly.

Then verify pickup with the OTP or QR code and show the status advance, and
show the notification landing both as email and in the in-app feed - that's
the pub/sub path.

Finish on the pipeline: open a real pull request, show a green check, show
the SARIF security findings attached to the PR, and show a promotion. Tie
it back - this is the same pipeline every one of our changes went through.
Keep a screen recording ready as a fallback if the network misbehaves.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-4xl font-extrabold leading-tight px-16">
Correct where it counts.<br/>
<span class="accent">Automated</span> everywhere else.
</div>

<div class="text-base mt-10" style="color:#00000099">
Thank you &mdash; questions welcome.
</div>

<div class="text-sm mt-12 dgm-wide" style="color:#00000066">
RescuFood &middot; NUS-ISS Team 1
</div>

<!--
CLOSE

Land the two ideas the deck was built around. Where correctness mattered -
the claim - we pushed the invariant down into the database and designed the
retry behaviour deliberately. Everywhere else, we automated: one route into
each environment, security on every change, versioned releases. Then open
the floor. If Q&A time was folded into sections, invite any remaining
questions here.
-->
