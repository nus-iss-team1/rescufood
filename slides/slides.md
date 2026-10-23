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
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">02</span><span class="text-lg">Analysis &amp; design</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">03</span><span class="text-lg">Design patterns</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">04</span><span class="text-lg">Testing</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">05</span><span class="text-lg">CI/CD pipeline demo</span></div>
<div class="flex items-baseline mt-4"><span class="dgm text-xs mr-4" style="color:#1f6b45;width:1.5rem">06</span><span class="text-lg">Demo</span></div>

</div>

<!--
AGENDA

Read the six markers once, quickly. Timings: intro and project
management 3-4, analysis and design plus patterns 5 together, testing
3, pipeline demo 10-12, system demo 12-15. Both demos have a recorded video as
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

<div class="mt-6" style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;padding:0.5rem">

<svg viewBox="0 75 1000 200" style="max-width:46rem;width:100%" fill="none">
  <defs>
    <marker id="scope-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="scope-arr-m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>

  <circle cx="110" cy="140" r="48" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(86,116) scale(2)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="110" y="226" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Donor</text>

  <line x1="166" y1="140" x2="424" y2="140" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#scope-arr-g)"/>
  <rect x="206" y="116" width="180" height="48" rx="8" fill="#ffffff" stroke="#1f6b45"/>
  <g transform="translate(214,128) scale(0.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </g>
  <text x="306" y="136" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111">Surplus bread &middot; 40 loaves</text>
  <text x="306" y="152" text-anchor="middle" style="font-size:8.5px" fill="#5a5a5a" class="font-mono">pickup tonight, 6-8pm</text>
  <text x="296" y="184" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">gives away surplus food</text>

  <rect x="430" y="86" width="220" height="108" rx="14" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="533" y="138" text-anchor="middle" style="font-size:20px;font-weight:700;letter-spacing:-0.02em" fill="#111111">Rescu<tspan fill="#1f6b45">Food</tspan></text>
  <g transform="translate(600,116) scale(0.8)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </g>
  <text x="540" y="166" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">listings</text>

  <line x1="650" y1="140" x2="834" y2="140" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#scope-arr-g)"/>
  <text x="742" y="124" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">claims &amp; collects</text>

  <circle cx="890" cy="140" r="48" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(866,116) scale(2)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="890" y="226" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Rescue partner</text>

  <path d="M 858 192 C 760 254 240 254 142 192" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#scope-arr-m)"/>
  <text x="500" y="262" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">they meet for pickup &middot; handover verified</text>
</svg>

<div class="mt-8 grid grid-cols-2 gap-16" style="max-width:46rem;width:100%">
  <div v-click>
    <div class="dgm text-xs" style="color:#00000066">Today</div>
    <div class="mt-4 flex flex-col" style="gap:0.8rem">
      <div class="text-base" style="color:#00000099">Calling around hoping someone can take the food</div>
      <div class="text-base" style="color:#00000099">WhatsApp groups nobody keeps up with</div>
      <div class="text-base" style="color:#00000099">Spreadsheets that are already out of date</div>
    </div>
  </div>
  <div v-click>
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

Scope details if asked: both roles sign up and an admin approves the
organisation before it can transact; handover is verified with an OTP
and tracked; email and in-app notifications fire along the way. This is
a proof of concept, so horizontal scale is out of scope.
-->

---
class: flex flex-col
---

# Timeline

<div class="mt-6" style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;padding:0.5rem">
<svg viewBox="0 85 1100 205" style="max-height:100%;max-width:100%" fill="none">
  <line x1="60" y1="180" x2="1040" y2="180" stroke="#1f6b45" stroke-width="2"/>

  <circle cx="110" cy="180" r="6" fill="#1f6b45"/>
  <text x="110" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">CI/CD foundation</text>
  <text x="110" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">repo &middot; auth UI</text>
  <text x="110" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 1</text>
  <text x="110" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">24 Jul - 7 Aug</text>

  <g v-click>
  <circle cx="290" cy="180" r="6" fill="#1f6b45"/>
  <text x="290" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 2</text>
  <text x="290" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">8 - 21 Aug</text>
  <text x="290" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Environments &middot; IAM</text>
  <text x="290" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">first automated QA</text>
  </g>

  <g v-click>
  <circle cx="470" cy="180" r="6" fill="#1f6b45"/>
  <text x="470" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">Claims &middot; pickup OTP</text>
  <text x="470" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">notifications</text>
  <text x="470" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 3</text>
  <text x="470" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">22 Aug - 4 Sep</text>
  </g>

  <g v-click>
  <circle cx="650" cy="180" r="6" fill="#1f6b45"/>
  <text x="650" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 4</text>
  <text x="650" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">5 - 18 Sep</text>
  <text x="650" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Pickup completion</text>
  <text x="650" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">QA fixes</text>
  </g>

  <g v-click>
  <circle cx="830" cy="180" r="6" fill="#1f6b45"/>
  <text x="830" y="98" text-anchor="middle" style="font-size:13.5px" fill="#111111">Cancel &amp; relist</text>
  <text x="830" y="120" text-anchor="middle" style="font-size:13.5px" fill="#111111">claim history</text>
  <text x="830" y="150" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 5</text>
  <text x="830" y="168" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">19 Sep - 2 Oct</text>
  </g>

  <g v-click>
  <circle cx="1010" cy="180" r="6" fill="#1f6b45"/>
  <text x="1010" y="210" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#1f6b45">Sprint 6</text>
  <text x="1010" y="230" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">3 - 16 Oct</text>
  <text x="1010" y="256" text-anchor="middle" style="font-size:13.5px" fill="#111111">Stabilisation</text>
  <text x="1010" y="280" text-anchor="middle" style="font-size:13.5px" fill="#111111">report &amp; polish</text>
  </g>

</svg>

<div v-click class="mt-8" style="width:100%;padding-left:3.5rem">
  <div class="flex items-baseline">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">Scrum over six two-week sprints; every change went in through a PR with CI</span>
  </div>
  <div class="flex items-baseline mt-2">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">One concrete change from each retro, carried into the next sprint</span>
  </div>
  <div class="flex items-baseline mt-2">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-sm">Team of 7, about 80 hours each: <span class="font-semibold">560 person-hours</span> across web, identity, listings, notifications and infra</span>
  </div>
</div>

</div>

<!--
TIMELINE SCRIPT

We ran the project as six two-week sprints, and each sprint had one
clear objective we rallied around.

Sprint 1 was pure foundation: the repo, the CI/CD skeleton and the
signup and login screens. Sprint 2 was about environments: reproducible
AWS infrastructure, IAM, and our first seven automated QA cases.
Sprint 3 was the big one, the claim: reservations, the pickup OTP and
notifications all landed there. Sprint 4 closed the loop with pickup
completion and a round of QA fixes. Sprint 5 handled the awkward paths,
cancelling and relisting claims, plus claim history. And Sprint 6 was
stabilisation: polishing, fixing what QA surfaced, and this report and
deck.

