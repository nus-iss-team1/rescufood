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

<div class="text-8xl font-bold leading-none" style="letter-spacing:-0.04em">
<span class="relative inline-block" style="padding-right:0.78em">
Rescu<span class="accent">Food</span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="accent" style="position:absolute;top:-0.22em;right:0;width:0.78em;height:0.78em;transform:rotate(18deg)"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
</span>
</div>

<div class="text-base mt-10" style="color:#00000099">
Discover, claim and hand over surplus food before it is thrown away.
</div>

<div class="text-sm mt-16 dgm-wide" style="color:#00000066">
SWE5006 &middot; NUS-ISS Team 1
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

# Contents

<div class="mt-10 mx-auto" style="max-width:40rem">

<div class="flex items-baseline"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">01</span><span class="text-lg">Overview</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">02</span><span class="text-lg">Project conduct</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">03</span><span class="text-lg">Analysis &amp; design</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">04</span><span class="text-lg">Design patterns</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">05</span><span class="text-lg">DevSecOps</span></div>
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
<span class="accent">Overview</span>
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
  <div class="rounded-lg border px-4 py-3 text-sm" style="border-color:#1f6b45;background:rgba(31,107,69,0.06)">Pickup verified by OTP, tracked to handover</div>
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
    <div class="text-xs mt-1" style="color:#00000099">OTP-verified handover; email + in-app notifications.</div>
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
OTP-verified handover, plus email and in-app notifications.

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
Project <span class="accent">conduct</span>
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
class: flex flex-col
---

