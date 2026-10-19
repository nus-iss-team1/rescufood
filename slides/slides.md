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

<div class="flex items-baseline"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">01</span><span class="text-lg">Introduction &amp; project management</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">02</span><span class="text-lg">Analysis, design &amp; patterns</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">03</span><span class="text-lg">Testing</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">04</span><span class="text-lg">CI/CD pipeline demo</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">05</span><span class="text-lg">System demo</span></div>

</div>

<!--
AGENDA

Read the five markers once, quickly. Timings: intro and project
management 3-4, analysis, design and patterns 5, testing 3, pipeline
demo 10-12, system demo 12-15. Both demos have a recorded video as
backup if anything breaks live. Then move.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 01</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
<span class="accent">Introduction</span>
</div>

<!--
SECTION MARKER

Say the title and move on. Marker, not a slide to talk over.
-->

---
class: flex flex-col justify-center text-center
---

<div class="text-6xl font-extrabold leading-tight px-12">
Surplus food is a <span class="accent">coordination</span> problem.
</div>

<div class="text-lg mt-12 mx-auto" style="max-width:42rem;color:#00000099">
There is no formal channel to move excess food to rescue partners before it expires. Today it is coordinated over phone calls, chat groups and spreadsheets.
</div>

<!--
THE PROBLEM

Surplus food is time-sensitive. A tray of bread is useful for a few hours,
then it's waste. The blocker is never goodwill - it's coordination. Donors
and rescue partners today rely on calls, chat groups and spreadsheets,
which means two partners show up for the same tray, or nobody shows up.
Hold on the three failure modes at the bottom; the next slide shows what
we replace them with.
-->

---
class: flex flex-col
---

# With RescuFood

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center" class="px-6">

<div class="grid grid-cols-2 gap-16 mx-auto" style="max-width:54rem;width:100%">
  <div>
    <div class="dgm text-xs" style="color:#00000066">Today</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base" style="color:#00000099">Calling around hoping someone can take the food</div>
      <div class="text-base" style="color:#00000099">WhatsApp groups nobody keeps up with</div>
      <div class="text-base" style="color:#00000099">Spreadsheets that are already out of date</div>
    </div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">RescuFood</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base">Donors post a listing the moment food is free</div>
      <div class="text-base">Rescue partners claim it, first come first served</div>
      <div class="text-base">Pickup verified by OTP, tracked to handover</div>
    </div>
  </div>
</div>

</div>

<!--
THE COMPARISON

RescuFood makes the workflow digital and real-time. A donor posts a
listing the instant food becomes available; a rescue partner claims it on
a first-come-first-served basis; and the handover is verified and tracked.
The core promise is on the right: one claim per listing, one source of
truth. Hold that phrase - the whole design defends it.
-->

---
class: flex flex-col
---

# Scope: what we built

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1000 360" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="scope-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
  </defs>

  <circle cx="200" cy="130" r="46" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(177.5,107.5) scale(1.875)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </g>
  <text x="200" y="228" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Identity</text>
  <text x="200" y="252" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">register &middot; org approval</text>

  <line x1="258" y1="130" x2="384" y2="130" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#scope-arr)"/>

  <circle cx="450" cy="130" r="46" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(427.5,107.5) scale(1.875)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </g>
  <text x="450" y="228" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Listings &amp; claims</text>
  <text x="450" y="252" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">post &middot; browse &middot; claim</text>

  <line x1="508" y1="130" x2="634" y2="130" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#scope-arr)"/>

  <circle cx="700" cy="130" r="46" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(677.5,107.5) scale(1.875)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </g>
  <text x="700" y="228" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Pickup &amp; notify</text>
  <text x="700" y="252" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">OTP handover &middot; email + in-app</text>

  <path d="M 758 130 C 820 130 820 130 866 130" stroke="#0000001a" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="912" cy="130" r="46" fill="none" stroke="#0000002a" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="912" y="135" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">out of scope</text>
  <text x="912" y="228" text-anchor="middle" style="font-size:12px;font-weight:600" fill="#5a5a5a">Scale-out</text>
  <text x="912" y="252" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">proof of concept</text>

  <text x="500" y="330" text-anchor="middle" style="font-size:12px" fill="#5a5a5a" class="font-mono">design goals: robust &middot; maintainable &middot; extensible &middot; secure by default</text>