Throughout all six, every change went in through a pull request with CI
on it. Nothing merged red.

If asked about velocity: most sprints closed their planned points;
Sprint 3 ran at about 80 percent because the CDN and API Gateway
migration took longer than planned.

On effort: there are seven of us at roughly 80 hours each, so about
560 person-hours, split across the web app, identity, listings and
claims, notifications and the infrastructure. Name who owned what if
asked.

And the habit that mattered most: every retro produced exactly one
concrete change we carried into the next sprint. PR automation came out
of Sprint 1's retro, tests-in-CI out of Sprint 2's. That's how the
pipeline you'll see in section 5 got as strict as it is.
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
class: flex flex-col
---

# Microservice

<div style="margin-top:2.5rem;padding:0 0.5rem">
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3rem;max-width:58rem;width:100%">
  <div v-click>
    <svg viewBox="0 0 24 24" style="width:30px;height:30px;display:block" fill="none" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
    <div class="dgm text-xs" style="color:#1f6b45;margin-top:0.9rem;min-height:3.4rem">Polyglot flexibility</div>
    <div style="display:flex;flex-direction:column;gap:0.8rem">
      <div style="font-size:1rem;line-height:1.5">Go and TypeScript, each developer in their core competency</div>
      <div style="font-size:1rem;line-height:1.5">No time to standardise on one language</div>
    </div>
  </div>
  <div v-click>
    <svg viewBox="0 0 24 24" style="width:30px;height:30px;display:block" fill="none" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    <div class="dgm text-xs" style="color:#1f6b45;margin-top:0.9rem;min-height:3.4rem">Team-driven (Conway's Law)</div>
    <div style="display:flex;flex-direction:column;gap:0.8rem">
      <div style="font-size:1rem;line-height:1.5">Day jobs, so we rarely code at the same hours</div>
      <div style="font-size:1rem;line-height:1.5">One service each, so far fewer merge conflicts</div>
    </div>
  </div>
  <div v-click>
    <svg viewBox="0 0 24 24" style="width:30px;height:30px;display:block" fill="none" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/></svg>
    <div class="dgm text-xs" style="color:#1f6b45;margin-top:0.9rem;min-height:3.4rem">Optimised CI/CD</div>
    <div style="display:flex;flex-direction:column;gap:0.8rem">
      <div style="font-size:1rem;line-height:1.5">Each service builds on its own</div>
      <div style="font-size:1rem;line-height:1.5">Smaller, faster runs</div>
    </div>
  </div>
</div>
</div>

<!--
Team-Driven Architecture (Conway's Law): Service boundaries were intentionally mapped to individual developer schedules and ownership, preventing bottlenecks caused by fragmented, asynchronous working hours.

Polyglot Flexibility: Allowed each developer to build within their core competency (Go and TypeScript) without forcing an artificial, uniform language stack.

Optimized CI/CD Pipelines: Decoupled the backend into independent services, enabling faster, isolated build runs and deployments tailored to each specific stack.
-->

---
class: flex flex-col
---

# Use cases

<div class="text-base mt-2" style="color:#00000099">What each role can do</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1100 470" style="max-height:100%;max-width:100%" fill="none">

  <rect x="300" y="40" width="510" height="390" rx="14" stroke="#00000033"/>
  <text x="318" y="64" style="font-size:10px" fill="#5a5a5a" class="font-mono">RescuFood</text>

  <line x1="180" y1="190" x2="326" y2="120" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="184" y1="205" x2="326" y2="205" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="180" y1="220" x2="326" y2="290" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="916" y1="190" x2="784" y2="120" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="916" y1="205" x2="784" y2="205" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="916" y1="220" x2="784" y2="290" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="178" y1="385" x2="323" y2="385" stroke="#8a8a8a" stroke-width="1.3"/>
  <line x1="922" y1="385" x2="787" y2="385" stroke="#8a8a8a" stroke-width="1.3"/>

  <ellipse cx="430" cy="115" rx="100" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="430" y="120" text-anchor="middle" style="font-size:13px" fill="#111111">Post a listing</text>
  <ellipse cx="430" cy="205" rx="100" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="430" y="210" text-anchor="middle" style="font-size:13px" fill="#111111">Cancel a listing</text>
  <ellipse cx="430" cy="295" rx="100" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="430" y="300" text-anchor="middle" style="font-size:13px" fill="#111111">Verify pickup</text>

  <ellipse cx="680" cy="115" rx="100" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="680" y="120" text-anchor="middle" style="font-size:13px" fill="#111111">Browse listings</text>
  <ellipse cx="680" cy="205" rx="100" ry="28" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.6"/>
  <text x="680" y="210" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Claim a listing</text>
  <ellipse cx="680" cy="295" rx="100" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="680" y="300" text-anchor="middle" style="font-size:13px" fill="#111111">Cancel a claim</text>

  <ellipse cx="430" cy="385" rx="105" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="430" y="390" text-anchor="middle" style="font-size:13px" fill="#111111">Register organisation</text>
  <ellipse cx="680" cy="385" rx="105" ry="28" fill="#ffffff" stroke="#0000002a"/>
  <text x="680" y="390" text-anchor="middle" style="font-size:13px" fill="#111111">Approve organisation</text>

  <circle cx="140" cy="205" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(116,181) scale(2)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="140" y="277" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Donor</text>

  <circle cx="960" cy="205" r="44" fill="rgba(31,107,69,0.08)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(936,181) scale(2)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="960" y="277" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">Rescue partner</text>

  <circle cx="140" cy="385" r="38" fill="#ffffff" stroke="#0000002a" stroke-width="1.5"/>
  <g transform="translate(121,366) scale(1.6)" stroke="#5a5a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="140" y="447" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#5a5a5a">Org admin</text>

  <circle cx="960" cy="385" r="38" fill="#ffffff" stroke="#0000002a" stroke-width="1.5"/>
  <g transform="translate(941,366) scale(1.6)" stroke="#5a5a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="960" y="447" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#5a5a5a">Platform admin</text>
</svg>
</div>

<!--
USE CASES

The actors and what each one can do, before we show how the system is
built.

A donor posts a listing, can cancel it while nobody has claimed it, and
verifies the pickup when the rescue partner turns up. A rescue partner
browses what is available, claims a listing and can cancel that claim if
plans change.

Along the bottom is the onboarding path. An org admin registers their
organisation, and a platform admin approves it before anyone from that
organisation can transact at all. That is why signup and approval come
first in the demo.

The green one is the use case the rest of this section is about. Claiming
a listing is the only place where two users can collide, so it is the one
we had to design carefully. The state diagram and the sequence diagram
coming up both zoom into it.

If asked what is missing from the picture: the system itself is an actor
too. It expires listings whose pickup window has passed, sends pickup
reminders and prunes idempotency keys on a schedule.
-->

---

# Logical Diagram

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 -125 1100 510" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="lv-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    <marker id="lv-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
  </defs>

  <path d="M 40 -85 L 790 -85 L 790 95 L 1060 95 L 1060 370 L 40 370 Z" stroke="#00000033" stroke-dasharray="6 5"/>
  <text x="56" y="-67" style="font-size:9px" fill="#5a5a5a" class="font-mono">web</text>

  <rect x="855" y="-115" width="225" height="130" rx="12" stroke="#00000033" stroke-dasharray="6 5"/>
  <text x="869" y="-99" style="font-size:9px" fill="#5a5a5a" class="font-mono">local</text>

  <g transform="translate(355,-58)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </g>
  <text x="388" y="-40" style="font-size:12px;font-weight:600" fill="#111111">Donors &amp; rescue partners</text>
  <line x1="368" y1="-30" x2="368" y2="4" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>

  <g transform="translate(905,-108)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </g>
  <text x="938" y="-90" style="font-size:12px;font-weight:600" fill="#111111">Admin users</text>
  <line x1="918" y1="-80" x2="918" y2="-54" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>

  <rect x="260" y="8" width="240" height="56" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(276,20)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </g>
  <text x="394" y="31" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Platform web</text>
  <text x="394" y="50" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">Next.js (browser)</text>

  <rect x="865" y="-50" width="200" height="56" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(878,-38)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </g>
  <text x="983" y="-27" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Admin console</text>
  <text x="983" y="-8" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">React SPA (local)</text>

  <line x1="368" y1="64" x2="368" y2="94" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="965" y1="6" x2="965" y2="94" stroke="#8a8a8a" stroke-width="1.5"/>
  <text x="530" y="82" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">HTTPS</text>
  <line x1="195" y1="94" x2="965" y2="94" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="195" y1="94" x2="195" y2="136" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>
  <line x1="550" y1="94" x2="550" y2="136" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>
  <line x1="905" y1="94" x2="905" y2="136" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>

  <rect x="60" y="140" width="270" height="68" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(80,162)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <text x="207" y="170" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Profile (Go)</text>
  <text x="207" y="189" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">identity &amp; orgs</text>

  <rect x="415" y="140" width="270" height="68" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(435,162)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <text x="562" y="170" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Listings (NestJS)</text>
  <text x="562" y="189" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">listings &amp; claims</text>

  <rect x="770" y="140" width="270" height="68" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(790,162)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <text x="917" y="170" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Notifications (NestJS)</text>
  <text x="917" y="189" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">queue</text>

  <line x1="685" y1="174" x2="764" y2="174" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#lv-arr-g)"/>
  <text x="725" y="162" text-anchor="middle" style="font-size:10px;font-weight:600" fill="#1f6b45" class="font-mono">SQS</text>


  <rect x="60" y="218" width="270" height="42" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/cognito.png" x="78" y="228" width="22" height="22"/>
  <text x="207" y="244" text-anchor="middle" style="font-size:12px;font-weight:600" fill="#111111">Cognito</text>

  <line x1="195" y1="260" x2="195" y2="270" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="550" y1="208" x2="550" y2="270" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="905" y1="208" x2="905" y2="270" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="195" y1="270" x2="905" y2="270" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="550" y1="270" x2="550" y2="288" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lv-arr)"/>

  <rect x="350" y="292" width="400" height="64" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/rds.png" x="370" y="311" width="26" height="26"/>
  <text x="560" y="330" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">RDS PostgreSQL 17</text>
 


</svg>
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

On data, we were deliberate about what we did and did not separate. There
is one shared PostgreSQL instance, not a database per service. What each
service owns is its own tables and its own migrations: listings' migration
tool is scoped so it can never touch profile's schema. Sharing the
instance keeps a proof of concept cheap and lets us keep real foreign keys
between a listing and the organisation that posted it, which we would have
lost by splitting the databases. The cost is that the services are not as
independently deployable as the diagram might suggest, and we would split
them if this went further.

Every request carries a Cognito JWT, and each service validates it before
doing anything. Listings layers org membership and admin checks on top of
that. It all runs on ECS Fargate via CloudFormation.
-->

---
class: flex flex-col
---

# Deployment

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1200 530" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="aws-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="aws-arr-m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>

  <g transform="translate(38,6)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </g>
  <text x="50" y="48" text-anchor="middle" style="font-size:12px;font-weight:700" fill="#111111">Users</text>
  <line x1="78" y1="28" x2="146" y2="28" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>
  <text x="113" y="18" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">HTTPS</text>
  <rect x="150" y="8" width="156" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/api-gateway.png" x="157" y="13" width="30" height="30"/>
  <text x="246" y="32" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">API Gateway</text>
  <path d="M 290 28 L 787 28 L 787 73" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>

  <rect x="20" y="65" width="250" height="455" rx="8" stroke="#00000033" stroke-dasharray="5 4"/>
  <text x="35" y="85" style="font-size:10px;font-weight:700" fill="#3a3a3a">AWS managed services</text>

  <rect x="35" y="95" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cloudfront.png" x="48" y="102" width="32" height="32"/>
  <text x="94" y="123" style="font-size:11px;font-weight:600" fill="#111111">CloudFront</text>

  <rect x="35" y="153" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/s3.png" x="48" y="160" width="32" height="32"/>
  <text x="94" y="181" style="font-size:11px;font-weight:600" fill="#111111">S3 (private)</text>

  <rect x="35" y="211" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cognito.png" x="48" y="218" width="32" height="32"/>
  <text x="94" y="239" style="font-size:11px;font-weight:600" fill="#111111">Cognito user pool</text>

  <rect x="35" y="269" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/sqs.png" x="48" y="276" width="32" height="32"/>
  <text x="94" y="297" style="font-size:11px;font-weight:600" fill="#111111">SQS + dead-letter queue</text>

  <rect x="35" y="327" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/secrets-manager.png" x="48" y="334" width="32" height="32"/>
  <text x="94" y="355" style="font-size:11px;font-weight:600" fill="#111111">Secrets Manager</text>

  <rect x="35" y="385" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/cloudwatch.png" x="48" y="392" width="32" height="32"/>
  <text x="94" y="413" style="font-size:11px;font-weight:600" fill="#111111">CloudWatch</text>

  <rect x="35" y="443" width="215" height="46" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/github.svg" x="50" y="452" width="28" height="28"/>
  <text x="94" y="471" style="font-size:11px;font-weight:600" fill="#111111">GHCR</text>

  <path d="M 250 234 L 263 234 L 263 320 L 300 320" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>
  <path d="M 250 292 L 273 292 L 273 335 L 300 335" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>
  <path d="M 250 350 L 283 350 L 283 350 L 300 350" stroke="#8a8a8a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#aws-arr-m)"/>

  <rect x="290" y="65" width="895" height="455" rx="8" stroke="#00000033"/>
  <text x="305" y="86" style="font-size:10px;font-weight:700" fill="#3a3a3a">VPC 10.0.0.0/16 <tspan style="font-weight:400" fill="#5a5a5a">&middot; two availability zones</tspan></text>

  <rect x="727" y="75" width="120" height="32" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <text x="787" y="95" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">VPC Link</text>

  <rect x="305" y="122" width="865" height="74" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="317" y="138" style="font-size:10px;font-weight:600" fill="#3a3a3a">Public subnets</text>
  <text x="1158" y="138" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B</text>
  <rect x="430" y="146" width="164" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/internet-gateway.png" x="438" y="153" width="30" height="30"/>
  <text x="533" y="173" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internet Gateway</text>
  <rect x="950" y="146" width="170" height="44" rx="6" fill="#ffffff" stroke="#0000002a"/>
  <image href="/aws/nat-gateway.png" x="958" y="153" width="30" height="30"/>
  <text x="1056" y="174" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">NAT Gateway</text>

  <rect x="305" y="208" width="865" height="192" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="317" y="224" style="font-size:10px;font-weight:600" fill="#3a3a3a">App subnets</text>
  <text x="1158" y="224" text-anchor="end" style="font-size:9px" fill="#5a5a5a" class="font-mono">A + B</text>

  <path d="M 787 107 L 787 214" stroke="#1f6b45" stroke-width="2" marker-end="url(#aws-arr-g)"/>
  <rect x="687" y="216" width="200" height="40" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/alb.png" x="694" y="221" width="30" height="30"/>
  <text x="805" y="241" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">Internal ALB</text>


  <path d="M 787 256 L 787 276 L 430 276 L 430 300" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 640 276 L 640 300" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 850 276 L 850 300" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>
  <path d="M 787 276 L 1060 276 L 1060 300" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#aws-arr-g)"/>

  <rect x="355" y="302" width="150" height="42" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(367,314) scale(0.7)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <rect x="355" y="356" width="150" height="34" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/ecs.png" x="367" y="364" width="20" height="20"/>
  <text x="430" y="378" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111">ECS Fargate</text>
  <text x="430" y="328" text-anchor="middle" style="font-size:11.5px;font-weight:600" fill="#111111">web-platform</text>

  <rect x="565" y="302" width="150" height="42" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(577,314) scale(0.7)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <rect x="565" y="356" width="150" height="34" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/ecs.png" x="577" y="364" width="20" height="20"/>
  <text x="640" y="378" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111">ECS Fargate</text>
  <text x="640" y="328" text-anchor="middle" style="font-size:11.5px;font-weight:600" fill="#111111">profile</text>

  <rect x="775" y="302" width="150" height="42" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(787,314) scale(0.7)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <rect x="775" y="356" width="150" height="34" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/ecs.png" x="787" y="364" width="20" height="20"/>
  <text x="850" y="378" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111">ECS Fargate</text>
  <text x="850" y="328" text-anchor="middle" style="font-size:11.5px;font-weight:600" fill="#111111">listings</text>

  <rect x="985" y="302" width="150" height="42" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(997,314) scale(0.7)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <rect x="985" y="356" width="150" height="34" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/ecs.png" x="997" y="364" width="20" height="20"/>
  <text x="1060" y="378" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111">ECS Fargate</text>
  <text x="1060" y="328" text-anchor="middle" style="font-size:11.5px;font-weight:600" fill="#111111">notification</text>

  <rect x="305" y="412" width="865" height="100" rx="6" fill="#00000005" stroke="#0000001a"/>
  <text x="317" y="428" style="font-size:10px;font-weight:600" fill="#3a3a3a">Data subnets</text>

  <path d="M 640 390 L 640 414 L 1060 414 L 1060 390" stroke="#8a8a8a" stroke-width="1.2"/>
  <path d="M 850 390 L 850 414" stroke="#8a8a8a" stroke-width="1.2"/>
  <path d="M 787 414 L 787 434" stroke="#8a8a8a" stroke-width="1.2" marker-end="url(#aws-arr-m)"/>

  <rect x="700" y="438" width="174" height="60" rx="6" fill="#ffffff" stroke="#1f6b45"/>
  <image href="/aws/rds.png" x="708" y="451" width="34" height="34"/>
  <text x="808" y="473" text-anchor="middle" style="font-size:11px;font-weight:600" fill="#111111">RDS PostgreSQL 17</text>
</svg>
</div>

<!--
DEPLOYMENT

This is the same system, but where it actually runs. Follow the green
line, it is one request.

Someone opens the site. They land on API Gateway, and that is the only
door we leave open to the internet. From there the request crosses into
our private network and reaches the load balancer, which is internal, so
nobody outside can reach it directly. The load balancer looks at the
path and hands the request to one of our four services, each running as
its own ECS task on Fargate. If it needs data, the service talks to the
database.

The database is the part we were strictest about. It sits in subnets
with no route to the internet at all, in either direction. The only way
to reach it is from inside, from one of our own services. It is
encrypted and it backs itself up.

Everything on the left is stuff we did not write. CloudFront and a
private S3 bucket for listing images, Cognito for sign in, SQS for
notification events, Secrets Manager for passwords, CloudWatch for logs,
and GitHub for our container images. The dashed lines are the three our
services actually talk to while running.

Two things we would rather say ourselves than be asked. We run in two
availability zones, but there is only one NAT gateway, so our outbound
traffic depends on that one zone. We chose that to keep the bill small
for a proof of concept. And none of this was clicked together by hand:
it is all CloudFormation, the same templates for dev, qa and prod, with
one parameter file different between them.
-->

---
class: flex flex-col
---

# State Diagram

<div class="text-base mt-2" style="color:#00000099">The listing lifecycle</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1100 320" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="lc-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    <marker id="lc-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
  </defs>

  <rect x="50" y="80" width="160" height="56" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="130" y="113" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Draft</text>

  <line x1="210" y1="108" x2="316" y2="108" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lc-arr)"/>
  <text x="263" y="96" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">publish</text>

  <rect x="320" y="80" width="170" height="56" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <text x="405" y="113" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Available</text>

  <line x1="490" y1="108" x2="596" y2="108" stroke="#1f6b45" stroke-width="2.5" marker-end="url(#lc-arr-g)"/>
  <text x="543" y="94" text-anchor="middle" style="font-size:11.5px;font-weight:700" fill="#1f6b45">claim</text>

  <rect x="600" y="80" width="170" height="56" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="685" y="113" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Reserved</text>

  <line x1="770" y1="108" x2="876" y2="108" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lc-arr)"/>
  <text x="823" y="96" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">OTP verified</text>

  <rect x="880" y="80" width="170" height="56" rx="10" fill="#ffffff" stroke="#1f6b45"/>
  <text x="965" y="113" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">Collected</text>

  <path d="M 685 80 L 685 42 L 405 42 L 405 76" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lc-arr)"/>
  <text x="545" y="34" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">claim ends &middot; relisted</text>

  <line x1="130" y1="136" x2="130" y2="196" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="380" y1="136" x2="380" y2="196" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="640" y1="136" x2="640" y2="196" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="110" y1="196" x2="640" y2="196" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="110" y1="196" x2="110" y2="236" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lc-arr)"/>
  <text x="300" y="188" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">donor cancels</text>

  <line x1="460" y1="136" x2="460" y2="236" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#lc-arr)"/>
  <path d="M 720 136 L 720 226 L 460 226" stroke="#8a8a8a" stroke-width="1.5"/>
  <text x="540" y="220" style="font-size:10px" fill="#5a5a5a" class="font-mono">pickup window passes</text>

  <rect x="50" y="240" width="160" height="56" rx="10" fill="rgba(180,35,24,0.06)" stroke="#b42318" stroke-dasharray="4 3"/>
  <text x="130" y="273" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#b42318">Cancelled</text>

  <rect x="345" y="240" width="170" height="56" rx="10" fill="rgba(180,35,24,0.06)" stroke="#b42318" stroke-dasharray="4 3"/>
  <text x="430" y="273" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#b42318">Expired</text>