# Physical architecture

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1200 530" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="aws-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="aws-arr-m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>

  <text x="50" y="32" text-anchor="middle" style="font-size:12px;font-weight:700" fill="#111111">Users</text>
  <line x1="78" y1="28" x2="146" y2="28" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>
  <text x="113" y="18" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">HTTPS</text>
  <rect x="150" y="8" width="140" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <text x="220" y="25" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">API Gateway</text>
  <text x="220" y="40" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">public HTTP API &middot; TLS</text>
  <path d="M 290 28 L 787 28 L 787 73" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>

  <rect x="20" y="65" width="345" height="455" rx="8" stroke="#00000033" stroke-dasharray="5 4"/>
  <text x="35" y="85" style="font-size:10px;font-weight:700" fill="#3a3a3a">AWS managed services</text>

  <rect x="35" y="95" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="116" style="font-size:11px;font-weight:600" fill="#111111">CloudFront + S3 (private)</text>
  <text x="50" y="133" style="font-size:9px" fill="#5a5a5a" class="font-mono">listing images &middot; OAC &middot; SSE</text>

  <rect x="35" y="163" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="184" style="font-size:11px;font-weight:600" fill="#111111">Cognito user pool</text>
  <text x="50" y="201" style="font-size:9px" fill="#5a5a5a" class="font-mono">OIDC &middot; donor, rescue partner, admin</text>

  <rect x="35" y="231" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="252" style="font-size:11px;font-weight:600" fill="#111111">SQS + dead-letter queue</text>
  <text x="50" y="269" style="font-size:9px" fill="#5a5a5a" class="font-mono">notification events &middot; SSE</text>

  <rect x="35" y="299" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="320" style="font-size:11px;font-weight:600" fill="#111111">Secrets Manager</text>
  <text x="50" y="337" style="font-size:9px" fill="#5a5a5a" class="font-mono">app, DB and registry secrets</text>

  <rect x="35" y="367" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="388" style="font-size:11px;font-weight:600" fill="#111111">CloudWatch</text>
  <text x="50" y="405" style="font-size:9px" fill="#5a5a5a" class="font-mono">container logs &middot; 30-day retention</text>

  <rect x="35" y="435" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="50" y="456" style="font-size:11px;font-weight:600" fill="#111111">GHCR</text>
  <text x="50" y="473" style="font-size:9px" fill="#5a5a5a" class="font-mono">container images, pulled via NAT</text>

  <text x="35" y="508" style="font-size:9px" fill="#5a5a5a" class="font-mono">Gmail SMTP :587 &middot; outbound email (external)</text>

  <path d="M 345 121 L 358 121 L 358 320 L 410 320" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>
  <path d="M 345 189 L 368 189 L 368 335 L 410 335" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>
  <path d="M 345 257 L 378 257 L 378 350 L 410 350" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>

  <rect x="390" y="65" width="795" height="455" rx="8" stroke="#00000033"/>
  <text x="405" y="86" style="font-size:10px;font-weight:700" fill="#3a3a3a">VPC 10.0.0.0/16 <tspan style="font-weight:400" fill="#5a5a5a">&middot; two availability zones</tspan></text>

  <rect x="727" y="75" width="120" height="32" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <text x="787" y="95" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">VPC Link</text>

  <rect x="405" y="122" width="765" height="74" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="417" y="138" style="font-size:10px;font-weight:600" fill="#3a3a3a">Public subnets</text>
  <text x="1158" y="138" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B</text>
  <rect x="430" y="146" width="140" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="500" y="173" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internet Gateway</text>
  <rect x="950" y="146" width="170" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="1035" y="164" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">NAT Gateway</text>
  <text x="1035" y="180" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">single &middot; AZ A &middot; egress</text>

  <rect x="405" y="208" width="765" height="192" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="417" y="224" style="font-size:10px;font-weight:600" fill="#3a3a3a">App subnets</text>
  <text x="1158" y="224" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B</text>

  <path d="M 787 107 L 787 228" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>
  <rect x="687" y="230" width="200" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <text x="787" y="246" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internal ALB</text>
  <text x="787" y="261" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">path routing</text>

  <rect x="412" y="282" width="750" height="108" rx="6" fill="rgba(31,107,69,0.05)" stroke="rgba(31,107,69,0.3)"/>
  <text x="422" y="384" style="font-size:9px" fill="#5a5a5a" class="font-mono">ECS cluster &middot; Fargate</text>

  <path d="M 787 270 L 787 276 L 505 276 L 505 294" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 693 276 L 693 294" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 881 276 L 881 294" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 1069 276 L 1069 294" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>

  <rect x="420" y="296" width="170" height="72" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="505" y="326" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">web-platform</text>
  <text x="505" y="346" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a" class="font-mono">/</text>

  <rect x="608" y="296" width="170" height="72" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="693" y="326" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">profile</text>
  <text x="693" y="346" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a" class="font-mono">/api/profile</text>

  <rect x="796" y="296" width="170" height="72" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="881" y="326" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">listings</text>
  <text x="881" y="346" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a" class="font-mono">/api/listings &middot; /api/requests</text>

  <rect x="984" y="296" width="170" height="72" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <text x="1069" y="326" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">notification</text>
  <text x="1069" y="346" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a" class="font-mono">/api/notifications</text>

  <rect x="405" y="412" width="765" height="100" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="417" y="428" style="font-size:10px;font-weight:600" fill="#3a3a3a">Data subnets</text>
  <text x="1158" y="428" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B &middot; isolated, no internet route</text>

  <path d="M 693 368 L 693 401 L 1069 401 L 1069 368" stroke="#8a8a8a" stroke-width="1.2"/>
  <path d="M 881 368 L 881 401" stroke="#8a8a8a" stroke-width="1.2"/>
  <path d="M 787 401 L 787 434" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#aws-arr-m)"/>

  <rect x="700" y="438" width="174" height="60" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <text x="787" y="463" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">RDS PostgreSQL 17</text>
  <text x="787" y="481" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">Multi-AZ &middot; encrypted</text>
</svg>
</div>

<!--
PHYSICAL ARCHITECTURE (NATIVE)