</svg>
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
class: flex flex-col
---

# Agile, in practice

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1100 300" style="max-height:100%;max-width:100%" fill="none">
  <line x1="60" y1="180" x2="1040" y2="180" stroke="#1f6b45" stroke-width="2"/>

  <circle cx="110" cy="180" r="6" fill="#1f6b45"/>
  <text x="110" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">CI/CD foundation</text>
  <text x="110" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">repo &middot; auth UI</text>
  <text x="110" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 1</text>
  <text x="110" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">24 Jul - 7 Aug</text>

  <circle cx="290" cy="180" r="6" fill="#1f6b45"/>
  <text x="290" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 2</text>
  <text x="290" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">8 - 21 Aug</text>
  <text x="290" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Environments &middot; IAM</text>
  <text x="290" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">first automated QA</text>

  <circle cx="470" cy="180" r="6" fill="#1f6b45"/>
  <text x="470" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">Claims &middot; pickup OTP</text>
  <text x="470" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">notifications</text>
  <text x="470" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 3</text>
  <text x="470" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">22 Aug - 4 Sep</text>

  <circle cx="650" cy="180" r="6" fill="#1f6b45"/>
  <text x="650" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 4</text>
  <text x="650" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">5 - 18 Sep</text>
  <text x="650" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Pickup completion</text>
  <text x="650" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">QA fixes</text>

  <circle cx="830" cy="180" r="6" fill="#1f6b45"/>
  <text x="830" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">Cancel &amp; relist</text>
  <text x="830" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">claim history</text>
  <text x="830" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 5</text>
  <text x="830" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">19 Sep - 2 Oct</text>

  <circle cx="1010" cy="180" r="6" fill="#1f6b45"/>
  <text x="1010" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 6</text>
  <text x="1010" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">3 - 16 Oct</text>
  <text x="1010" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Stabilisation</text>
  <text x="1010" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">report &amp; polish</text>

</svg>
</div>

<div class="mx-auto mb-4" style="max-width:40rem">
  <div class="flex items-baseline">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">Scrum, six two-week sprints; every change lands by pull request with CI</span>
  </div>
  <div class="flex items-baseline mt-2">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">Sprint 2 closed <span class="font-semibold">36/36</span> points, Sprint 3 <span class="font-semibold">32/40</span></span>
  </div>
  <div class="flex items-baseline mt-2">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">One retro change carried forward each sprint</span>
  </div>
</div>

<!--
AGILE PRACTICE

We ran Scrum over six two-week sprints - each starts from the backlog, gets
a sprint plan, and closes with a review and a retrospective. The fortnightly
progress reports ISS asked for fell straight out of that rhythm; we didn't
write them separately.

The engineering side of "essential practices for agile teams": tests written alongside features, every change through a pull
request and review, and CI on every one of those PRs. Nothing reaches a
branch without going green first. If asked about TDD: we didn't practise
formal red-green-refactor; tests were written with or after the code, and
we say so in the report too.

The numbers are real velocity from our burndowns - Sprint 2 closed 36 of 36
points, Sprint 3 closed 32 of 40, about 80%. We're being honest that not
every sprint hit 100%; the shortfall in Sprint 3 was the CDN and API Gateway
migration running long, and it carried into the next sprint.

The green tile is our retrospective format. The point isn't the three
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

<div class="text-xs dgm-wide" style="color:#00000066">Section 02</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Analysis &amp; <span class="accent">Design</span>
</div>

<!--
SECTION MARKER
-->

---

# The system, from the top

<div class="mt-6 px-4">