</svg>
</div>

<!--
LIFECYCLE

This is the analysis in one picture: the listing's states and the legal
transitions between them, which exist in the code as transition tables
that reject anything else. Draft to Available on publish, Available to
Reserved on a claim, Reserved to Collected once the donor verifies the
OTP. A cancelled claim relists the lot if the window allows; otherwise
it expires. Terminal states are dashed.

The green edge is the hard design problem of the project. A claim must
reserve the whole listing exactly once, even when two partners race for
it or a phone resends the same request. Two safeguards cover it: an
idempotency key, so an identical retry replays the original outcome
instead of acting again, and a partial unique index in the database, so
at most one active claim can exist per listing no matter what the
application layer does. The sequence diagram next walks this edge step
by step, and section 3 shows the patterns the implementation leans on.
-->

---
class: flex flex-col
---

# Sequence Diagram

<div class="text-base mt-2" style="color:#00000099">The claim edge from the lifecycle, step by step</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="0 0 1200 530" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="sq-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    <marker id="sq-arr-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="sq-arr-k" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#111111"/></marker>
  </defs>

  <rect x="50" y="16" width="200" height="50" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(66,30)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </g>
  <text x="168" y="46" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Rescue partner</text>

  <rect x="350" y="16" width="200" height="50" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(366,30)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </g>
  <text x="468" y="46" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Web app</text>

  <rect x="650" y="16" width="200" height="50" rx="10" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(666,30)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
  </g>
  <text x="768" y="40" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Listings</text>
  <text x="768" y="57" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">backend service</text>

  <rect x="950" y="16" width="200" height="50" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(966,30)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </g>
  <text x="1068" y="46" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">PostgreSQL</text>

  <line x1="150" y1="66" x2="150" y2="515" stroke="#0000002a" stroke-dasharray="4 4"/>
  <line x1="450" y1="66" x2="450" y2="515" stroke="#0000002a" stroke-dasharray="4 4"/>
  <line x1="750" y1="66" x2="750" y2="515" stroke="#0000002a" stroke-dasharray="4 4"/>
  <line x1="1050" y1="66" x2="1050" y2="515" stroke="#0000002a" stroke-dasharray="4 4"/>

  <rect x="746" y="145" width="8" height="115" rx="2" fill="rgba(31,107,69,0.2)"/>

  <text x="28" y="119" style="font-size:10px;font-weight:700;letter-spacing:0.08em" fill="#1f6b45" class="font-mono">CLAIM</text>
  <line x1="150" y1="115" x2="444" y2="115" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#sq-arr)"/>
  <text x="300" y="103" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">claim the listing</text>
  <line x1="450" y1="150" x2="744" y2="150" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#sq-arr-g)"/>
  <text x="600" y="138" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">POST /api/requests</text>
  <line x1="754" y1="185" x2="1044" y2="185" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#sq-arr-g)"/>
  <text x="900" y="173" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">claim the key slot</text>
  <line x1="754" y1="220" x2="1044" y2="220" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#sq-arr-g)"/>
  <text x="900" y="208" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">tx: reserve &middot; insert claim &middot; audit</text>
  <line x1="746" y1="255" x2="156" y2="255" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#sq-arr)"/>
  <text x="450" y="243" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">201 &middot; Reserved</text>

  <g v-click>
  <line x1="30" y1="290" x2="1170" y2="290" stroke="#0000000d" stroke-width="1"/>
  <rect x="746" y="345" width="8" height="45" rx="2" fill="rgba(31,107,69,0.2)"/>
  <text x="28" y="319" style="font-size:10px;font-weight:700;letter-spacing:0.08em" fill="#1f6b45" class="font-mono">RETRY</text>
  <line x1="150" y1="315" x2="744" y2="315" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#sq-arr)"/>
  <text x="450" y="303" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">the same request, resent</text>
  <line x1="754" y1="350" x2="1044" y2="350" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#sq-arr-g)"/>
  <text x="900" y="338" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">key found &middot; fingerprint matches</text>
  <line x1="746" y1="385" x2="156" y2="385" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#sq-arr)"/>
  <text x="450" y="373" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">201 &middot; the original claim, replayed</text>
  </g>

  <g v-click>
  <line x1="30" y1="410" x2="1170" y2="410" stroke="#0000000d" stroke-width="1"/>
  <rect x="746" y="460" width="8" height="45" rx="2" fill="rgba(31,107,69,0.2)"/>
  <text x="28" y="439" style="font-size:10px;font-weight:700;letter-spacing:0.08em" fill="#1f6b45" class="font-mono">RACE</text>
  <line x1="150" y1="435" x2="744" y2="435" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#sq-arr)"/>
  <text x="450" y="423" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">another partner, same listing</text>
  <line x1="754" y1="470" x2="1044" y2="470" stroke="#1f6b45" stroke-width="1.5" marker-end="url(#sq-arr-g)"/>
  <text x="900" y="458" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">reserve fails &middot; unique index holds</text>
  <line x1="746" y1="505" x2="156" y2="505" stroke="#111111" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#sq-arr-k)"/>
  <text x="450" y="493" text-anchor="middle" style="font-size:10.5px;font-weight:600" fill="#111111" class="font-mono">409 Conflict</text>
  </g>