Same deployment view as the previous slide, redrawn in the deck's own
style so it stays crisp at any zoom. Walk the green path left to right:
users hit API Gateway over TLS, a VPC Link crosses into the VPC, the
internal ALB path-routes to the four Fargate services, and the backend
services talk to RDS on 5432 in the isolated data subnets.

The left column is everything managed: CloudFront fronting the private
images bucket, Cognito for identity, SQS with a DLQ for notifications,
Secrets Manager, CloudWatch and GHCR. The single NAT gateway in AZ A is
the honest cost trade-off to call out.
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
Design <span class="accent">patterns</span>
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
<span class="accent">DevSecOps</span>
</div>

<!--
SECTION MARKER
-->

---
class: flex flex-col
---

# Branching strategy

<div class="text-base mt-2" style="color:#00000099">Environment branching (GitLab Flow), with Git Flow-style hotfixes</div>

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center">

<div class="flex justify-center">
<svg viewBox="0 0 880 258" style="width:100%;max-width:52rem" fill="none">
  <g>
    <text x="115" y="44" text-anchor="end" style="font-size:14px;font-weight:700" fill="#1f6b45">main</text>
    <path d="M 660 105 C 676 105 692 40 710 40" stroke="#1f6b45" stroke-width="2"/>
    <line x1="710" y1="40" x2="845" y2="40" stroke="#1f6b45" stroke-width="3"/>
    <circle cx="710" cy="40" r="5.5" fill="#1f6b45"/>
    <rect x="682" y="4" width="56" height="20" rx="10" fill="rgba(31,107,69,0.08)" stroke="#1f6b45"/>
    <text x="710" y="18" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#1f6b45" class="font-mono">v1.4.2</text>
    <text x="845" y="26" text-anchor="end" style="font-size:11px" fill="#5a5a5a" class="font-mono">rescufood.com</text>
  </g>
  <g>
    <text x="115" y="109" text-anchor="end" style="font-size:14px;font-weight:600" fill="#1f6b45">qa</text>
    <path d="M 520 170 C 538 170 542 105 560 105" stroke="#1f6b45" stroke-width="2"/>
    <path d="M 620 170 C 638 170 642 105 660 105" stroke="#1f6b45" stroke-width="2"/>
    <line x1="560" y1="105" x2="845" y2="105" stroke="#1f6b45" stroke-width="2"/>
    <circle cx="560" cy="105" r="5" fill="#ffffff" stroke="#1f6b45" stroke-width="2"/>
    <circle cx="660" cy="105" r="5" fill="#ffffff" stroke="#1f6b45" stroke-width="2"/>
    <text x="845" y="91" text-anchor="end" style="font-size:11px" fill="#5a5a5a" class="font-mono">qa.rescufood.com</text>
  </g>
  <g>
    <text x="115" y="174" text-anchor="end" style="font-size:14px;font-weight:600" fill="#111111">develop</text>
    <line x1="125" y1="170" x2="845" y2="170" stroke="#111111" stroke-width="2"/>
    <circle cx="150" cy="170" r="5" fill="#111111"/>
    <circle cx="270" cy="170" r="5" fill="#111111"/>
    <circle cx="330" cy="170" r="5" fill="#111111"/>
    <circle cx="450" cy="170" r="5" fill="#111111"/>
    <circle cx="520" cy="170" r="5" fill="#111111"/>
    <circle cx="620" cy="170" r="5" fill="#111111"/>
    <text x="845" y="156" text-anchor="end" style="font-size:11px" fill="#5a5a5a" class="font-mono">dev.rescufood.com</text>
  </g>
  <g>
    <path d="M 150 170 C 162 170 162 225 178 225 L 245 225 C 258 225 258 170 270 170" stroke="#8a8a8a" stroke-width="1.5"/>
    <circle cx="200" cy="225" r="4" fill="#8a8a8a"/>
    <circle cx="232" cy="225" r="4" fill="#8a8a8a"/>
    <text x="210" y="248" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">feat/*</text>
    <path d="M 330 170 C 342 170 342 225 358 225 L 425 225 C 438 225 438 170 450 170" stroke="#8a8a8a" stroke-width="1.5"/>
    <circle cx="380" cy="225" r="4" fill="#8a8a8a"/>
    <circle cx="412" cy="225" r="4" fill="#8a8a8a"/>
    <text x="392" y="248" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">fix/*</text>
  </g>