<div class="flex items-center justify-center" style="gap:0.6rem">
  <div class="rounded-lg border px-4 text-center flex flex-col justify-center" style="border-color:#0000001a;background:#ffffff;width:11rem;height:4.4rem">
    <div class="text-sm font-semibold">Platform web</div>
    <div class="text-xs mt-0.5" style="color:#00000099">Next.js &middot; donors &amp; partners</div>
  </div>
  <div class="rounded-lg border px-4 text-center flex flex-col justify-center" style="border-color:#0000001a;background:#ffffff;width:11rem;height:4.4rem">
    <div class="text-sm font-semibold">Admin console</div>
    <div class="text-xs mt-0.5" style="color:#00000099">React SPA &middot; local only</div>
  </div>
</div>

<div class="text-center mt-2" style="color:#00000066">&darr;&nbsp;&nbsp;HTTPS / JSON&nbsp;&nbsp;&darr;</div>

<div class="flex items-center justify-center mt-1" style="gap:0.6rem">
  <div class="rounded-lg border px-4 text-center text-xs font-medium flex items-center justify-center" style="border-color:#0000001a;background:#f2f0ed;width:23rem;height:2.4rem;color:#3a3a3a">CDN &middot; API Gateway &nbsp;<span style="color:#5a5a5a">(hardened ingress, Sprint 3)</span></div>
</div>

<div class="text-center my-1" style="color:#00000066">&darr;</div>

<div class="flex items-center justify-center" style="gap:0.6rem">
  <div class="rounded-lg border px-4 text-center flex flex-col justify-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem;height:4.4rem">
    <div class="text-sm font-semibold">Profile</div>
    <div class="text-xs mt-0.5" style="color:#00000099">Go &middot; identity &amp; orgs</div>
  </div>
  <div class="rounded-lg border px-4 text-center flex flex-col justify-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem;height:4.4rem">
    <div class="text-sm font-semibold">Listings</div>
    <div class="text-xs mt-0.5" style="color:#00000099">NestJS &middot; listings &amp; claims</div>
  </div>
  <div class="rounded-lg border px-4 text-center flex flex-col justify-center" style="border-color:#1f6b45;background:rgba(31,107,69,0.06);width:11rem;height:4.4rem">
    <div class="text-sm font-semibold">Notifications</div>
    <div class="text-xs mt-0.5" style="color:#00000099">NestJS &middot; queue consumer</div>
  </div>
</div>

<div class="flex items-center justify-center mt-2" style="gap:0.6rem">
  <div class="text-center" style="width:11rem"></div>
  <div class="text-center" style="width:11rem"><span style="color:#00000066">&rarr; SQS &rarr;</span></div>
  <div class="text-center" style="width:11rem"></div>
</div>