</svg>
</div>

<!--
CLAIM SEQUENCE

Three runs of the same endpoint. Top: the happy path. The request
carries an idempotency key; the service claims a slot for that key,
then reserves the listing, inserts the claim and writes the audit row
in one transaction, and the partner gets 201 Reserved.

Middle: the phone resends the same request. The key is already
completed and the fingerprint matches, so the service replays the
original claim instead of doing anything. Same answer, no second
reservation.

Bottom: a different partner races for the same listing. The conditional
reserve finds the listing no longer available, and even if the
application got it wrong, the partial unique index in the database
cannot admit a second active claim. That partner gets a 409 and the
frontend tells them someone else got it first.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section 03</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Design <span class="accent">Patterns</span>
</div>

<!--
SECTION MARKER

Say the title and move on. Three patterns, one slide each, all backed
by real code.
-->

---
class: flex flex-col
---

# Repository pattern

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

# Strategy pattern

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

# Observer pattern

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
Observer Pattern
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

<div class="text-xs dgm-wide" style="color:#00000066">Section 04</div>

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

<div class="text-xs dgm-wide" style="color:#00000066">Section 05</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
<span class="accent">CI/CD</span>
</div>

<!--
SECTION MARKER

This segment is a live demo: the next four slides set the context, then
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
BRANCHING STRATEGY