</svg>
</div>

</div>

<!--
We are adopting Gitflow with Environment branching as our branching strategy. Basically, each environment corresponds to a specific deployment stage (develop for dev, qa for testing, and main for production), where every merge or promotion moves features upward through pull requests, and releases are tagged automatically for easy rollbacks."

Additionally, we adhere to strict semantic versioning across all components to ensure seamless dependency management and predictable upgrades.
-->

---
class: flex flex-col
---

# Handling Production Hotfixes

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center">

<div class="flex justify-center">
<svg viewBox="0 0 880 235" style="width:100%;max-width:52rem" fill="none">
  <g>
    <text x="115" y="44" text-anchor="end" style="font-size:14px;font-weight:700" fill="#1f6b45">main</text>
    <line x1="125" y1="40" x2="845" y2="40" stroke="#1f6b45" stroke-width="3"/>
    <circle cx="210" cy="40" r="5.5" fill="#1f6b45"/>
    <rect x="182" y="4" width="56" height="20" rx="10" fill="rgba(31,107,69,0.08)" stroke="#1f6b45"/>
    <text x="210" y="18" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#1f6b45" class="font-mono">v1.4.2</text>
    <text x="125" y="72" text-anchor="start" style="font-size:11px" fill="#5a5a5a">bug reported on prod</text>
    <text x="115" y="154" text-anchor="end" style="font-size:14px;font-weight:600" fill="#1f6b45">qa</text>
    <line x1="125" y1="150" x2="845" y2="150" stroke="#1f6b45" stroke-width="2"/>
    <text x="115" y="209" text-anchor="end" style="font-size:14px;font-weight:600" fill="#111111">develop</text>
    <line x1="125" y1="205" x2="845" y2="205" stroke="#111111" stroke-width="2"/>
  </g>
  <g>
    <path d="M 210 40 C 222 40 222 95 238 95 L 310 95 C 323 95 323 40 335 40" stroke="#1f6b45" stroke-width="2.5"/>
    <circle cx="262" cy="95" r="5.5" fill="#1f6b45"/>
    <circle cx="292" cy="95" r="5.5" fill="#1f6b45"/>
    <text x="277" y="124" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#1f6b45" class="font-mono">hotfix/*</text>
    <circle cx="335" cy="40" r="6.5" fill="#1f6b45"/>
    <rect x="305" y="2" width="60" height="22" rx="11" fill="#1f6b45"/>
    <text x="335" y="17" text-anchor="middle" style="font-size:11px;font-weight:700" fill="#ffffff" class="font-mono">v1.4.3</text>
  </g>
  <g>
    <path d="M 335 40 C 420 40 440 205 525 205" stroke="#1f6b45" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="525" cy="205" r="5.5" fill="#1f6b45"/>
    <text x="545" y="178" text-anchor="start" style="font-size:12px;font-weight:600" fill="#1f6b45">rebased into develop</text>
  </g>
</svg>
</div>

</div>

<!--
Production bugs are handled by cutting a hotfix branch directly from main and merging back via PR. To prevent drift between environments, we immediately backport the fix by rebasing develop onto main once resolved. This ensure that developers dont encounter merge conflicts when merging develop back to main in future.
-->

---
class: flex flex-col
---