<div class="flex items-center justify-center mt-1" style="gap:0.6rem">
  <div class="rounded-lg border px-4 text-center text-xs font-mono flex items-center justify-center" style="border-color:#0000001a;background:#f2f0ed;width:23rem;height:2.4rem;color:#00000099">PostgreSQL (per service)</div>
  <div class="rounded-lg border px-4 text-center text-xs font-mono flex items-center justify-center" style="border-color:#0000001a;background:#f2f0ed;width:11rem;height:2.4rem;color:#00000099">AWS ECS Fargate</div>
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
  <rect x="150" y="8" width="156" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/api-gateway.png" x="157" y="13" width="30" height="30"/>
  <text x="246" y="32" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">API Gateway</text>
  <path d="M 290 28 L 787 28 L 787 73" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>

  <rect x="20" y="65" width="345" height="455" rx="8" stroke="#00000033" stroke-dasharray="5 4"/>
  <text x="35" y="85" style="font-size:10px;font-weight:700" fill="#3a3a3a">AWS managed services</text>

  <rect x="35" y="95" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cloudfront.png" x="48" y="105" width="32" height="32"/>
  <image href="/aws/s3.png" x="297" y="105" width="32" height="32"/>
  <text x="94" y="116" style="font-size:11px;font-weight:600" fill="#111111">CloudFront + S3 (private)</text>
  <text x="94" y="133" style="font-size:9px" fill="#5a5a5a" class="font-mono">listing images &middot; OAC &middot; SSE</text>

  <rect x="35" y="163" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cognito.png" x="48" y="173" width="32" height="32"/>
  <text x="94" y="184" style="font-size:11px;font-weight:600" fill="#111111">Cognito user pool</text>
  <text x="94" y="201" style="font-size:9px" fill="#5a5a5a" class="font-mono">OIDC &middot; donor, rescue partner, admin</text>

  <rect x="35" y="231" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/sqs.png" x="48" y="241" width="32" height="32"/>
  <text x="94" y="252" style="font-size:11px;font-weight:600" fill="#111111">SQS + dead-letter queue</text>
  <text x="94" y="269" style="font-size:9px" fill="#5a5a5a" class="font-mono">notification events &middot; SSE</text>

  <rect x="35" y="299" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/secrets-manager.png" x="48" y="309" width="32" height="32"/>
  <text x="94" y="320" style="font-size:11px;font-weight:600" fill="#111111">Secrets Manager</text>
  <text x="94" y="337" style="font-size:9px" fill="#5a5a5a" class="font-mono">app, DB and registry secrets</text>

  <rect x="35" y="367" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cloudwatch.png" x="48" y="377" width="32" height="32"/>
  <text x="94" y="388" style="font-size:11px;font-weight:600" fill="#111111">CloudWatch</text>
  <text x="94" y="405" style="font-size:9px" fill="#5a5a5a" class="font-mono">container logs &middot; 30-day retention</text>

  <rect x="35" y="435" width="310" height="52" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/github.svg" x="50" y="447" width="28" height="28"/>
  <text x="94" y="456" style="font-size:11px;font-weight:600" fill="#111111">GHCR</text>
  <text x="94" y="473" style="font-size:9px" fill="#5a5a5a" class="font-mono">container images, pulled via NAT</text>

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
  <rect x="430" y="146" width="164" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/internet-gateway.png" x="438" y="153" width="30" height="30"/>
  <text x="533" y="173" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internet Gateway</text>
  <rect x="950" y="146" width="170" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/nat-gateway.png" x="958" y="153" width="30" height="30"/>
  <text x="1056" y="164" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">NAT Gateway</text>
  <text x="1056" y="180" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">single &middot; AZ A &middot; egress</text>

  <rect x="405" y="208" width="765" height="192" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="417" y="224" style="font-size:10px;font-weight:600" fill="#3a3a3a">App subnets</text>
  <text x="1158" y="224" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B</text>

  <path d="M 787 107 L 787 228" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>
  <rect x="687" y="230" width="200" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/alb.png" x="694" y="235" width="30" height="30"/>
  <text x="805" y="246" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internal ALB</text>
  <text x="805" y="261" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">path routing</text>

  <rect x="412" y="282" width="750" height="108" rx="6" fill="rgba(31,107,69,0.05)" stroke="rgba(31,107,69,0.3)"/>
  <image href="/aws/ecs.png" x="422" y="360" width="24" height="24"/>
  <image href="/aws/fargate.png" x="450" y="360" width="24" height="24"/>
  <text x="480" y="376" style="font-size:9px" fill="#5a5a5a" class="font-mono">ECS cluster &middot; Fargate</text>

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
  <image href="/aws/rds.png" x="708" y="451" width="34" height="34"/>
  <text x="808" y="463" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">RDS PostgreSQL 17</text>
  <text x="808" y="481" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">Multi-AZ &middot; encrypted</text>
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
class: flex flex-col
---

# Repository