We adapt Gitflow with environment branches, and the key idea is that the
branch decides the environment: develop feeds dev, qa feeds QA, main powers
production. Day-to-day work is on short-lived feat/* and fix/* branches off
develop - those are the ones branching off and merging back on the diagram.

Nothing moves between environments except through a pull request. A change
merges into develop for dev, then a PR promotes develop to qa, and a PR
promotes qa to main for production. Same change, promoted upward environment
by environment, each step reviewed rather than a direct push to prod.

We tag releases on main with semantic versions - the v1.4.2 there - so any
deployed state maps back to a specific tagged release.
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
HOTFIXES

A production bug can't wait for the full develop-to-qa-to-main chain, so we
branch a hotfix straight off main, fix it, and merge back via PR - that's
the v1.4.3 patch release on the diagram.

The important second step is the dashed line: once it lands on main, we
immediately rebase the fix back into develop. Skip that and the branches
diverge - the fix is in production but not in the branch everyone works
from, and the next promotion either hits merge conflicts or silently reverts
the hotfix. Rebasing at once keeps the environments from drifting and keeps
future merges clean.
-->

---
class: flex flex-col
---

# Source &amp; artifacts

<div class="text-base mt-2" style="color:#00000099">How we manage the code and the things we ship</div>

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:1.6rem">

<!-- Traceability: one commit SHA ties source to the shipped artifact (not a pipeline) -->
<div class="flex justify-center">
<svg viewBox="0 0 900 118" style="width:100%;max-width:50rem" fill="none">
  <!-- source side -->
  <circle cx="150" cy="59" r="46" fill="rgba(31,107,69,0.06)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(135,36)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </g>
  <text x="150" y="78" text-anchor="middle" style="font-size:12px;font-weight:600" fill="#1f6b45">Source</text>

  <!-- artifact side -->
  <circle cx="750" cy="59" r="46" fill="rgba(31,107,69,0.06)" stroke="#1f6b45" stroke-width="1.5"/>
  <g transform="translate(736,37)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </g>
  <text x="750" y="78" text-anchor="middle" style="font-size:12px;font-weight:600" fill="#1f6b45">Artifact</text>

  <!-- linking thread (no arrowhead -> not a flow; a shared identity) -->
  <line x1="196" y1="59" x2="382" y2="59" stroke="#1f6b45" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round"/>
  <line x1="518" y1="59" x2="704" y2="59" stroke="#1f6b45" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round"/>

  <!-- the shared commit SHA at the centre -->
  <rect x="384" y="39" width="132" height="40" rx="20" fill="#1f6b45"/>
  <text x="450" y="58" text-anchor="middle" style="font-size:10px;font-weight:600" fill="#ffffffcc" class="font-mono">commit</text>
  <text x="450" y="72" text-anchor="middle" style="font-size:12px;font-weight:700" fill="#ffffff" class="font-mono">fcfce09</text>
  <text x="450" y="104" text-anchor="middle" style="font-size:11px" fill="#5a5a5a">one SHA ties code to what ships</text>
</svg>
</div>

<!-- Two concise cards -->
<div class="grid grid-cols-2 gap-6 px-4">

<div class="flex flex-col" style="border:1px solid #1f6b4533;border-radius:14px;padding:1.1rem 1.3rem;gap:0.75rem">
  <div class="flex items-center" style="gap:0.5rem">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    <span class="dgm text-xs" style="color:#1f6b45">Code &amp; backlog</span>
  </div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Source on <b>GitHub</b>, backlog in <b>Jira</b> &mdash; live since Sprint 1</span></div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Every change lands via <b>pull request + review</b></span></div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Path-filtered workflows &mdash; each change builds only its own service</span></div>
</div>

<div class="flex flex-col" style="border:1px solid #1f6b4533;border-radius:14px;padding:1.1rem 1.3rem;gap:0.75rem">
  <div class="flex items-center" style="gap:0.5rem">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    <span class="dgm text-xs" style="color:#1f6b45">Artifacts &amp; verification</span>
  </div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Docker images in <b>GHCR</b>, tagged by branch + commit SHA</span></div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Every running task traces back to an <b>exact commit</b></span></div>
  <div class="flex items-start text-sm" style="gap:0.5rem"><span style="color:#1f6b45">&bull;</span><span>Integration tests hit a <b>real Postgres</b> via Testcontainers</span></div>
</div>

</div>

</div>

<!--
SOURCE & ARTIFACTS

This is the source and artifact management strategy - how we handle the code
and the things we ship, before we get to the pipeline itself.

Code lives on GitHub, the backlog in Jira, both stood up in Sprint 1 with
the first CI/CD wiring. Every change lands through a pull request and
review - nothing goes straight onto a long-lived branch. And the workflows
are path-filtered, so a change to one service runs only that service's
pipeline, which keeps builds fast and independent.

On the artifact side: our build artifacts are Docker images, published to
the GitHub Container Registry and tagged by branch and commit SHA, so every
running task traces back to an exact commit - that's what makes a rollback
just redeploying a known tag. And our integration tests aren't mocked; they
spin up a real PostgreSQL through Testcontainers, so the data layer is
exercised for real on every PR.
-->

---
class: flex flex-col
---

# Continuous Integration

<div class="text-base mt-2" style="color:#00000099">Every pull request into develop</div>

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0.5rem">
<svg viewBox="10 30 970 400" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="ci-m-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    <marker id="ci-m-arr-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#b42318"/></marker>
  </defs>

  <rect x="20" y="170" width="230" height="118" rx="12" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(50,200)" stroke="#1f6b45" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/>
  </g>
  <text x="151" y="217" text-anchor="middle" style="font-size:16px;font-weight:600" fill="#111111">Pull request</text>
  <text x="151" y="243" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">feat/* &middot; fix/*</text>
  <text x="151" y="268" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">into develop</text>

  <path d="M 250 229 L 280 229 L 280 132 L 312 132" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#ci-m-arr)"/>
  <path d="M 250 229 L 280 229 L 280 326 L 312 326" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#ci-m-arr)"/>

  <rect x="320" y="62" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,72)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>
  </g>
  <text x="372" y="87" style="font-size:11.5px;font-weight:600" fill="#111111">Lint + type-check</text>

  <rect x="320" y="112" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,122)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/>
    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>
  </g>
  <text x="372" y="137" style="font-size:11.5px;font-weight:600" fill="#111111">Unit tests</text>

  <rect x="320" y="162" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,172)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/>
    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>
  </g>
  <text x="372" y="187" style="font-size:11.5px;font-weight:600" fill="#111111">Integration tests</text>

  <rect x="320" y="256" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,266)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="372" y="281" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / CodeQL</text>

  <rect x="320" y="306" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,316)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="372" y="331" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / Semgrep</text>

  <rect x="320" y="356" width="230" height="40" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(344,366)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="372" y="381" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / Trivy</text>

  <circle cx="554" cy="82" r="4.5" fill="#8a8a8a"/>
  <circle cx="554" cy="132" r="4.5" fill="#8a8a8a"/>
  <circle cx="554" cy="182" r="4.5" fill="#8a8a8a"/>
  <circle cx="554" cy="276" r="4.5" fill="#8a8a8a"/>
  <circle cx="554" cy="326" r="4.5" fill="#8a8a8a"/>
  <circle cx="554" cy="376" r="4.5" fill="#8a8a8a"/>
  <path d="M 558 82 C 600 82 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 558 132 C 600 132 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 558 182 C 600 182 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 558 276 C 600 276 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 558 326 C 600 326 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 558 376 C 600 376 600 229 628 229" stroke="#8a8a8a" stroke-width="1.5"/>
  <circle cx="632" cy="229" r="4.5" fill="#8a8a8a"/>
  <line x1="636" y1="229" x2="676" y2="229" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#ci-m-arr)"/>

  <rect x="684" y="187" width="282" height="84" rx="12" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(706,214)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M6 21V9a9 9 0 0 0 9 9"/>
  </g>
  <text x="846" y="225" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Merge into develop</text>
  <text x="846" y="247" text-anchor="middle" style="font-size:10px" fill="#5a5a5a" class="font-mono">review + all checks green</text>

  <path d="M 632 229 L 632 352 L 676 352" stroke="#b42318" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#ci-m-arr-r)"/>
  <text x="622" y="310" text-anchor="end" style="font-size:9px;font-weight:600" fill="#b42318" class="font-mono">any failure</text>
  <rect x="684" y="320" width="282" height="64" rx="12" fill="rgba(180,35,24,0.06)" stroke="#b42318"/>
  <g transform="translate(704,340)" stroke="#b42318" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </g>
  <text x="852" y="357" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#b42318">Merge blocked</text>
</svg>



</div>

<!--
CI

Our CI runs on every pull request into develop. We lint, type-check,
unit test and run integration tests against a real PostgreSQL via
Testcontainers, then run three SAST scanners, each covering a different
class of problem:

On a pull request, we run the fast checks - lint, type-check, unit and
integration tests - then three security scanners, each for a different class
of problem. Two are SAST: CodeQL for deep data-flow analysis, and Semgrep for
fast pattern-matching on insecure idioms and hardcoded secrets. The third is
Trivy, which scans outward - known CVEs in dependencies, leaked secrets, and
Dockerfile and infrastructure misconfigurations.

Nothing merges without review and green checks, and a single red check
blocks the merge. The workflows are path-filtered, so only the
component that changed runs its pipeline.
-->

---
class: flex flex-col
---

# Continuous Delivery

<div class="text-base mt-2" style="color:#00000099">Every push to develop, qa or main; merging is the deployment</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:0.5rem">
<svg viewBox="10 112 1170 312" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <g id="cd-check">
      <circle r="10" fill="#1f6b45"/>
      <path d="M -4 0.5 L -1.2 3.6 L 4.2 -3" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <marker id="cd-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    <marker id="cd-arr-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#b42318"/></marker>
  </defs>

  <rect x="20" y="140" width="160" height="92" rx="12" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <g transform="translate(40,174)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M6 21V9a9 9 0 0 0 9 9"/>
  </g>
  <text x="112" y="192" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">Push to branch</text>

  <line x1="180" y1="186" x2="214" y2="186" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#cd-arr)"/>

  <rect x="220" y="126" width="190" height="36" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(238,135)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="266" y="149" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / CodeQL</text>

  <rect x="220" y="168" width="190" height="36" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(238,177)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="266" y="191" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / Semgrep</text>

  <rect x="220" y="210" width="190" height="36" rx="10" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(238,219)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </g>
  <text x="266" y="233" style="font-size:11.5px;font-weight:600" fill="#111111">SAST / Trivy</text>

  <circle cx="416" cy="144" r="4.5" fill="#8a8a8a"/>
  <circle cx="416" cy="186" r="4.5" fill="#8a8a8a"/>
  <circle cx="416" cy="228" r="4.5" fill="#8a8a8a"/>
  <path d="M 420 144 C 432 144 432 186 444 186" stroke="#8a8a8a" stroke-width="1.5"/>
  <path d="M 420 228 C 432 228 432 186 444 186" stroke="#8a8a8a" stroke-width="1.5"/>
  <line x1="420" y1="186" x2="444" y2="186" stroke="#8a8a8a" stroke-width="1.5"/>
  <circle cx="448" cy="186" r="4.5" fill="#8a8a8a"/>
  <line x1="452" y1="186" x2="461" y2="186" stroke="#8a8a8a" stroke-width="1.5"/>

  <rect x="465" y="140" width="215" height="92" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(491,175)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
  </g>
  <text x="521" y="182" style="font-size:13.5px;font-weight:600" fill="#111111">build-and-push</text>
  <text x="521" y="204" style="font-size:9px" fill="#5a5a5a" class="font-mono">image &rarr; GHCR &middot; branch + sha</text>

  <circle cx="686" cy="186" r="4.5" fill="#8a8a8a"/>
  <circle cx="704" cy="186" r="4.5" fill="#8a8a8a"/>

  <rect x="710" y="140" width="215" height="92" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(736,175)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 13v8"/><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
    <path d="m8 17 4-4 4 4"/>
  </g>
  <text x="766" y="182" style="font-size:13.5px;font-weight:600" fill="#111111">Deploy to ECS</text>
  <text x="766" y="204" style="font-size:9px" fill="#5a5a5a" class="font-mono">rolls the matching env</text>

  <circle cx="931" cy="186" r="4.5" fill="#8a8a8a"/>
  <circle cx="949" cy="186" r="4.5" fill="#8a8a8a"/>

  <rect x="955" y="140" width="215" height="92" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(981,175)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </g>
  <text x="1011" y="182" style="font-size:13.5px;font-weight:600" fill="#111111">DAST / ZAP</text>
  <text x="1011" y="204" style="font-size:9px" fill="#5a5a5a" class="font-mono">scans the live site</text>

  <path d="M 817 232 L 817 322" stroke="#b42318" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#cd-arr-r)"/>
  <text x="828" y="284" style="font-size:9px;font-weight:600" fill="#b42318" class="font-mono">rollout fails</text>
  <rect x="710" y="330" width="215" height="76" rx="12" fill="rgba(180,35,24,0.06)" stroke="#b42318"/>
  <g transform="translate(728,356)" stroke="#b42318" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </g>
  <text x="846" y="364" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#b42318">Rollback</text>
  <text x="846" y="386" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">circuit breaker, automatic</text>

  <path d="M 1062 232 L 1062 322" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#cd-arr)"/>
  <rect x="955" y="330" width="215" height="76" rx="12" fill="#ffffff" stroke="#0000002a" stroke-dasharray="4 3"/>
  <g transform="translate(975,350)" stroke="#5a5a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20"/><path d="M6 6.5h.01"/>
  </g>
  <text x="1077" y="364" text-anchor="middle" style="font-size:13px;font-weight:600" fill="#5a5a5a">End-to-End Tests</text>
  <text x="1077" y="386" text-anchor="middle" style="font-size:9px" fill="#5a5a5a" class="font-mono">Playwright &middot; dev + qa</text>
</svg>
</div>

<!--
CD

On merge, the push workflow re-runs SAST, builds the Docker image and
pushes it to GHCR tagged with the branch and commit SHA, then rolls the
ECS service for that branch's environment. The pipeline waits for the
rollout and the circuit breaker rolls back automatically if the new
tasks fail health checks. After the deploy, ZAP scans the deployed site
and the Playwright e2e suite smoke-tests dev and qa. Nobody deploys
anything by hand; pushing to a branch is the deployment.
-->

---
class: flex flex-col
---

# Technical findings &amp; issues

<div class="mt-10 px-6" style="width:100%">
<div class="grid grid-cols-2 gap-10" style="width:100%">
<div class="flex flex-col" style="gap:0.75rem">
  <div class="dgm text-xs" style="color:#1f6b45">Configuration &amp; secrets</div>
  <svg viewBox="0 0 540 120" style="width:100%;height:auto" fill="none">
    <defs>
      <marker id="tf1-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
      <marker id="tf1-arr-r" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#b42318"/></marker>
    </defs>
    <rect x="4" y="28" width="160" height="64" rx="12" fill="#ffffff" stroke="#0000002a"/>
    <g transform="translate(22,48)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </g>
    <text x="56" y="56" style="font-size:13px;font-weight:600" fill="#111111">Secret</text>
    <text x="56" y="75" style="font-size:9px" fill="#b42318" class="font-mono">malformed JSON</text>
    <circle cx="172" cy="60" r="4.5" fill="#8a8a8a"/>
    <circle cx="186" cy="60" r="4.5" fill="#8a8a8a"/>
    <rect x="196" y="28" width="160" height="64" rx="12" fill="#ffffff" stroke="#0000002a"/>
    <g transform="translate(214,48)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </g>
    <text x="248" y="56" style="font-size:13px;font-weight:600" fill="#111111">ECS task</text>
    <text x="248" y="75" style="font-size:9px" fill="#5a5a5a" class="font-mono">injection failed</text>
    <path d="M 356 60 L 378 60" stroke="#b42318" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#tf1-arr-r)"/>
    <rect x="384" y="28" width="152" height="64" rx="12" fill="rgba(180,35,24,0.06)" stroke="#b42318"/>
    <g transform="translate(402,48)" stroke="#b42318" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </g>
    <text x="436" y="56" style="font-size:13px;font-weight:600" fill="#b42318">Crash-loop</text>
    <text x="436" y="75" style="font-size:9px" fill="#5a5a5a" class="font-mono">never starts</text>
  </svg>
  <div class="text-sm font-semibold">Tasks crash-looped on startup</div>
  <div class="flex flex-col" style="gap:0.4rem">
    <div class="text-sm" style="color:#00000099">Secret JSON didn't match the schema ECS expected</div>
    <div class="text-sm" style="color:#00000099">Credential injection failed &mdash; tasks crash-looped</div>
  </div>
  <div class="dgm text-xs mt-2" style="color:#1f6b45">Lesson</div>
  <div class="flex flex-col" style="gap:0.4rem">
    <div class="text-sm">Validate secret schemas; least-privilege credentials</div>
    <div class="text-sm">Shift left &mdash; catch config errors early in CI</div>
  </div>
</div>
<div class="flex flex-col" style="gap:0.75rem">
  <div class="dgm text-xs" style="color:#1f6b45">Runtime performance</div>
  <svg viewBox="0 0 540 120" style="width:100%;height:auto" fill="none">
    <defs>
      <marker id="tf2-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
    </defs>
    <rect x="4" y="28" width="176" height="64" rx="12" fill="#ffffff" stroke="#0000002a"/>
    <g transform="translate(22,48)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
      <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </g>
    <text x="56" y="56" style="font-size:13px;font-weight:600" fill="#111111">Dashboard</text>
    <text x="56" y="75" style="font-size:9px" fill="#5a5a5a" class="font-mono">refetches details</text>
    <line x1="188" y1="44" x2="246" y2="44" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#tf2-arr)"/>
    <line x1="188" y1="60" x2="246" y2="60" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#tf2-arr)"/>
    <line x1="188" y1="76" x2="246" y2="76" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#tf2-arr)"/>
    <rect x="256" y="22" width="10" height="76" rx="2" fill="rgba(180,35,24,0.12)" stroke="#b42318"/>
    <text x="261" y="14" text-anchor="middle" style="font-size:9px;font-weight:600" fill="#b42318" class="font-mono">429</text>
    <rect x="284" y="28" width="248" height="64" rx="12" fill="rgba(180,35,24,0.06)" stroke="#b42318"/>
    <g transform="translate(302,48)" stroke="#b42318" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <path d="M6 6h.01"/><path d="M6 18h.01"/>
    </g>
    <text x="336" y="56" style="font-size:13px;font-weight:600" fill="#b42318">Rate limited</text>
    <text x="336" y="75" style="font-size:9px" fill="#5a5a5a" class="font-mono">listings unreachable</text>
  </svg>
  <div class="text-sm font-semibold">Listings became unreachable under load</div>
  <div class="flex flex-col" style="gap:0.4rem">
    <div class="text-sm" style="color:#00000099">Dashboard refetched listing details redundantly</div>
    <div class="text-sm" style="color:#00000099">Rate limit tripped in one page load, blocking listings</div>
  </div>
  <div class="dgm text-xs mt-2" style="color:#1f6b45">Lesson</div>
  <div class="flex flex-col" style="gap:0.4rem">
    <div class="text-sm">Bad access patterns hurt availability, not just capacity</div>
    <div class="text-sm">Fix the query pattern before scaling infra</div>
  </div>
</div>
</div>
</div>

<!--
TECHNICAL FINDINGS & ISSUES

Two findings, two different lessons - one infrastructure, one application.

Finding one: secrets in Secrets Manager didn't match the JSON schema the ECS
task expected, so credential injection failed and tasks crash-looped. Code
was fine, the secret was malformed. Lesson: validate secret schemas,
least-privilege credentials, and shift left so a bad secret fails in CI, not
at runtime.

Finding two: the Rescue Partner dashboard over-fetched - refetching listing
details, even for past claims - and tripped the API rate limit in one page
load, blocking listings. Infra had capacity; this was inefficient client
behaviour. Lesson: fix the access pattern before scaling infra.
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