# CI/CD pipeline

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1200 500" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <g id="wf-check">
      <circle r="10" fill="#1f6b45"/>
      <path d="M -4 0.5 L -1.2 3.6 L 4.2 -3" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <marker id="wf-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>

  <rect x="30" y="40" width="360" height="440" rx="10" fill="#00000005" stroke="#0000001a"/>
  <text x="48" y="70" style="font-size:11px;font-weight:700" fill="#3a3a3a">on: pull request</text>

  <rect x="50" y="100" width="320" height="118" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="86" y="142"/>
  <text x="108" y="147" style="font-size:13.5px;font-weight:600" fill="#111111">Lint + type-check</text>
  <use href="#wf-check" x="86" y="187"/>
  <text x="108" y="192" style="font-size:13.5px;font-weight:600" fill="#111111">Unit tests</text>

  <rect x="50" y="250" width="320" height="168" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="86" y="290"/>
  <text x="108" y="295" style="font-size:13.5px;font-weight:600" fill="#111111">SAST / CodeQL</text>
  <use href="#wf-check" x="86" y="340"/>
  <text x="108" y="345" style="font-size:13.5px;font-weight:600" fill="#111111">SAST / Semgrep</text>
  <use href="#wf-check" x="86" y="390"/>
  <text x="108" y="395" style="font-size:13.5px;font-weight:600" fill="#111111">SAST / Trivy</text>

  <rect x="430" y="40" width="750" height="440" rx="10" fill="#00000005" stroke="#0000001a"/>
  <text x="448" y="70" style="font-size:11px;font-weight:700" fill="#3a3a3a">on: push &middot; develop, qa or main</text>

  <circle cx="374" cy="159" r="4.5" fill="#8a8a8a"/>
  <circle cx="374" cy="334" r="4.5" fill="#8a8a8a"/>
  <path d="M 378 159 C 400 159 400 256 410 256" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 378 334 C 400 334 400 256 410 256" stroke="#8a8a8a" stroke-width="1.5"/>
  <circle cx="414" cy="256" r="4.5" fill="#8a8a8a"/>
  <line x1="418" y1="256" x2="438" y2="256" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#wf-arr)"/>
  <text x="394" y="240" style="font-size:10px" fill="#5a5a5a" class="font-mono">merge</text>

  <rect x="450" y="218" width="160" height="76" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="478" y="256"/>
  <text x="498" y="261" style="font-size:13px;font-weight:600" fill="#111111">SAST</text>
  <text x="596" y="261" text-anchor="end" style="font-size:11px" fill="#5a5a5a" class="font-mono">3 jobs</text>

  <circle cx="616" cy="256" r="4.5" fill="#8a8a8a"/>
  <circle cx="631" cy="256" r="4.5" fill="#8a8a8a"/>

  <rect x="637" y="218" width="160" height="76" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="665" y="256"/>
  <text x="685" y="261" style="font-size:13px;font-weight:600" fill="#111111">build-and-push</text>

  <circle cx="803" cy="256" r="4.5" fill="#8a8a8a"/>
  <circle cx="818" cy="256" r="4.5" fill="#8a8a8a"/>

  <rect x="824" y="218" width="160" height="76" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="852" y="256"/>
  <text x="872" y="261" style="font-size:13px;font-weight:600" fill="#111111">Deploy to ECS</text>

  <circle cx="990" cy="256" r="4.5" fill="#8a8a8a"/>
  <circle cx="1005" cy="256" r="4.5" fill="#8a8a8a"/>

  <rect x="1011" y="218" width="160" height="76" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <use href="#wf-check" x="1039" y="256"/>
  <text x="1059" y="261" style="font-size:13px;font-weight:600" fill="#111111">DAST / ZAP</text>

  <path d="M 904 294 L 904 372" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="904" cy="376" r="4.5" fill="#8a8a8a"/>
  <rect x="824" y="380" width="160" height="76" rx="12" fill="#ffffff" stroke="#0000002a" stroke-dasharray="4 3"/>
  <text x="844" y="423" style="font-size:13px;font-weight:600" fill="#5a5a5a">End-to-End Tests</text>
</svg>
</div>

<!--
Our CI/CD starts with the following,

On every pull request we lint, type-check and unit test, then run three
SAST scanners, each covering a different class of problem:

- CodeQL: Checks code semantics
- Semgrep: fast pattern matching against the default and secrets
  rulesets plus stack-specific ones. It catches insecure coding idioms
  and hardcoded credentials or API keys.
- Trivy: Scans for known CVEs in
  dependencies, leaked secrets in files, and misconfigurations in
  Dockerfiles and infrastructure code.

Nothing merges without review and green checks. On merge, the push
workflow re-runs SAST, builds and pushes the image to GHCR, rolls the
ECS service for that branch's environment, then ZAP scans the deployed
site and the Playwright e2e suite smoke-tests dev and qa.
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
class: flex flex-col
---

# What we'll show

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1200 320" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="demo-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
  </defs>

  <text x="130" y="86" text-anchor="middle" style="font-size:11px;font-weight:600;letter-spacing:0.1em" fill="#1f6b45" class="font-mono">01</text>
  <circle cx="130" cy="150" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(108.4,128.4) scale(1.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </g>
  <text x="130" y="240" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Post a listing</text>
  <text x="130" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">live in the browse feed</text>

  <line x1="186" y1="150" x2="305" y2="150" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#demo-arr)"/>

  <text x="365" y="86" text-anchor="middle" style="font-size:11px;font-weight:600;letter-spacing:0.1em" fill="#1f6b45" class="font-mono">02</text>
  <circle cx="365" cy="150" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(343.4,128.4) scale(1.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>
  </g>
  <text x="365" y="240" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Claim it</text>
  <text x="365" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">a second claim is refused</text>

  <line x1="421" y1="150" x2="540" y2="150" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#demo-arr)"/>

  <text x="600" y="86" text-anchor="middle" style="font-size:11px;font-weight:600;letter-spacing:0.1em" fill="#1f6b45" class="font-mono">03</text>
  <circle cx="600" cy="150" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(578.4,128.4) scale(1.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M7 12h.01"/><path d="M12 12h.01"/><path d="M17 12h.01"/>
  </g>
  <text x="600" y="240" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Verify pickup</text>
  <text x="600" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">OTP to handover</text>

  <line x1="656" y1="150" x2="775" y2="150" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#demo-arr)"/>

  <text x="835" y="86" text-anchor="middle" style="font-size:11px;font-weight:600;letter-spacing:0.1em" fill="#1f6b45" class="font-mono">04</text>
  <circle cx="835" cy="150" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(813.4,128.4) scale(1.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </g>
  <text x="835" y="240" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Get notified</text>
  <text x="835" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">email + in-app feed</text>

  <line x1="891" y1="150" x2="1010" y2="150" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#demo-arr)"/>

  <text x="1070" y="86" text-anchor="middle" style="font-size:11px;font-weight:600;letter-spacing:0.1em" fill="#1f6b45" class="font-mono">05</text>
  <circle cx="1070" cy="150" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(1048.4,128.4) scale(1.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="18" r="3"/>
    <circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
    <path d="M6 9v12"/>
  </g>
  <text x="1070" y="240" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">The pipeline</text>
  <text x="1070" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">green PR &middot; SARIF &middot; promotion</text>
</svg>
</div>

<!--
DEMO SCRIPT

Narrate the running system, don't read this list. Drive the core loop on
qa: donor posts, the listing shows up live in the partner's feed. Partner
claims it - then try to claim from the second browser and show the refusal.
That refusal is the idempotency and unique-index work from section 4 doing
its job in front of them; call that back explicitly.

Then verify pickup with the OTP and show the status advance, and
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

<div class="text-6xl font-bold leading-none" style="letter-spacing:-0.04em">
Thank <span class="accent">you</span>
</div>

<div class="text-sm mt-12 dgm-wide" style="color:#00000066">
RescuFood &middot; NUS-ISS Team 1
</div>

<!--
CLOSE

Thank the audience and open the floor. If Q&A time was folded into
sections, invite any remaining questions here.
-->