<div class="text-base mt-2" style="color:#00000099">All database access goes through a repository class</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1000 400" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="pat-r-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
  </defs>

  <rect x="40" y="130" width="250" height="96" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="165" y="174" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">RequestsService</text>
  <text x="165" y="198" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">business rules only</text>

  <line x1="290" y1="178" x2="366" y2="178" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-r-arr)"/>

  <rect x="370" y="130" width="260" height="96" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="500" y="174" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">RequestsRepository</text>
  <text x="500" y="198" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">all the sql lives here</text>

  <line x1="630" y1="178" x2="706" y2="178" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-r-arr)"/>

  <rect x="710" y="130" width="250" height="96" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="835" y="174" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">PostgreSQL</text>
  <text x="835" y="198" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">schema per service</text>

  <text x="500" y="290" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">We can change the SQL without touching the services.</text>

  <rect x="170" y="320" width="200" height="32" rx="16" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="270" y="340" text-anchor="middle" style="font-size:10px" fill="#1f6b45" class="font-mono">listings &middot; 6 repositories</text>
  <rect x="400" y="320" width="200" height="32" rx="16" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="500" y="340" text-anchor="middle" style="font-size:10px" fill="#1f6b45" class="font-mono">notifications &middot; 1</text>
  <rect x="630" y="320" width="200" height="32" rx="16" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="730" y="340" text-anchor="middle" style="font-size:10px" fill="#1f6b45" class="font-mono">profile (Go) &middot; 4</text>
</svg>
</div>

<!--
REPOSITORY

All our SQL lives in repository classes. The services only hold business
logic and call the repositories, so when we change a query or add an
index, nothing outside the repository changes. We use the same structure
in all three backends: listings has 6 repositories, notifications has 1,
and the Go profile service has 4. It also makes integration testing
easy, since we just run the real repositories against a throwaway
Postgres in Docker.
-->

---
class: flex flex-col
---

# Strategy

<div class="text-base mt-2" style="color:#00000099">The app codes against one interface and does not care which client it gets</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1000 400" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="pat-s-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="pat-s-tri" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0.5 0.5 L9.5 5 L0.5 9.5 Z" fill="#ffffff" stroke="#1f6b45"/></marker>
  </defs>

  <rect x="40" y="152" width="280" height="96" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="180" y="196" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">web-platform</text>
  <text x="180" y="220" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">createListingsClient({ mock })</text>

  <line x1="320" y1="200" x2="426" y2="200" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-s-arr)"/>
  <text x="373" y="186" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">factory</text>

  <rect x="430" y="152" width="240" height="96" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="550" y="190" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">ListingsApi</text>
  <text x="550" y="212" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">interface &middot; 16 methods</text>

  <path d="M 736 102 L 706 102 L 706 180 L 678 180" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-s-tri)"/>
  <path d="M 736 298 L 706 298 L 706 220 L 678 220" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-s-tri)"/>
  <text x="716" y="156" style="font-size:10px" fill="#5a5a5a" class="font-mono">implements</text>

  <rect x="736" y="60" width="230" height="84" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="851" y="98" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">ListingsClient</text>
  <text x="851" y="120" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">real HTTP &middot; bearer token</text>

  <rect x="736" y="256" width="230" height="84" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="851" y="294" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">MockListingsClient</text>
  <text x="851" y="316" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">in-memory &middot; same rules</text>

  <text x="500" y="366" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">We built the whole frontend on the mock before the backend was ready.</text>
  <text x="500" y="392" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">also used for: notification renderers &middot; relist policy &middot; org transitions (go)</text>
</svg>
</div>

<!--
STRATEGY

The listings SDK has one interface, ListingsApi, with two
implementations. ListingsClient does the real HTTP calls with the
user's token. MockListingsClient keeps everything in memory but follows
the same rules as the server, same status transitions and even the
idempotency replay. The factory returns the interface, so the app never
knows which one it is holding.

This let us build and demo the frontend before the listings service was
ready, and switching to the real service was literally one boolean.

We use the same idea in a few other places: the notification templates
are a type-to-renderer map, the relist policy is an injected config
object, and the Go service passes Approve, Reject and Suspend in as
functions to one shared transition handler.
-->

---
class: flex flex-col
---

# Publish / subscribe

<div class="text-base mt-2" style="color:#00000099">Listings drops events on SQS, notifications picks them up</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1000 400" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="pat-p-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="pat-p-arr-m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>

  <rect x="40" y="120" width="270" height="100" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="175" y="166" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">listings</text>
  <text x="175" y="190" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">NotificationsPublisher</text>

  <text x="370" y="156" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">publish &middot; eventId</text>
  <line x1="310" y1="170" x2="426" y2="170" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-p-arr)"/>

  <rect x="430" y="120" width="180" height="100" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="520" y="166" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">SQS</text>
  <text x="520" y="190" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">notifications queue</text>

  <text x="670" y="156" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">long poll</text>
  <line x1="610" y1="170" x2="726" y2="170" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#pat-p-arr)"/>

  <rect x="730" y="120" width="270" height="100" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="865" y="166" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">notification</text>
  <text x="865" y="190" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">SqsConsumerService</text>

  <line x1="520" y1="220" x2="520" y2="266" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#pat-p-arr-m)"/>
  <rect x="430" y="270" width="180" height="56" rx="10" fill="#ffffff" stroke="#0000002a" stroke-dasharray="4 3"/>
  <text x="520" y="295" text-anchor="middle" style="font-size:12px;font-weight:600" fill="#5a5a5a">DLQ</text>
  <text x="520" y="313" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">after 5 failures</text>

  <text x="500" y="378" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Neither service knows the other exists.</text>
</svg>
</div>

<!--
PUBLISH / SUBSCRIBE

When a claim is created, cancelled or completed, listings just drops an
event on SQS and moves on. The notification service polls the queue,
renders the templates and sends the email and in-app notification. The
two services don't import each other at all, which is how we added the
whole notification service without touching the claim flow.

Every event has a deterministic eventId and the consumer dedupes on it,
so a redelivered message can't send twice. If a message keeps failing
it goes to a dead letter queue after 5 tries and an alarm fires.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 03</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
<span class="accent">Testing</span>
</div>

<!--
SECTION MARKER

Say the title and move on.
-->

---
class: flex flex-col
---

# Types of testing

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center" class="px-6">

<div class="grid grid-cols-3 gap-12 mx-auto" style="max-width:56rem;width:100%">
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">Unit</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base">Jest for the NestJS services</div>
      <div class="text-base">go test for profile</div>
      <div class="text-base">Frontend logic with fixed clocks</div>
    </div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">Integration</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base">Real PostgreSQL via testcontainers</div>
      <div class="text-base">Each service runs its own migrations</div>
      <div class="text-base">Coverage reported on every PR</div>
    </div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">End-to-end</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base">Playwright against live dev &amp; QA</div>
      <div class="text-base">Full journey, post &rarr; claim &rarr; pickup</div>
      <div class="text-base">Post-deploy smoke check</div>
    </div>
  </div>
</div>

<div class="mt-12 text-center text-sm" style="color:#00000099">
Unit and integration tests gate every PR &middot; e2e never blocks and never touches prod
</div>

</div>

<!--
TYPES OF TESTING

Three levels, each with its own tool. Unit tests run per service: Jest
for the two NestJS services, go test with fakes for profile, and the
frontend mappers and filters get unit tests with a fixed clock so the
results are stable. Integration tests spin up a real PostgreSQL in CI
with testcontainers, run each service's migrations and hit the actual
schema; a combined coverage report lands on every PR. End-to-end is
Playwright against the live dev or QA environment after each deploy,
running the whole journey of posting, claiming, cancelling and
completing pickups, including negative cases like a second claim being
refused.

The gates: unit and integration must be green before a merge. The e2e
suite is a post-deploy smoke check on purpose - it runs after the
environment has already updated, and browser tests can go red for
reasons that are not real regressions, so it reports without blocking.
It never runs on prod because it creates real data.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 04</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
CI/CD <span class="accent">pipeline</span>
</div>

<!--
SECTION MARKER

This segment is a live demo: the next three slides set the context, then
switch to GitHub Actions and walk a real run. Have the recorded video
ready as backup in case the live demo breaks.
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

<div class="text-xs dgm-wide" style="color:#00000066">Section 05</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
System <span class="accent">demo</span>
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
