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
    <div class="dgm text-xs" style="color:#1f6b45;margin-top:0.9rem;min-height:3.4rem">Temporal Decoupling</div>
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
So the first question we asked ourselves is: Microservice or Monolith?

We went for microservice. This is because a few reasons. The main being 

Polyglot flexibility
As we are all of proficient in different programing languages. It allows us to use them without having any of us to compromise on a single language

It allow us to decouple our work easily.
As we are all from different walks of life and have different schedules. This allow us to conribute to the project with minimal conflicts as we rarely
work on each other coding spaces

Lightweight CI/CD
As we split our platform into multiple compomenents. Each of them have their own CI/CD pipelines which keeps them lightweight and fast with no dependencies on each other
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
In our platform we enviosion 4 kidns of users

Donor, rescue partner. 


We have this concept of an organisation

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
we had to design carefully. The state diagram coming up zooms into it.

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
  <text x="540" y="220" style="font-size:10px" fill="#5a5a5a" class="font-mono">Listings expires</text>
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
application layer does. Section 3 shows the patterns the implementation
leans on.
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

# Strategy pattern

<div class="text-base mt-2" style="color:#00000099">Define one interface and swap the implementation behind it.</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;gap:2rem;padding:0.5rem 0.25rem">
<div style="flex:1 1 0;min-width:0;align-self:flex-start;margin-top:1rem">
  <div style="">
    <div class="accent" style="font-size:1.25rem;font-weight:600">No code changes needed</div>
    <div style="font-size:1rem;line-height:1.6;margin-top:0.5rem">The app only talks to the interface, so switching from real servers to mocks is just changing a flag.</div>
  </div>
  <div style="margin-top:2.6rem">
    <div class="accent" style="font-size:1.25rem;font-weight:600">Work in parallel</div>
    <div style="font-size:1rem;line-height:1.6;margin-top:0.5rem">The frontend does not have to wait for the backend to be ready before it can be built and tested.</div>
  </div>
</div>
<div style="flex:0 0 46%;min-width:0;align-self:flex-start;margin-top:1rem;display:flex;align-items:flex-start;justify-content:center">
<svg viewBox="0 0 620 380" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="pat-s-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#1f6b45"/></marker>
    <marker id="pat-s-tri" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0.5 0.5 L9.5 5 L0.5 9.5 Z" fill="#ffffff" stroke="#1f6b45"/></marker>
  </defs>
  <rect x="170" y="16" width="280" height="72" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <g transform="translate(192,40)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
  </g>
  <text x="318" y="58" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">web-platform</text>
  <line x1="310" y1="88" x2="310" y2="126" stroke="#1f6b45" stroke-width="1.8" marker-end="url(#pat-s-arr)"/>
  <rect x="170" y="130" width="280" height="72" rx="12" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
  <text x="310" y="172" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">ListingsApi</text>
  <line x1="150" y1="276" x2="150" y2="242" stroke="#1f6b45" stroke-width="1.6"/>
  <line x1="470" y1="276" x2="470" y2="242" stroke="#1f6b45" stroke-width="1.6"/>
  <line x1="150" y1="242" x2="470" y2="242" stroke="#1f6b45" stroke-width="1.6"/>
  <line x1="310" y1="242" x2="310" y2="208" stroke="#1f6b45" stroke-width="1.6" marker-end="url(#pat-s-tri)"/>
  <text x="322" y="234" style="font-size:10px" fill="#5a5a5a" class="font-mono">implements</text>
  <rect x="20" y="280" width="260" height="80" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <text x="150" y="326" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">ListingsClient</text>
  <rect x="340" y="280" width="260" height="80" rx="12" fill="#ffffff" stroke="#0000002a"/>
  <text x="470" y="326" text-anchor="middle" style="font-size:13.5px;font-weight:600" fill="#111111">MockListingsClient</text>
</svg>
</div>
</div>

<!--
STRATEGY

The strategy pattern is a behavioral design pattern
The listings SDK has one interface, ListingsApi, with sixteen methods
and two implementations. ListingsClient makes the real HTTP calls with
the user's token. MockListingsClient keeps everything in memory but
mirrors the server's rules, the same status transitions and even the
idempotency replay. A factory returns the interface, so the app never
knows which one it is holding.

That is what let us build and demo the whole frontend before the
listings service was ready, and switching over was one boolean in
lib/listings.ts.

If asked where else we use it: the notification templates are a
type-to-renderer map, the relist policy is an injected config object,
and the Go service passes Approve, Reject and Suspend in as functions to
one shared transition handler.
-->

---
class: flex flex-col
clicks: 1
---

# Repository Pattern

<div class="text-base mt-2" style="color:#00000099">Separate the business logic from the database.</div>

<div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;gap:2rem;padding:0.5rem 0.25rem">
<div style="flex:1 1 0;min-width:0;align-self:flex-start;margin-top:1rem">
  <div style="">
    <div class="accent" style="font-size:1.25rem;font-weight:600">Business rules stay pure</div>
    <div style="font-size:1rem;line-height:1.6;margin-top:0.5rem">Services only handle business rules, never raw database queries.</div>
  </div>
  <div style="margin-top:2.6rem">
    <div class="accent" style="font-size:1.25rem;font-weight:600">Easy mocking</div>
    <div style="font-size:1rem;line-height:1.6;margin-top:0.5rem">Easy to mock the repository to test core business logic</div>
  </div>
</div>
<div style="flex:0 0 46%;min-width:0;align-self:flex-start;margin-top:1rem;display:flex;align-items:flex-start;justify-content:center">
<svg viewBox="0 0 620 440" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="pat-r-arr-m" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>
  <g :style="{ opacity: $clicks > 0 ? 0 : 1, transition: 'all 650ms cubic-bezier(.4,0,.2,1)' }">
    <rect x="20" y="100" width="580" height="124" rx="10" fill="#00000005" stroke="#0000001a"/>
    <text x="38" y="124" style="font-size:12px;font-weight:600" fill="#1f6b45">service layer</text>
    <line x1="310" y1="198" x2="310" y2="302" stroke="#8a8a8a" stroke-width="1.8" marker-end="url(#pat-r-arr-m)"/>
  </g>
  <g :style="{ opacity: $clicks > 0 ? 1 : 0, transition: 'all 650ms cubic-bezier(.4,0,.2,1)' }">
    <rect x="20" y="16" width="580" height="104" rx="10" fill="#00000005" stroke="#0000001a"/>
    <text x="38" y="40" style="font-size:12px;font-weight:600" fill="#1f6b45">service layer</text>
    <rect x="20" y="180" width="580" height="104" rx="10" fill="#00000005" stroke="#0000001a"/>
    <text x="38" y="204" style="font-size:12px;font-weight:600" fill="#1f6b45">data access layer</text>
    <line x1="20" y1="150" x2="600" y2="150" stroke="#1f6b45" stroke-width="1.8" stroke-dasharray="7 6"/>
    <line x1="310" y1="104" x2="310" y2="192" stroke="#8a8a8a" stroke-width="1.8" marker-end="url(#pat-r-arr-m)"/>
    <line x1="310" y1="268" x2="310" y2="302" stroke="#8a8a8a" stroke-width="1.8" marker-end="url(#pat-r-arr-m)"/>
  </g>
  <g :style="{ transform: $clicks > 0 ? 'translateY(-94px)' : 'translateY(0px)', transition: 'all 650ms cubic-bezier(.4,0,.2,1)' }">
    <rect x="170" y="130" width="280" height="64" rx="12" fill="#ffffff" stroke="#0000002a"/>
    <g transform="translate(190,148)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>
    </g>
    <text x="310" y="160" text-anchor="middle" fill="#111111" :style="{ fontSize: '16px', fontWeight: 600, transform: $clicks > 0 ? 'translateY(8px)' : 'translateY(0px)', transition: 'all 650ms cubic-bezier(.4,0,.2,1)' }">Service</text>
    <text x="310" y="181" text-anchor="middle" class="font-mono" :style="{ fontSize: '11px', fill: '#5a5a5a', opacity: $clicks > 0 ? 0 : 1, transition: 'opacity 300ms ease' }">business rules and SQL together</text>
  </g>
  <g :style="{ opacity: $clicks > 0 ? 1 : 0, transform: $clicks > 0 ? 'translateY(70px)' : 'translateY(0px)', transition: 'all 650ms cubic-bezier(.4,0,.2,1)' }">
    <rect x="170" y="130" width="280" height="64" rx="12" fill="rgba(31,107,69,0.06)" stroke="#1f6b45"/>
    <g transform="translate(190,150)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </g>
    <text x="310" y="168" text-anchor="middle" style="font-size:16px;font-weight:600" fill="#111111">Repository</text>
  </g>
  <rect x="170" y="306" width="280" height="62" rx="12" fill="#ffffff" stroke="#1f6b45"/>
  <g transform="translate(190,325)" stroke="#1f6b45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </g>
  <text x="310" y="344" text-anchor="middle" style="font-size:15px;font-weight:600" fill="#111111">PostgreSQL</text>
</svg>
</div>
</div>

<!--
REPOSITORY PATTERN

Basically its a pattern mostly used in backend services to seperate the business logic from the database. Instad the service layer communicates with something called a Repository which talks to the database. 

Its benefits are
*Explain*
-->

---
class: flex flex-col
---

# Observer Pattern

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

# Testing strategy

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0.5rem">
<svg viewBox="0 0 960 432" style="max-height:100%;max-width:100%" fill="none">
  <defs>
    <marker id="tp-m-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="#8a8a8a"/></marker>
  </defs>
  <path d="M 50 398 L 50 30" stroke="#8a8a8a" stroke-width="1.5" marker-end="url(#tp-m-arr)"/>
  <text x="40" y="14" style="font-size:11px" fill="#5a5a5a" class="font-mono">slower &middot; fewer &middot; more realistic</text>
  <text x="40" y="424" style="font-size:11px" fill="#5a5a5a" class="font-mono">faster &middot; more &middot; more precise</text>
  <polygon points="360,20 442.1,140 277.9,140" fill="#1f6b45" stroke="#1f6b45" stroke-linejoin="round"/>
  <text x="360" y="110" text-anchor="middle" style="font-size:17px;font-weight:700" fill="#ffffff">E2E</text>
  <text x="360" y="129" text-anchor="middle" style="font-size:10.5px" fill="#ffffff" class="font-mono">Playwright</text>
  <polygon points="269.7,152 450.3,152 529,267 191,267" fill="rgba(31,107,69,0.22)" stroke="#1f6b45" stroke-linejoin="round"/>
  <text x="360" y="205" text-anchor="middle" style="font-size:17px;font-weight:700" fill="#111111">Integration</text>
  <text x="360" y="227" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">Testcontainers &middot; real PostgreSQL</text>
  <polygon points="182.8,279 537.2,279 620,400 100,400" fill="rgba(31,107,69,0.07)" stroke="#1f6b45" stroke-linejoin="round"/>
  <text x="360" y="336" text-anchor="middle" style="font-size:17px;font-weight:700" fill="#111111">Unit</text>
  <text x="360" y="358" text-anchor="middle" style="font-size:11px" fill="#5a5a5a" class="font-mono">Vitest &middot; Jest &middot; go test</text>
  <path d="M 420 95 L 652 95" stroke="#8a8a8a" stroke-width="1" stroke-dasharray="3 4"/>
  <text x="664" y="90" style="font-size:15px;font-weight:600" fill="#111111">52 tests, full user journeys</text>
  <text x="664" y="110" style="font-size:12px" fill="#5a5a5a">Live dev and QA, after every deploy</text>
  <path d="M 492 210 L 652 210" stroke="#8a8a8a" stroke-width="1" stroke-dasharray="3 4"/>
  <text x="664" y="205" style="font-size:15px;font-weight:600" fill="#111111">About 230 tests on a real database</text>
  <text x="664" y="225" style="font-size:12px" fill="#5a5a5a">Throwaway container, real migrations</text>
  <path d="M 586 340 L 652 340" stroke="#8a8a8a" stroke-width="1" stroke-dasharray="3 4"/>
  <text x="664" y="335" style="font-size:15px;font-weight:600" fill="#111111">Over 800 tests (239 frontend)</text>
  <text x="664" y="355" style="font-size:12px" fill="#5a5a5a">Seconds per suite, every backend PR</text>
</svg>
</div>

<div class="text-center text-sm" style="color:#00000099">
Security testing runs alongside: SAST on the code, DAST on the running app
</div>

<!--
TESTING STRATEGY

We structured our testing as a pyramid, because tests get slower and
more expensive the higher you go. Unit tests are cheap and fast: the
listings service runs its whole unit suite in about thirteen seconds, so
backend unit tests run on every pull request. Integration tests are
fewer and slower. Each run starts a throwaway PostgreSQL container,
applies the real migrations once, and resets the tables between tests,
so we test real SQL, not mocks. That takes under a minute per service.
The numbers follow the shape: over eight hundred unit tests, about two
hundred and thirty integration tests, and fifty-two end-to-end.
-->

---
class: flex flex-col
---

# End-to-end testing

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center" class="px-6">

<div class="mx-auto text-center" style="max-width:56rem;width:100%">
  <div class="dgm text-xs" style="color:#1f6b45">Playwright</div>
  <div class="text-2xl font-bold mt-3">A real donor and a real rescue partner, in a real browser</div>
</div>

<div class="grid grid-cols-2 gap-12 mx-auto mt-12" style="max-width:56rem;width:100%">
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">The full journey</div>
    <div class="text-base mt-3">Post &rarr; claim &rarr; pickup code &rarr; collected, plus the failure cases: a wrong pickup code, a partner opening donor pages</div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">After every deploy</div>
    <div class="text-base mt-3">52 tests against dev and QA, never prod; failures have led to several bug reports in Jira</div>
  </div>
</div>

</div>

<!--
END-TO-END TESTING

End-to-end tests are the most expensive, so we keep them few and focused
on the critical journey. Playwright drives a real browser as a donor and
a rescue partner: post a listing, claim it, and confirm the pickup with
a code, plus negative cases like a wrong code or a partner opening donor
pages. The fifty-two tests run after each deploy to dev and QA, never
against production, because they create real data. Failing runs have
led to several bug reports in Jira, some indirectly:
investigating a broken run uncovered hidden issues, such as the
dashboard triggering rate limiting.
-->

---
class: flex flex-col
---

# Security testing

<div style="flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center" class="px-6">

<div class="grid grid-cols-2 gap-12 mx-auto text-center" style="max-width:56rem;width:100%">
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">SAST &middot; reads the code</div>
    <div class="text-2xl font-bold mt-3">CodeQL, Semgrep, Trivy</div>
    <div class="text-sm mt-2 mx-auto" style="color:#00000099;display:grid;grid-template-columns:auto auto;column-gap:0.75rem;row-gap:0.15rem;width:max-content;text-align:left">
      <b style="color:#111111">CodeQL</b><span>traces data flow</span>
      <b style="color:#111111">Semgrep</b><span>insecure patterns &amp; secrets</span>
      <b style="color:#111111">Trivy</b><span>vulnerable dependencies &amp; config</span>
    </div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">DAST &middot; attacks the running site</div>
    <div class="text-2xl font-bold mt-3">OWASP ZAP</div>
    <div class="text-sm mt-2" style="color:#00000099">crawls the live app for weaknesses like missing headers</div>
  </div>
</div>

<div class="grid grid-cols-2 gap-12 mx-auto mt-12" style="max-width:56rem;width:100%">
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">What SAST found</div>
    <div class="text-base mt-3">9 vulnerable dependencies, upgraded and closed, with the build and tests re-run</div>
  </div>
  <div>
    <div class="dgm text-xs" style="color:#1f6b45">What DAST found</div>
    <div class="text-base mt-3">9 findings, mostly missing security settings, cut to 2, left on purpose for a later change</div>
  </div>
</div>

</div>

<!--
SECURITY TESTING

Functional tests don't prove security, so SAST and DAST run alongside.
SAST uses three tools, each catching something different: CodeQL traces
data flow, such as user input reaching a query; Semgrep matches known
insecure patterns and secrets; and Trivy checks dependencies and Docker
configuration for known vulnerabilities. DAST runs OWASP ZAP against the
running app. Acting on the findings, we upgraded nine vulnerable
dependencies, and added security headers that cut the ZAP findings from
nine to two. The remaining two need a larger change, so we deferred them.

The two left: Content Security Policy, which needs a per-request nonce
for Next.js scripts, and COEP, which would block the listing photos
served from CloudFront.
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

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Appendix</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Use cases <span class="accent">in detail</span>
</div>

<div class="text-sm mt-10" style="color:#00000066">
Backup slides for Q&amp;A
</div>

<!--
APPENDIX MARKER

Don't present these. They are here for questions about scope: the full
actor-by-actor breakdown behind the one-slide use case diagram in section
two, then three sequence diagrams for the flows people ask about. All
drawn on white so they can be lifted straight into the report.
-->

---
class: flex flex-col uml-slide
---

# Onboarding &amp; administration

<div class="text-base mt-2" style="color:#00000099">Getting an organisation and its members onto the platform</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440"  fill="none">
  <g stroke="#1a1a1a" stroke-width="1.1">
    <line x1="158" y1="220" x2="325" y2="48"/>
    <line x1="158" y1="220" x2="325" y2="134"/>
    <line x1="158" y1="220" x2="325" y2="220"/>
    <line x1="158" y1="220" x2="325" y2="306"/>
    <line x1="158" y1="220" x2="325" y2="392"/>
    <line x1="942" y1="220" x2="785" y2="48"/>
    <line x1="942" y1="220" x2="785" y2="134"/>
    <line x1="942" y1="220" x2="785" y2="220"/>
    <line x1="942" y1="220" x2="785" y2="306"/>
    <line x1="942" y1="220" x2="785" y2="392"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <ellipse cx="430" cy="48" rx="105" ry="28"/>
    <ellipse cx="430" cy="134" rx="105" ry="28"/>
    <ellipse cx="430" cy="220" rx="105" ry="28"/>
    <ellipse cx="430" cy="306" rx="105" ry="28"/>
    <ellipse cx="430" cy="392" rx="105" ry="28"/>
    <ellipse cx="680" cy="48" rx="105" ry="28"/>
    <ellipse cx="680" cy="134" rx="105" ry="28"/>
    <ellipse cx="680" cy="220" rx="105" ry="28"/>
    <ellipse cx="680" cy="306" rx="105" ry="28"/>
    <ellipse cx="680" cy="392" rx="105" ry="28"/>
  </g>
  <g text-anchor="middle" style="font-size:13px" fill="#111111">
    <text x="430" y="53">Register organisation</text>
    <text x="430" y="139">Look up org by domain</text>
    <text x="430" y="225">Sign up &amp; verify email</text>
    <text x="430" y="311">Sign in</text>
    <text x="430" y="397">Reset password</text>
    <text x="680" y="53">Approve organisation</text>
    <text x="680" y="139">Reject or suspend org</text>
    <text x="680" y="225">Suspend or reactivate user</text>
    <text x="680" y="311">Unlock a locked account</text>
    <text x="680" y="397">Read the audit log</text>
  </g>
  <g transform="translate(140,220)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Guest</text>
  </g>
  <g transform="translate(960,220)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Platform administrator</text>
  </g>
</svg>
</div>

<!--
ONBOARDING & ADMINISTRATION

Everything on the left is public. You do not need an account to register an
organisation - that is deliberate, because the first person from a charity
has nowhere to sign in to yet. Registration takes the org details, signup
looks the org up by the email domain, and the two are joined when the user
is provisioned.

There is no org-admin role in the system. The profile service has exactly
two roles: platform administrator and member. Whoever registers the org is
just the first member of it.

Approve organisation is the gate. Until a platform admin approves the
organisation, nobody from it can post or claim anything - the listings
service rejects them at the guard. Reject, suspend, user suspension and
unlock are the rest of the admin surface, and every one of them requires a
reason that lands in the audit log.
-->

---
class: flex flex-col uml-slide
---

# Donor &amp; rescue partner

<div class="text-base mt-2" style="color:#00000099">What each role can do on its own</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 480"  fill="none">
  <g stroke="#1a1a1a" stroke-width="1.1">
    <line x1="158" y1="236" x2="325" y2="38"/>
    <line x1="158" y1="236" x2="325" y2="104"/>
    <line x1="158" y1="236" x2="325" y2="170"/>
    <line x1="158" y1="236" x2="325" y2="236"/>
    <line x1="158" y1="236" x2="325" y2="302"/>
    <line x1="158" y1="236" x2="325" y2="368"/>
    <line x1="158" y1="236" x2="325" y2="434"/>
    <line x1="942" y1="236" x2="785" y2="137"/>
    <line x1="942" y1="236" x2="785" y2="203"/>
    <line x1="942" y1="236" x2="785" y2="269"/>
    <line x1="942" y1="236" x2="785" y2="335"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <ellipse cx="430" cy="38" rx="105" ry="24"/>
    <ellipse cx="430" cy="104" rx="105" ry="24"/>
    <ellipse cx="430" cy="170" rx="105" ry="24"/>
    <ellipse cx="430" cy="236" rx="105" ry="24"/>
    <ellipse cx="430" cy="302" rx="105" ry="24"/>
    <ellipse cx="430" cy="368" rx="105" ry="24"/>
    <ellipse cx="430" cy="434" rx="105" ry="24"/>
    <ellipse cx="680" cy="137" rx="105" ry="24"/>
    <ellipse cx="680" cy="203" rx="105" ry="24"/>
    <ellipse cx="680" cy="269" rx="105" ry="24"/>
    <ellipse cx="680" cy="335" rx="105" ry="24"/>
  </g>
  <g text-anchor="middle" style="font-size:12.5px" fill="#111111">
    <text x="430" y="43">Create a listing</text>
    <text x="430" y="109">Publish a listing</text>
    <text x="430" y="175">Edit a listing</text>
    <text x="430" y="241">Cancel a listing</text>
    <text x="430" y="307">Delete a draft listing</text>
    <text x="430" y="373">Look up claim by code</text>
    <text x="430" y="439">Verify the pickup code</text>
    <text x="680" y="142">Browse listings</text>
    <text x="680" y="208">View listing detail</text>
    <text x="680" y="274">Claim a listing</text>
    <text x="680" y="340">Generate pickup code</text>
  </g>
  <g transform="translate(140,236)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Donor</text>
  </g>
  <g transform="translate(960,236)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Rescue partner</text>
  </g>
</svg>
</div>

<!--
DONOR & RESCUE PARTNER

These are the use cases only one side can reach. Nothing here is shared.

Donor side, top to bottom, is the listing lifecycle: create as a draft,
publish it, edit it, cancel it. Delete is draft-only - once a listing has
a claim against it the delete returns a 409, because the audit trail has
to survive.

The last two on the donor side are the handover. The donor types the
six-digit code the partner shows them, or looks the claim up by the code
if they are not sure which one it belongs to. Verify is the only call that
completes a claim and marks the listing collected.

Rescue partner side: browse, open a listing, claim it, and generate the
pickup code. Claim is first come first served, one claim for the whole
listing, idempotency key on the request so a retry replays rather than
double-books.

The split matters because the code enforces it. Only the claiming partner
can generate the code and only the donor can verify it, so neither side
can complete a handover on its own.
-->

---
class: flex flex-col uml-slide
---

# Shared by both parties

<div class="text-base mt-2" style="color:#00000099">Either side of a claim can do these</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440"  fill="none">
  <g stroke="#1a1a1a" stroke-width="1.1">
    <line x1="158" y1="220" x2="423" y2="40"/>
    <line x1="158" y1="220" x2="423" y2="112"/>
    <line x1="158" y1="220" x2="423" y2="184"/>
    <line x1="158" y1="220" x2="423" y2="256"/>
    <line x1="158" y1="220" x2="423" y2="328"/>
    <line x1="158" y1="220" x2="423" y2="400"/>
    <line x1="942" y1="220" x2="687" y2="40"/>
    <line x1="942" y1="220" x2="687" y2="112"/>
    <line x1="942" y1="220" x2="687" y2="184"/>
    <line x1="942" y1="220" x2="687" y2="256"/>
    <line x1="942" y1="220" x2="687" y2="328"/>
    <line x1="942" y1="220" x2="687" y2="400"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <ellipse cx="555" cy="40" rx="132" ry="26"/>
    <ellipse cx="555" cy="112" rx="132" ry="26"/>
    <ellipse cx="555" cy="184" rx="132" ry="26"/>
    <ellipse cx="555" cy="256" rx="132" ry="26"/>
    <ellipse cx="555" cy="328" rx="132" ry="26"/>
    <ellipse cx="555" cy="400" rx="132" ry="26"/>
  </g>
  <g text-anchor="middle" style="font-size:13px" fill="#111111">
    <text x="555" y="45">Cancel a claim</text>
    <text x="555" y="117">Report a no-show</text>
    <text x="555" y="189">View claims they are party to</text>
    <text x="555" y="261">View reports &amp; statistics</text>
    <text x="555" y="333">Read &amp; clear notifications</text>
    <text x="555" y="405">View profile, change password</text>
  </g>
  <g transform="translate(140,220)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Donor</text>
  </g>
  <g transform="translate(960,220)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Rescue partner</text>
  </g>
</svg>
</div>

<!--
SHARED BY BOTH PARTIES

Six use cases where the system does not care which side you are on, only
that you are a party to the claim.

Cancel a claim and report a no-show are the interesting ones. Cancelling
is symmetric on purpose: the partner's van breaks down, or the donor's
kitchen needs the tray back, and either way the listing has to come out of
reserved. What happens next depends on the relist policy - if there is
still enough of the pickup window left the listing reopens as available,
otherwise it goes straight to expired.

No-show is the same shape but time-gated. You cannot report one before the
pickup window has even opened. In practice the donor reports the partner,
but the API does not hard-code that, and the record stores who reported it
and from which org.

The rest is read-only or personal: claims you are party to, the reports
page, the notification feed, and your own profile. Reports and claims are
both scoped - you only ever see rows your organisation touched. Admins are
the exception and see everything.
-->

---
class: flex flex-col uml-slide
---

# Scheduled jobs

<div class="text-base mt-2" style="color:#00000099">The system acting without a user</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 340"  fill="none">
  <g stroke="#1a1a1a" stroke-width="1.1">
    <line x1="240" y1="170" x2="405" y2="60"/>
    <line x1="240" y1="170" x2="405" y2="170"/>
    <line x1="240" y1="170" x2="405" y2="280"/>
    <line x1="705" y1="60" x2="880" y2="158"/>
    <line x1="705" y1="170" x2="880" y2="176"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <ellipse cx="555" cy="60" rx="150" ry="38"/>
    <ellipse cx="555" cy="170" rx="150" ry="38"/>
    <ellipse cx="555" cy="280" rx="150" ry="38"/>
  </g>
  <g text-anchor="middle" fill="#111111">
    <text x="555" y="57" style="font-size:13px">Expire listings past the window</text>
    <text x="555" y="76" style="font-size:10px;font-style:italic" fill="#444444">every minute</text>
    <text x="555" y="167" style="font-size:13px">Send pickup reminders</text>
    <text x="555" y="186" style="font-size:10px;font-style:italic" fill="#444444">every 10 minutes</text>
    <text x="555" y="277" style="font-size:13px">Prune idempotency keys</text>
    <text x="555" y="296" style="font-size:10px;font-style:italic" fill="#444444">hourly</text>
  </g>
  <rect x="60" y="134" width="180" height="72" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="150" y="162" text-anchor="middle" style="font-size:11px" fill="#444444">&#171;system&#187;</text>
  <text x="150" y="183" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Scheduler</text>
  <rect x="880" y="134" width="180" height="72" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="970" y="162" text-anchor="middle" style="font-size:11px" fill="#444444">&#171;external&#187;</text>
  <text x="970" y="183" text-anchor="middle" style="font-size:14px;font-weight:600" fill="#111111">Email provider</text>
</svg>
</div>

<!--
SCHEDULED JOBS

The question people ask about the first use case diagram is who moves a
listing to expired when nobody touches it. The answer is that the system
is an actor too, which is why Scheduler is drawn as a «system» actor
rather than a stick figure.

Three cron jobs, all in the listings service. Expiry runs every minute and
sweeps listings whose pickup window has closed. Pickup reminders run every
ten minutes and fire twice per claim: once before the window opens, once
when it is about to close. Idempotency key pruning runs hourly and is pure
housekeeping - it drops claim keys past their retention window so a
long-dead key eventually becomes new again.

The links on the right are the notification path. Expiry and reminders
both publish to the queue, the notifications service consumes it and fans
out to email and the in-app feed. Pruning notifies nobody, which is why it
has no association.

Worth saying out loud: because these run on a schedule rather than on a
request, they are the hardest part of the system to test, and they are
also why the reports page can show an expired listing nobody ever opened.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Appendix</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Sequence <span class="accent">diagrams</span>
</div>

<div class="text-sm mt-10" style="color:#00000066">
Three flows worth tracing end to end
</div>

<!--
SEQUENCE SECTION MARKER

Three diagrams: claiming a listing (the only place two users collide),
the pickup handover (the only two-sided confirmation), and organisation
approval (the whole asynchronous notification path in one picture).
-->

---
class: flex flex-col uml-slide
---

# Claiming a listing

<div class="text-base mt-2" style="color:#00000099">First come first served, idempotent per rescue org</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 556"  fill="none">
  <defs>
    <marker id="s1-call" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1a1a1a"/>
    </marker>
    <marker id="s1-ret" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="25" y="14" width="160" height="40"/>
    <rect x="240" y="14" width="160" height="40"/>
    <rect x="460" y="14" width="160" height="40"/>
    <rect x="680" y="14" width="160" height="40"/>
    <rect x="900" y="14" width="160" height="40"/>
  </g>
  <g text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">
    <text x="105" y="39">Rescue partner</text>
    <text x="320" y="39">Web app</text>
    <text x="540" y="39">Listings API</text>
    <text x="760" y="39">Database</text>
    <text x="980" y="39">Queue</text>
  </g>
  <g stroke="#1a1a1a" stroke-width="1" stroke-dasharray="5 5">
    <line x1="105" y1="54" x2="105" y2="530"/>
    <line x1="320" y1="54" x2="320" y2="530"/>
    <line x1="540" y1="54" x2="540" y2="530"/>
    <line x1="760" y1="54" x2="760" y2="530"/>
    <line x1="980" y1="54" x2="980" y2="530"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.2">
    <rect x="100" y="96" width="10" height="406"/>
    <rect x="315" y="96" width="10" height="406"/>
    <rect x="535" y="130" width="10" height="338"/>
    <rect x="755" y="164" width="10" height="234"/>
    <rect x="975" y="434" width="10" height="14"/>
  </g>
  <rect x="515" y="284" width="290" height="132" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M515 284 h78 v12 l-10 10 h-68 z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="521" y="300" style="font-size:10px;font-weight:600" fill="#111111">transaction</text>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="110" y1="96" x2="313" y2="96" marker-end="url(#s1-call)"/>
    <line x1="325" y1="130" x2="533" y2="130" marker-end="url(#s1-call)"/>
    <line x1="545" y1="164" x2="753" y2="164" marker-end="url(#s1-call)"/>
    <line x1="755" y1="198" x2="547" y2="198" stroke-dasharray="5 4" marker-end="url(#s1-ret)"/>
    <line x1="545" y1="232" x2="753" y2="232" marker-end="url(#s1-call)"/>
    <line x1="545" y1="266" x2="753" y2="266" marker-end="url(#s1-call)"/>
    <line x1="545" y1="326" x2="753" y2="326" marker-end="url(#s1-call)"/>
    <line x1="755" y1="360" x2="547" y2="360" stroke-dasharray="5 4" marker-end="url(#s1-ret)"/>
    <line x1="545" y1="394" x2="753" y2="394" marker-end="url(#s1-call)"/>
    <line x1="545" y1="434" x2="973" y2="434" marker-end="url(#s1-call)"/>
    <line x1="535" y1="468" x2="327" y2="468" stroke-dasharray="5 4" marker-end="url(#s1-ret)"/>
    <line x1="315" y1="502" x2="112" y2="502" stroke-dasharray="5 4" marker-end="url(#s1-ret)"/>
  </g>
  <g text-anchor="middle" style="font-size:11px" fill="#111111">
    <text x="212" y="89">claim listing</text>
    <text x="430" y="123">POST /requests + idempotency key</text>
    <text x="650" y="157">find idempotency key</text>
    <text x="650" y="191">no prior claim</text>
    <text x="650" y="225">load listing, check window</text>
    <text x="650" y="259">claim idempotency slot</text>
    <text x="650" y="319">reserve listing (guarded UPDATE)</text>
    <text x="650" y="353">1 row, else 409 Conflict</text>
    <text x="650" y="387">insert claim + audit entry</text>
    <text x="870" y="427">publish claim_created</text>
    <text x="430" y="461">201 Created</text>
    <text x="212" y="495">claim confirmed</text>
  </g>
</svg>
</div>

<!--
CLAIMING A LISTING

This is the only flow where two users can collide, so it is worth the
detail.

The idempotency key comes first, before anything else is read. An
identical retry replays the original claim even after the listing has
moved on, which is what makes a flaky network safe. The same key with a
different listing is a 409, and a retry while the first is still in
flight is a 409 asking the caller to try again.

The line that actually prevents double allocation is the guarded UPDATE
inside the transaction: set the listing reserved only where it is still
available. Two orgs racing both reach it; the database serialises them;
the loser updates zero rows and gets a 409. There is no application-level
lock and no queue in front of it.

The claim row, the audit entry and the idempotency completion all commit
in that same transaction. The notification is published after the commit,
deliberately - a failed publish logs and moves on rather than rolling back
a claim that genuinely happened.
-->

---
class: flex flex-col uml-slide
---

# The pickup handover

<div class="text-base mt-2" style="color:#00000099">Neither side can complete it alone</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 560"  fill="none">
  <defs>
    <marker id="s2-call" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1a1a1a"/>
    </marker>
    <marker id="s2-ret" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="40" y="14" width="180" height="40"/>
    <rect x="300" y="14" width="180" height="40"/>
    <rect x="560" y="14" width="180" height="40"/>
    <rect x="820" y="14" width="180" height="40"/>
  </g>
  <g text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">
    <text x="130" y="39">Rescue partner</text>
    <text x="390" y="39">Donor</text>
    <text x="650" y="39">Listings API</text>
    <text x="910" y="39">Database</text>
  </g>
  <g stroke="#1a1a1a" stroke-width="1" stroke-dasharray="5 5">
    <line x1="130" y1="54" x2="130" y2="430"/>
    <line x1="390" y1="54" x2="390" y2="430"/>
    <line x1="650" y1="54" x2="650" y2="430"/>
    <line x1="910" y1="54" x2="910" y2="430"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.2">
    <rect x="125" y="96" width="10" height="136"/>
    <rect x="385" y="232" width="10" height="180"/>
    <rect x="645" y="96" width="10" height="316"/>
    <rect x="905" y="130" width="10" height="252"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="135" y1="96" x2="643" y2="96" marker-end="url(#s2-call)"/>
    <line x1="655" y1="130" x2="903" y2="130" marker-end="url(#s2-call)"/>
    <line x1="655" y1="164" x2="903" y2="164" marker-end="url(#s2-call)"/>
    <line x1="645" y1="198" x2="137" y2="198" stroke-dasharray="5 4" marker-end="url(#s2-ret)"/>
    <line x1="135" y1="232" x2="383" y2="232" marker-end="url(#s2-call)"/>
    <line x1="395" y1="266" x2="643" y2="266" marker-end="url(#s2-call)"/>
    <line x1="655" y1="300" x2="903" y2="300" marker-end="url(#s2-call)"/>
    <line x1="905" y1="334" x2="657" y2="334" stroke-dasharray="5 4" marker-end="url(#s2-ret)"/>
    <line x1="655" y1="368" x2="903" y2="368" marker-end="url(#s2-call)"/>
    <line x1="645" y1="402" x2="397" y2="402" stroke-dasharray="5 4" marker-end="url(#s2-ret)"/>
  </g>
  <g text-anchor="middle" style="font-size:11px" fill="#111111">
    <text x="250" y="89">POST /requests/{id}/pickup-code</text>
    <text x="780" y="123">assert claiming partner</text>
    <text x="780" y="157">store code hash, set expiry</text>
    <text x="250" y="191">201 { code }</text>
    <text x="258" y="225">show the 6-digit code</text>
    <text x="520" y="259">POST /requests/{id}/verify</text>
    <text x="780" y="293">assert donor, compare hash</text>
    <text x="780" y="327">match</text>
    <text x="780" y="361">claim completed, listing collected</text>
    <text x="520" y="395">201 completed</text>
  </g>
  <path d="M60 470 H430 L450 490 V548 H60 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M430 470 V490 H450" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="74" y="492" style="font-size:11px;font-weight:600" fill="#111111">note</text>
  <text x="74" y="513" style="font-size:11px" fill="#111111">Three wrong codes void it. The partner mints a</text>
  <text x="74" y="532" style="font-size:11px" fill="#111111">replacement, limited to one per minute.</text>
</svg>
</div>

<!--
THE PICKUP HANDOVER

Two endpoints, two different callers, and the code enforces which is
which. Only the rescue partner that holds the claim can mint the code;
only the donor on that listing can verify it.

The code is stored hashed and never returned on a GET. Asking for it
again returns the same live code rather than a new one, so a reload or a
second device does not strand the partner with a code the donor cannot
accept.

Verification is the only path that completes a claim and flips the
listing to collected, and it does both in one transaction. Resubmitting a
code that already completed the claim replays the completed request
instead of erroring, which matters when the donor double-taps on a bad
connection.

The note is the abuse guard. Three wrong attempts void that code, and
minting a replacement is capped at one a minute, on top of the endpoint
rate limits.
-->

---
class: flex flex-col uml-slide
---

# Approving an organisation

<div class="text-base mt-2" style="color:#00000099">The asynchronous notification path, end to end</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 520"  fill="none">
  <defs>
    <marker id="s3-call" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1a1a1a"/>
    </marker>
    <marker id="s3-ret" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="25" y="14" width="170" height="40"/>
    <rect x="245" y="14" width="170" height="40"/>
    <rect x="465" y="14" width="170" height="40"/>
    <rect x="685" y="14" width="170" height="40"/>
    <rect x="900" y="14" width="170" height="40"/>
  </g>
  <g text-anchor="middle" style="font-size:13px;font-weight:600" fill="#111111">
    <text x="110" y="39">Platform admin</text>
    <text x="330" y="39">Profile API</text>
    <text x="550" y="39">Queue</text>
    <text x="770" y="39">Notifications</text>
    <text x="985" y="39">Email provider</text>
  </g>
  <g stroke="#1a1a1a" stroke-width="1" stroke-dasharray="5 5">
    <line x1="110" y1="54" x2="110" y2="505"/>
    <line x1="330" y1="54" x2="330" y2="505"/>
    <line x1="550" y1="54" x2="550" y2="505"/>
    <line x1="770" y1="54" x2="770" y2="505"/>
    <line x1="985" y1="54" x2="985" y2="505"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.2">
    <rect x="105" y="96" width="10" height="186"/>
    <rect x="325" y="96" width="10" height="186"/>
    <rect x="545" y="248" width="10" height="112"/>
    <rect x="765" y="316" width="10" height="174"/>
    <rect x="980" y="446" width="10" height="38"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="115" y1="96" x2="323" y2="96" marker-end="url(#s3-call)"/>
    <path d="M335 126 H375 V162 H337" stroke-width="1.2" marker-end="url(#s3-call)"/>
    <path d="M335 182 H375 V218 H337" stroke-width="1.2" marker-end="url(#s3-call)"/>
    <line x1="335" y1="248" x2="543" y2="248" marker-end="url(#s3-call)"/>
    <line x1="325" y1="282" x2="117" y2="282" stroke-dasharray="5 4" marker-end="url(#s3-ret)"/>
    <line x1="765" y1="316" x2="557" y2="316" marker-end="url(#s3-call)"/>
    <line x1="555" y1="350" x2="763" y2="350" stroke-dasharray="5 4" marker-end="url(#s3-ret)"/>
    <path d="M775 380 H815 V416 H777" stroke-width="1.2" marker-end="url(#s3-call)"/>
    <line x1="775" y1="446" x2="978" y2="446" marker-end="url(#s3-call)"/>
    <line x1="980" y1="480" x2="777" y2="480" stroke-dasharray="5 4" marker-end="url(#s3-ret)"/>
  </g>
  <g style="font-size:11px" fill="#111111">
    <text x="220" y="89" text-anchor="middle">POST /admin/orgs/{id}/approve</text>
    <text x="383" y="130">validate transition</text>
    <text x="383" y="186">update status + audit entry</text>
    <text x="440" y="241" text-anchor="middle">publish org_approved</text>
    <text x="220" y="275" text-anchor="middle">200 OK</text>
    <text x="660" y="309" text-anchor="middle">long poll</text>
    <text x="660" y="343" text-anchor="middle">org_approved</text>
    <text x="823" y="384">write in-app notification</text>
    <text x="877" y="439" text-anchor="middle">send approval email</text>
    <text x="877" y="473" text-anchor="middle">accepted</text>
  </g>
</svg>
</div>

<!--
APPROVING AN ORGANISATION

One admin click, and the whole asynchronous path falls out of it.

Everything the admin waits for is the left half: validate the transition,
write the new status and the audit entry, publish one message, return 200.
The admin console is not waiting on an inbox.

The right half is the notifications service, which long-polls the queue
on its own schedule. It writes the in-app feed row first, then sends the
email. Those are separately tracked: a bounced email does not lose the
in-app notification, and a permanent delivery failure is recorded rather
than retried forever.

This is the same path every notification takes - claim created, claim
cancelled, pickup reminder, pickup completed, listing expired. Only the
publisher at the left end changes. That is why the listings service and
the profile service can both notify without knowing anything about email.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Appendix</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Design <span class="accent">patterns</span>
</div>

<div class="text-sm mt-10" style="color:#00000066">
Class diagrams for the four patterns the codebase leans on
</div>

<!--
DESIGN PATTERN SECTION MARKER

Class-diagram backing for the three patterns in section three, plus the
guard chain, which the main deck never names. Same white canvas as the
rest of the appendix.
-->

---
class: flex flex-col uml-slide
---

# Strategy

<div class="text-base mt-2" style="color:#00000099">One interface, two implementations, one factory</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 520" fill="none">
  <defs>
    <marker id="dp1-impl" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L12 6 L0 12 z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="dp1-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="6 4">
    <line x1="290" y1="112" x2="398" y2="112" marker-end="url(#dp1-dep)"/>
    <line x1="375" y1="278" x2="465" y2="190" marker-end="url(#dp1-impl)"/>
    <line x1="725" y1="278" x2="635" y2="190" marker-end="url(#dp1-impl)"/>
    <line x1="470" y1="438" x2="392" y2="392" marker-end="url(#dp1-dep)"/>
    <line x1="630" y1="438" x2="708" y2="392" marker-end="url(#dp1-dep)"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="400" y="36" width="300" height="150"/>
    <rect x="60" y="80" width="230" height="64"/>
    <rect x="250" y="280" width="250" height="110"/>
    <rect x="600" y="280" width="250" height="110"/>
    <rect x="430" y="440" width="240" height="56"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="400" y1="94" x2="700" y2="94"/>
    <line x1="250" y1="318" x2="500" y2="318"/>
    <line x1="600" y1="318" x2="850" y2="318"/>
  </g>
  <g text-anchor="middle" fill="#111111">
    <text x="550" y="60" style="font-size:11px;font-style:italic">&#171;interface&#187;</text>
    <text x="550" y="80" style="font-size:15px;font-weight:700">ListingsApi</text>
    <text x="175" y="104" style="font-size:11px;font-style:italic">&#171;component&#187;</text>
    <text x="175" y="126" style="font-size:14px;font-weight:600">web/platform</text>
    <text x="375" y="306" style="font-size:14px;font-weight:600">ListingsClient</text>
    <text x="725" y="306" style="font-size:14px;font-weight:600">MockListingsClient</text>
    <text x="550" y="462" style="font-size:11px;font-style:italic">&#171;factory&#187;</text>
    <text x="550" y="483" style="font-size:12px">createListingsClient(opts)</text>
  </g>
  <g style="font-size:11.5px" fill="#111111">
    <text x="414" y="116">+ listListings(query)</text>
    <text x="414" y="134">+ createRequest(request)</text>
    <text x="414" y="152">+ verifyPickupCode(id, code)</text>
    <text x="414" y="172" style="font-size:11px;font-style:italic" fill="#444444">+ 15 more operations</text>
    <text x="264" y="342">- baseUrl : string</text>
    <text x="264" y="360">- getToken() : string</text>
    <text x="264" y="380" style="font-size:11px;font-style:italic" fill="#444444">all 18 over fetch()</text>
    <text x="614" y="342">- listings : array of Listing</text>
    <text x="614" y="360">- requests : array of ListingRequest</text>
    <text x="614" y="380" style="font-size:11px;font-style:italic" fill="#444444">all 18 in memory</text>
  </g>
  <g style="font-size:10.5px" fill="#444444">
    <text x="344" y="104" text-anchor="middle">&#171;uses&#187;</text>
    <text x="408" y="424" text-anchor="middle">&#171;creates&#187;</text>
    <text x="700" y="424" text-anchor="middle">&#171;creates&#187;</text>
  </g>
  <path d="M760 420 H1060 L1080 440 V496 H760 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1060 420 V440 H1080" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="774" y="442" style="font-size:11px;font-weight:600" fill="#111111">note</text>
  <text x="774" y="462" style="font-size:11px" fill="#111111">opts.mock picks the implementation.</text>
  <text x="774" y="480" style="font-size:11px" fill="#111111">The app only ever holds ListingsApi.</text>
</svg>
</div>

<!--
STRATEGY

The listings SDK is the clean example. One interface, ListingsApi, with
eighteen operations. Two classes implement it. ListingsClient makes the
real HTTP calls with the user's bearer token. MockListingsClient keeps
everything in memory but mirrors the server's rules, including the status
transitions and the idempotency replay.

createListingsClient is the factory. It takes an options object, looks at
opts.mock, and hands back the interface. Nothing downstream knows which
object it is holding, so switching the whole frontend between a real
backend and a fake one is one boolean.

That is what let us build and demo the frontend before the listings
service existed.

If asked where else: the notification email templates are a
type-to-renderer map, which is the same idea keyed by event type instead
of by a flag, and the Go service passes Approve, Reject and Suspend into
one shared transition handler as functions.
-->

---
class: flex flex-col uml-slide
---

# Repository

<div class="text-base mt-2" style="color:#00000099">Services hold business rules, repositories hold queries</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 520" fill="none">
  <defs>
    <marker id="dp2-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="550" y1="84" x2="550" y2="128" marker-end="url(#dp2-dep)"/>
    <line x1="430" y1="242" x2="195" y2="288" marker-end="url(#dp2-dep)"/>
    <line x1="550" y1="242" x2="550" y2="288" marker-end="url(#dp2-dep)"/>
    <line x1="670" y1="242" x2="905" y2="288" marker-end="url(#dp2-dep)"/>
    <line x1="175" y1="384" x2="425" y2="438" marker-end="url(#dp2-dep)"/>
    <line x1="550" y1="384" x2="550" y2="438" marker-end="url(#dp2-dep)"/>
    <line x1="925" y1="384" x2="675" y2="438" marker-end="url(#dp2-dep)"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="410" y="24" width="280" height="60"/>
    <rect x="380" y="130" width="340" height="112"/>
    <rect x="50" y="290" width="250" height="94"/>
    <rect x="425" y="290" width="250" height="94"/>
    <rect x="800" y="290" width="250" height="94"/>
    <rect x="400" y="440" width="300" height="60"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="380" y1="166" x2="720" y2="166"/>
    <line x1="50" y1="326" x2="300" y2="326"/>
    <line x1="425" y1="326" x2="675" y2="326"/>
    <line x1="800" y1="326" x2="1050" y2="326"/>
  </g>
  <g text-anchor="middle" fill="#111111">
    <text x="550" y="50" style="font-size:11px;font-style:italic">&#171;controller&#187;</text>
    <text x="550" y="71" style="font-size:14px;font-weight:600">RequestsController</text>
    <text x="550" y="156" style="font-size:14px;font-weight:600">RequestsService</text>
    <text x="175" y="316" style="font-size:13.5px;font-weight:600">RequestsRepository</text>
    <text x="550" y="316" style="font-size:13.5px;font-weight:600">IdempotencyRepository</text>
    <text x="925" y="316" style="font-size:13.5px;font-weight:600">AuditRepository</text>
    <text x="550" y="466" style="font-size:11px;font-style:italic">&#171;database&#187;</text>
    <text x="550" y="487" style="font-size:13.5px;font-weight:600">PostgreSQL via Drizzle</text>
  </g>
  <g style="font-size:11.5px" fill="#111111">
    <text x="394" y="188">+ create(dto, user)</text>
    <text x="394" y="206">+ decide(id, dto, user)</text>
    <text x="394" y="224">+ verifyPickupCode(id, dto, user)</text>
    <text x="64" y="350">+ reserveListingForClaim()</text>
    <text x="64" y="370">+ updateStatus()</text>
    <text x="439" y="350">+ claimSlot()</text>
    <text x="439" y="370">+ complete()</text>
    <text x="814" y="350">+ record()</text>
    <text x="814" y="370">+ findMany()</text>
  </g>
  <path d="M40 24 H340 L360 44 V100 H40 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M340 24 V44 H360" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="54" y="46" style="font-size:11px;font-weight:600" fill="#111111">note</text>
  <text x="54" y="66" style="font-size:11px" fill="#111111">No SQL above this line. Unit tests swap</text>
  <text x="54" y="84" style="font-size:11px" fill="#111111">the repositories for in-memory fakes.</text>
</svg>
</div>

<!--
REPOSITORY

Three layers. The controller does HTTP: parse, validate the DTO, run the
guards. The service does business rules: transition validity, who is
allowed, what the relist policy says. The repositories do queries, and
nothing else.

The payoff is the middle layer. RequestsService is where all the
interesting logic lives, and it has no SQL in it, so its tests construct
it with fake repositories and run in milliseconds with no database.

One repository per concern rather than one giant data layer:
RequestsRepository owns claims, IdempotencyRepository owns the key table,
AuditRepository owns the append-only log. The service composes them, and
passes a transaction handle down when several have to commit together.

The Go profile service does the same thing with its store package.
-->

---
class: flex flex-col uml-slide
---

# Observer

<div class="text-base mt-2" style="color:#00000099">Publish and forget; the queue is the only coupling</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440" fill="none">
  <defs>
    <marker id="dp3-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="220" y1="86" x2="276" y2="176" marker-end="url(#dp3-dep)"/>
    <line x1="220" y1="154" x2="276" y2="182" marker-end="url(#dp3-dep)"/>
    <line x1="220" y1="222" x2="276" y2="192" marker-end="url(#dp3-dep)"/>
    <line x1="220" y1="290" x2="276" y2="200" marker-end="url(#dp3-dep)"/>
    <line x1="482" y1="185" x2="546" y2="185" marker-end="url(#dp3-dep)"/>
    <line x1="702" y1="185" x2="766" y2="185" marker-end="url(#dp3-dep)"/>
    <line x1="850" y1="227" x2="730" y2="316" marker-end="url(#dp3-dep)"/>
    <line x1="910" y1="227" x2="960" y2="316" marker-end="url(#dp3-dep)"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="30" y="60" width="190" height="52"/>
    <rect x="30" y="128" width="190" height="52"/>
    <rect x="30" y="196" width="190" height="52"/>
    <rect x="30" y="264" width="190" height="52"/>
    <rect x="280" y="145" width="200" height="80"/>
    <rect x="550" y="155" width="150" height="60"/>
    <rect x="770" y="145" width="220" height="80"/>
    <rect x="600" y="318" width="230" height="60"/>
    <rect x="870" y="318" width="190" height="60"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="280" y1="182" x2="480" y2="182"/>
    <line x1="770" y1="182" x2="990" y2="182"/>
  </g>
  <g text-anchor="middle" fill="#111111">
    <text x="125" y="91" style="font-size:12.5px;font-weight:600">RequestsService</text>
    <text x="125" y="159" style="font-size:12.5px;font-weight:600">ListingExpiryService</text>
    <text x="125" y="227" style="font-size:12.5px;font-weight:600">PickupReminderService</text>
    <text x="125" y="295" style="font-size:12.5px;font-weight:600">Profile API (Go)</text>
    <text x="380" y="170" style="font-size:13.5px;font-weight:600">NotificationsPublisher</text>
    <text x="625" y="180" style="font-size:11px;font-style:italic">&#171;queue&#187;</text>
    <text x="625" y="201" style="font-size:14px;font-weight:600">Amazon SQS</text>
    <text x="880" y="170" style="font-size:13.5px;font-weight:600">SqsConsumerService</text>
    <text x="715" y="344" style="font-size:11px;font-style:italic">&#171;in-app feed&#187;</text>
    <text x="715" y="365" style="font-size:13px;font-weight:600">NotificationsRepository</text>
    <text x="965" y="344" style="font-size:11px;font-style:italic">&#171;email&#187;</text>
    <text x="965" y="365" style="font-size:13px;font-weight:600">MailerService</text>
  </g>
  <g style="font-size:11.5px" fill="#111111">
    <text x="294" y="204">+ publish(type, to, payload)</text>
    <text x="784" y="204">+ process(message)</text>
  </g>
  <g style="font-size:10.5px" fill="#444444" text-anchor="middle">
    <text x="514" y="177">&#171;publish&#187;</text>
    <text x="734" y="177">&#171;consume&#187;</text>
  </g>
  <path d="M30 348 H400 L420 368 V424 H30 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M400 348 V368 H420" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="44" y="370" style="font-size:11px;font-weight:600" fill="#111111">note</text>
  <text x="44" y="390" style="font-size:11px" fill="#111111">The two services never import each other.</text>
  <text x="44" y="408" style="font-size:11px" fill="#111111">Publishing is best effort and post-commit.</text>
</svg>
</div>

<!--
OBSERVER

Four publishers on the left, one consumer on the right, and nothing in
between except the queue. When a claim is created, cancelled or
completed, the listings service drops an event and moves on. The Go
profile service does the same for organisation approval and welcome
emails.

The notification service long-polls the queue, renders the template for
that event type, writes the in-app feed row and sends the email. Those
two deliveries are tracked separately, so a bounced email does not lose
the in-app notification.

Two things worth saying. Publishing happens after the database commit and
is deliberately best effort: a failed publish logs and moves on rather
than rolling back a claim that genuinely happened. And a message that
keeps failing goes to a dead letter queue rather than blocking the
others.

This is how we added the entire notification service without touching the
claim flow.
-->

---
class: flex flex-col uml-slide
---

# Chain of responsibility

<div class="text-base mt-2" style="color:#00000099">Every request walks the guard chain before a handler sees it</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 400" fill="none">
  <defs>
    <marker id="dp4-impl" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L12 6 L0 12 z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="dp4-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <g stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="6 4">
    <line x1="305" y1="168" x2="452" y2="112" marker-end="url(#dp4-impl)"/>
    <line x1="530" y1="168" x2="530" y2="112" marker-end="url(#dp4-impl)"/>
    <line x1="765" y1="168" x2="618" y2="112" marker-end="url(#dp4-impl)"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="172" y1="210" x2="211" y2="210" marker-end="url(#dp4-dep)"/>
    <line x1="397" y1="210" x2="436" y2="210" marker-end="url(#dp4-dep)"/>
    <line x1="622" y1="210" x2="661" y2="210" marker-end="url(#dp4-dep)"/>
    <line x1="867" y1="210" x2="906" y2="210" marker-end="url(#dp4-dep)"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="5 4">
    <line x1="305" y1="252" x2="448" y2="316" marker-end="url(#dp4-dep)"/>
    <line x1="530" y1="252" x2="542" y2="316" marker-end="url(#dp4-dep)"/>
    <line x1="765" y1="252" x2="652" y2="316" marker-end="url(#dp4-dep)"/>
  </g>
  <g fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4">
    <rect x="400" y="20" width="260" height="90"/>
    <rect x="20" y="185" width="150" height="50"/>
    <rect x="215" y="170" width="180" height="82"/>
    <rect x="440" y="170" width="180" height="82"/>
    <rect x="665" y="170" width="200" height="82"/>
    <rect x="908" y="185" width="172" height="50"/>
    <rect x="430" y="318" width="240" height="56"/>
  </g>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="400" y1="72" x2="660" y2="72"/>
    <line x1="215" y1="208" x2="395" y2="208"/>
    <line x1="440" y1="208" x2="620" y2="208"/>
    <line x1="665" y1="208" x2="865" y2="208"/>
  </g>
  <g text-anchor="middle" fill="#111111">
    <text x="530" y="44" style="font-size:11px;font-style:italic">&#171;interface&#187;</text>
    <text x="530" y="64" style="font-size:15px;font-weight:700">CanActivate</text>
    <text x="95" y="215" style="font-size:12.5px;font-weight:600">HTTP request</text>
    <text x="305" y="196" style="font-size:13.5px;font-weight:600">JwtAuthGuard</text>
    <text x="530" y="196" style="font-size:13.5px;font-weight:600">ThrottlerGuard</text>
    <text x="765" y="196" style="font-size:13.5px;font-weight:600">OrgMembershipGuard</text>
    <text x="994" y="207" style="font-size:11px;font-style:italic">&#171;handler&#187;</text>
    <text x="994" y="226" style="font-size:12.5px;font-weight:600">create()</text>
    <text x="550" y="342" style="font-size:11px;font-style:italic">&#171;rejected&#187;</text>
    <text x="550" y="363" style="font-size:13px;font-weight:600">Problem+JSON response</text>
  </g>
  <text x="414" y="94" style="font-size:11.5px" fill="#111111">+ canActivate(context) : boolean</text>
  <g text-anchor="middle" style="font-size:10.5px;font-style:italic" fill="#444444">
    <text x="305" y="232">verifies the bearer token</text>
    <text x="530" y="232">rate limits per caller</text>
    <text x="765" y="232">org approved, user active</text>
  </g>
  <g style="font-size:10.5px" fill="#444444">
    <text x="330" y="296">401</text>
    <text x="500" y="296">429</text>
    <text x="712" y="296">403</text>
  </g>
</svg>
</div>

<!--
CHAIN OF RESPONSIBILITY

This one the main deck never names, but it is the pattern doing the most
work. Every request walks the same chain, and any link can stop it.

JwtAuthGuard runs first and globally: no valid bearer token, 401, and
nothing downstream executes. ThrottlerGuard runs second, deliberately
after the auth guard because it keys its rate limit on the caller the
auth guard resolved. Then the route-level guard, which varies by
endpoint: OrgMembershipGuard for anything that writes, the admin guard
for the audit log.

They all implement the same CanActivate interface, which is what makes
them composable. The controller method is never reached unless every link
returns true, so the handler itself contains no authorisation code at
all.

If asked about ordering: it is explicit, not accidental. The comment in
app.module.ts says why the throttler must come second.
-->

---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Appendix</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Data <span class="accent">model</span>
</div>

<div class="text-sm mt-10" style="color:#00000066">
Nine tables across two databases
</div>

<!--
DATA MODEL SECTION MARKER

One entity relationship overview, then every table with its columns. Two
databases: listings and profile share one, notifications owns its own.
-->

---
class: flex flex-col uml-slide
---

# Entity relationships

<div class="text-base mt-2" style="color:#00000099">Nine tables; primary and foreign keys only</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 540" fill="none">
  <defs>
    <marker id="erd-many" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12" fill="none" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="erd-one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M6 1 V11" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
    </marker>
  </defs>
  <rect x="40" y="40" width="220" height="69" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="86" x2="260" y2="86" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="150.0" y="57" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile</text>
  <text x="150.0" y="77" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">organisations</text>
  <text x="49" y="98" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="98" style="font-size:10.5px" fill="#111111">id</text>
  <text x="251" y="98" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="40" y="140" width="220" height="86" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="186" x2="260" y2="186" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="150.0" y="157" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile</text>
  <text x="150.0" y="177" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">users</text>
  <text x="49" y="198" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="198" style="font-size:10.5px" fill="#111111">id</text>
  <text x="251" y="198" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="49" y="215" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="74" y="215" style="font-size:10.5px" fill="#111111">org_id</text>
  <text x="251" y="215" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="40" y="262" width="220" height="69" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="308" x2="260" y2="308" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="150.0" y="279" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile</text>
  <text x="150.0" y="299" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">login_restrictions</text>
  <text x="49" y="320" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="320" style="font-size:10.5px" fill="#111111">username</text>
  <text x="251" y="320" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <rect x="400" y="40" width="240" height="103" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="400" y1="86" x2="640" y2="86" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="520.0" y="57" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings</text>
  <text x="520.0" y="77" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">listings</text>
  <text x="409" y="98" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="434" y="98" style="font-size:10.5px" fill="#111111">id</text>
  <text x="631" y="98" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="115" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="115" style="font-size:10.5px" fill="#111111">donor_org_id</text>
  <text x="631" y="115" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="132" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="132" style="font-size:10.5px" fill="#111111">created_by</text>
  <text x="631" y="132" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="400" y="200" width="240" height="120" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="400" y1="246" x2="640" y2="246" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="520.0" y="217" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings</text>
  <text x="520.0" y="237" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">requests</text>
  <text x="409" y="258" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="434" y="258" style="font-size:10.5px" fill="#111111">id</text>
  <text x="631" y="258" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="275" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="275" style="font-size:10.5px" fill="#111111">listing_id</text>
  <text x="631" y="275" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="292" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="292" style="font-size:10.5px" fill="#111111">rescue_org_id</text>
  <text x="631" y="292" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="309" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="309" style="font-size:10.5px" fill="#111111">claimed_by</text>
  <text x="631" y="309" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="400" y="372" width="240" height="103" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="400" y1="418" x2="640" y2="418" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="520.0" y="389" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings</text>
  <text x="520.0" y="409" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">audit_log</text>
  <text x="409" y="430" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="434" y="430" style="font-size:10.5px" fill="#111111">id</text>
  <text x="631" y="430" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="447" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="447" style="font-size:10.5px" fill="#111111">user_id</text>
  <text x="631" y="447" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="409" y="464" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="434" y="464" style="font-size:10.5px" fill="#111111">org_id</text>
  <text x="631" y="464" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="780" y="40" width="250" height="86" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="780" y1="86" x2="1030" y2="86" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="905.0" y="57" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings</text>
  <text x="905.0" y="77" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">listing_images</text>
  <text x="789" y="98" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="814" y="98" style="font-size:10.5px" fill="#111111">id</text>
  <text x="1021" y="98" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="789" y="115" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="814" y="115" style="font-size:10.5px" fill="#111111">listing_id</text>
  <text x="1021" y="115" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="780" y="200" width="250" height="103" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="780" y1="246" x2="1030" y2="246" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="905.0" y="217" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings</text>
  <text x="905.0" y="237" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">request_idempotency_keys</text>
  <text x="789" y="258" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="814" y="258" style="font-size:10.5px" fill="#111111">id</text>
  <text x="1021" y="258" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="789" y="275" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="814" y="275" style="font-size:10.5px" fill="#111111">rescue_org_id</text>
  <text x="1021" y="275" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="789" y="292" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="814" y="292" style="font-size:10.5px" fill="#111111">claim_id</text>
  <text x="1021" y="292" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <rect x="780" y="372" width="250" height="69" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="780" y1="418" x2="1030" y2="418" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="905.0" y="389" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">notifications db</text>
  <text x="905.0" y="409" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">notifications</text>
  <text x="789" y="430" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="814" y="430" style="font-size:10.5px" fill="#111111">id</text>
  <text x="1021" y="430" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <line x1="150" y1="92" x2="150" y2="138" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <line x1="262" y1="66" x2="398" y2="70" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="330" y="52" text-anchor="middle" style="font-size:9.5px" fill="#444444">donor_org_id</text>
  <line x1="262" y1="158" x2="398" y2="104" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="330" y="148" text-anchor="middle" style="font-size:9.5px" fill="#444444">created_by</text>
  <line x1="262" y1="82" x2="398" y2="222" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="345" y="175" text-anchor="middle" style="font-size:9.5px" fill="#444444">rescue_org_id</text>
  <line x1="262" y1="186" x2="398" y2="250" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="318" y="232" text-anchor="middle" style="font-size:9.5px" fill="#444444">claimed_by</text>
  <line x1="520" y1="131" x2="520" y2="198" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="566" y="168" text-anchor="middle" style="font-size:9.5px" fill="#444444">listing_id</text>
  <line x1="262" y1="200" x2="398" y2="398" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="305" y="300" text-anchor="middle" style="font-size:9.5px" fill="#444444">user_id</text>
  <line x1="642" y1="74" x2="778" y2="74" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="710" y="62" text-anchor="middle" style="font-size:9.5px" fill="#444444">listing_id</text>
  <line x1="642" y1="248" x2="778" y2="248" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd-one)" marker-end="url(#erd-many)"/>
  <text x="710" y="236" text-anchor="middle" style="font-size:9.5px" fill="#444444">claim_id</text>
  <path d="M40 352 H342 L360 370 V433 H40 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M342 352 V370 H360" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="52" y="371" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="52" y="390" style="font-size:10.5px" fill="#111111">login_restrictions keys on username, not a FK.</text>
  <text x="52" y="407" style="font-size:10.5px" fill="#111111">requests also references users via cancelled_by,</text>
  <text x="52" y="424" style="font-size:10.5px" fill="#111111">verified_by, code_generated_by and no_show_by.</text>
  <path d="M780 462 H1012 L1030 480 V526 H780 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1012 462 V480 H1030" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="792" y="481" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="792" y="500" style="font-size:10.5px" fill="#111111">Separate database. No joins</text>
  <text x="792" y="517" style="font-size:10.5px" fill="#111111">to the tables on the left.</text>
</svg>
</div>

<!--
ENTITY RELATIONSHIPS

Nine tables. Everything on this slide except notifications lives in one
physical Postgres database, which matters: the foreign keys between
listings and profile are real constraints, not conventions, so the
database refuses a claim from an organisation that does not exist.

Ownership is still split. The profile service migrates organisations,
users and login_restrictions in Go; the listings service migrates the
rest with Drizzle, and deliberately excludes the profile tables from its
schema scan so it can never alter them.

notifications is the exception. Its own database, its own role, no
foreign key to anything here, because a delivery record never needs to
join a listing. recipient_user_id is a Cognito sub, stored as text.

The one-to-many from listings to requests is constrained further than the
diagram shows: a partial unique index allows at most one active claim per
listing. That is the line that enforces first come first served.
-->

---
class: flex flex-col uml-slide
---

# listings &amp; listing_images

<div class="text-base mt-2" style="color:#00000099">The donated lot and its photos</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440" fill="none">
  <defs>
    <marker id="erd2-many" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12" fill="none" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="erd2-one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M6 1 V11" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
    </marker>
  </defs>
  <rect x="40" y="30" width="300" height="392" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="76" x2="340" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="190.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service</text>
  <text x="190.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">listings</text>
  <text x="49" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="331" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="49" y="105" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="74" y="105" style="font-size:10.5px" fill="#111111">donor_org_id</text>
  <text x="331" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="49" y="122" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="74" y="122" style="font-size:10.5px" fill="#111111">created_by</text>
  <text x="331" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="74" y="139" style="font-size:10.5px" fill="#111111">category</text>
  <text x="331" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">listing_category</text>
  <text x="74" y="156" style="font-size:10.5px" fill="#111111">description</text>
  <text x="331" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="173" style="font-size:10.5px" fill="#111111">quantity</text>
  <text x="331" y="173" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">numeric(10,2)</text>
  <text x="74" y="190" style="font-size:10.5px" fill="#111111">unit</text>
  <text x="331" y="190" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="207" style="font-size:10.5px" fill="#111111">allergens</text>
  <text x="331" y="207" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text array</text>
  <text x="74" y="224" style="font-size:10.5px" fill="#111111">handling_instructions</text>
  <text x="331" y="224" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="241" style="font-size:10.5px" fill="#111111">use_by</text>
  <text x="331" y="241" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="258" style="font-size:10.5px" fill="#111111">pickup_location</text>
  <text x="331" y="258" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="275" style="font-size:10.5px" fill="#111111">pickup_window_start</text>
  <text x="331" y="275" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="292" style="font-size:10.5px" fill="#111111">pickup_window_end</text>
  <text x="331" y="292" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="309" style="font-size:10.5px" fill="#111111">status</text>
  <text x="331" y="309" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">listing_status</text>
  <text x="74" y="326" style="font-size:10.5px" fill="#111111">version</text>
  <text x="331" y="326" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">integer</text>
  <text x="74" y="343" style="font-size:10.5px" fill="#111111">cancelled_reason</text>
  <text x="331" y="343" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="360" style="font-size:10.5px" fill="#111111">published_at</text>
  <text x="331" y="360" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="377" style="font-size:10.5px" fill="#111111">deleted_at</text>
  <text x="331" y="377" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="394" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="331" y="394" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="411" style="font-size:10.5px" fill="#111111">updated_at</text>
  <text x="331" y="411" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="470" y="30" width="290" height="137" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="470" y1="76" x2="760" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="615.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service</text>
  <text x="615.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">listing_images</text>
  <text x="479" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="504" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="751" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="479" y="105" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="504" y="105" style="font-size:10.5px" fill="#111111">listing_id</text>
  <text x="751" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid  on delete cascade</text>
  <text x="504" y="122" style="font-size:10.5px" fill="#111111">s3_key</text>
  <text x="751" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="504" y="139" style="font-size:10.5px" fill="#111111">position</text>
  <text x="751" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">integer</text>
  <text x="504" y="156" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="751" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <line x1="342" y1="70" x2="468" y2="70" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd2-one)" marker-end="url(#erd2-many)"/>
  <text x="405" y="58" text-anchor="middle" style="font-size:9.5px" fill="#444444">1 .. many</text>
  <path d="M470 190 H742 L760 208 V271 H470 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M742 190 V208 H760" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="482" y="209" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="482" y="228" style="font-size:10.5px" fill="#111111">unique (listing_id, position)</text>
  <text x="482" y="245" style="font-size:10.5px" fill="#111111">Key only, never a URL, so the bucket</text>
  <text x="482" y="262" style="font-size:10.5px" fill="#111111">or CDN can change without a migration.</text>
  <path d="M800 30 H1052 L1070 48 V145 H800 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1052 30 V48 H1070" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="812" y="49" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="812" y="68" style="font-size:10.5px" fill="#111111">CHECK constraints</text>
  <text x="812" y="85" style="font-size:10.5px" fill="#111111">pickup_window_end &gt; start</text>
  <text x="812" y="102" style="font-size:10.5px" fill="#111111">quantity &gt;= 0</text>
  <text x="812" y="119" style="font-size:10.5px" fill="#111111">draft has no published_at</text>
  <text x="812" y="136" style="font-size:10.5px" fill="#111111">available implies every field set</text>
  <path d="M800 210 H1052 L1070 228 V291 H800 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1052 210 V228 H1070" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="812" y="229" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="812" y="248" style="font-size:10.5px" fill="#111111">deleted_at is a soft delete.</text>
  <text x="812" y="265" style="font-size:10.5px" fill="#111111">Every read path filters it out,</text>
  <text x="812" y="282" style="font-size:10.5px" fill="#111111">so history survives a delete.</text>
  <path d="M800 350 H1052 L1070 368 V414 H800 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1052 350 V368 H1070" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="812" y="369" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="812" y="388" style="font-size:10.5px" fill="#111111">version drives optimistic</text>
  <text x="812" y="405" style="font-size:10.5px" fill="#111111">locking on update.</text>
</svg>
</div>

<!--
LISTINGS & LISTING_IMAGES

Most columns are nullable on purpose. A donor can save a draft with two
fields filled in, so the schema cannot require the rest. What stops a
half-finished listing going live is the available_listing_is_complete
check constraint, which only applies once status becomes available. The
service validates the same rule; the constraint is the backstop for
anything that reaches the table another way.

allergens is the exception, not null with an empty array default, because
an empty array is itself the "not declared yet" state. There is no
separate null to represent.

Soft delete rather than a real delete: deleted_at set, every read path
filters it, and the row plus its audit history stays. version is the
optimistic lock, bumped on every update, so two donors editing the same
listing cannot silently overwrite each other.

listing_images stores the S3 key only. A bucket, region or CDN domain
change is then a config change, not a data migration.
-->

---
class: flex flex-col uml-slide
---

# requests

<div class="text-base mt-2" style="color:#00000099">One claim on one listing, start to finish</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 500" fill="none">
  <defs>
    <marker id="erd3-many" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12" fill="none" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="erd3-one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M6 1 V11" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
    </marker>
  </defs>
  <rect x="30" y="24" width="310" height="290" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="30" y1="70" x2="340" y2="70" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="185.0" y="41" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service  (1 of 2)</text>
  <text x="185.0" y="61" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">requests</text>
  <text x="39" y="82" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="64" y="82" style="font-size:10.5px" fill="#111111">id</text>
  <text x="331" y="82" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="39" y="99" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="64" y="99" style="font-size:10.5px" fill="#111111">listing_id</text>
  <text x="331" y="99" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="39" y="116" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="64" y="116" style="font-size:10.5px" fill="#111111">rescue_org_id</text>
  <text x="331" y="116" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="39" y="133" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="64" y="133" style="font-size:10.5px" fill="#111111">claimed_by</text>
  <text x="331" y="133" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="64" y="150" style="font-size:10.5px" fill="#111111">status</text>
  <text x="331" y="150" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">request_status</text>
  <text x="64" y="167" style="font-size:10.5px" fill="#111111">requested_quantity</text>
  <text x="331" y="167" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">numeric(10,2)</text>
  <text x="64" y="184" style="font-size:10.5px" fill="#111111">requested_at</text>
  <text x="331" y="184" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="64" y="201" style="font-size:10.5px" fill="#111111">cancelled_at</text>
  <text x="331" y="201" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="64" y="218" style="font-size:10.5px" fill="#111111">cancellation_reason</text>
  <text x="331" y="218" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="39" y="235" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="64" y="235" style="font-size:10.5px" fill="#111111">cancelled_by</text>
  <text x="331" y="235" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="39" y="252" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="64" y="252" style="font-size:10.5px" fill="#111111">cancelled_by_org_id</text>
  <text x="331" y="252" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="64" y="269" style="font-size:10.5px" fill="#111111">pickup_code</text>
  <text x="331" y="269" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="64" y="286" style="font-size:10.5px" fill="#111111">pickup_code_hash</text>
  <text x="331" y="286" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="64" y="303" style="font-size:10.5px" fill="#111111">code_expires_at</text>
  <text x="331" y="303" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="360" y="24" width="320" height="290" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="360" y1="70" x2="680" y2="70" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="520.0" y="41" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service  (2 of 2)</text>
  <text x="520.0" y="61" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">requests</text>
  <text x="369" y="82" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="394" y="82" style="font-size:10.5px" fill="#111111">code_generated_by</text>
  <text x="671" y="82" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="394" y="99" style="font-size:10.5px" fill="#111111">pickup_code_generated_at</text>
  <text x="671" y="99" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="116" style="font-size:10.5px" fill="#111111">pickup_code_attempts</text>
  <text x="671" y="116" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">integer</text>
  <text x="369" y="133" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="394" y="133" style="font-size:10.5px" fill="#111111">verified_by</text>
  <text x="671" y="133" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="394" y="150" style="font-size:10.5px" fill="#111111">collected_quantity</text>
  <text x="671" y="150" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">numeric(10,2)</text>
  <text x="394" y="167" style="font-size:10.5px" fill="#111111">collected_at</text>
  <text x="671" y="167" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="184" style="font-size:10.5px" fill="#111111">no_show_at</text>
  <text x="671" y="184" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="201" style="font-size:10.5px" fill="#111111">no_show_reason</text>
  <text x="671" y="201" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="369" y="218" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="394" y="218" style="font-size:10.5px" fill="#111111">no_show_by</text>
  <text x="671" y="218" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="369" y="235" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="394" y="235" style="font-size:10.5px" fill="#111111">no_show_by_org_id</text>
  <text x="671" y="235" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="394" y="252" style="font-size:10.5px" fill="#111111">pickup_open_reminder_sent_at</text>
  <text x="671" y="252" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="269" style="font-size:10.5px" fill="#111111">pickup_close_reminder_sent_at</text>
  <text x="671" y="269" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="286" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="671" y="286" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="394" y="303" style="font-size:10.5px" fill="#111111">updated_at</text>
  <text x="671" y="303" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="730" y="24" width="330" height="205" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="730" y1="70" x2="1060" y2="70" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="895.0" y="41" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service</text>
  <text x="895.0" y="61" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">request_idempotency_keys</text>
  <text x="739" y="82" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="764" y="82" style="font-size:10.5px" fill="#111111">id</text>
  <text x="1051" y="82" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="739" y="99" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="764" y="99" style="font-size:10.5px" fill="#111111">rescue_org_id</text>
  <text x="1051" y="99" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="764" y="116" style="font-size:10.5px" fill="#111111">idempotency_key</text>
  <text x="1051" y="116" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="764" y="133" style="font-size:10.5px" fill="#111111">request_fingerprint</text>
  <text x="1051" y="133" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text  sha256</text>
  <text x="764" y="150" style="font-size:10.5px" fill="#111111">status</text>
  <text x="1051" y="150" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">idempotency_status</text>
  <text x="739" y="167" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="764" y="167" style="font-size:10.5px" fill="#111111">claim_id</text>
  <text x="1051" y="167" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="764" y="184" style="font-size:10.5px" fill="#111111">response_snapshot</text>
  <text x="1051" y="184" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">jsonb</text>
  <text x="764" y="201" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="1051" y="201" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="764" y="218" style="font-size:10.5px" fill="#111111">expires_at</text>
  <text x="1051" y="218" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <line x1="682" y1="60" x2="728" y2="60" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd3-one)" marker-end="url(#erd3-many)"/>
  <path d="M730 240 H1042 L1060 258 V338 H730 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1042 240 V258 H1060" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="742" y="259" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="742" y="278" style="font-size:10.5px" fill="#111111">unique (rescue_org_id, idempotency_key)</text>
  <text x="742" y="295" style="font-size:10.5px" fill="#111111">unique (listing_id) where status = 'active'</text>
  <text x="742" y="312" style="font-size:10.5px" fill="#111111">That partial index is what makes claiming</text>
  <text x="742" y="329" style="font-size:10.5px" fill="#111111">first come first served.</text>
  <path d="M730 370 H1042 L1060 388 V451 H730 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1042 370 V388 H1060" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="742" y="389" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="742" y="408" style="font-size:10.5px" fill="#111111">pickup_code is stored in clear so the</text>
  <text x="742" y="425" style="font-size:10.5px" fill="#111111">partner can be shown it again; the hash</text>
  <text x="742" y="442" style="font-size:10.5px" fill="#111111">backs the verify. Neither is serialised.</text>
</svg>
</div>

<!--
REQUESTS

The widest table in the system, split across two columns here. It is one
row per claim, and it carries the whole life of that claim rather than
spreading it over several tables.

Four groups. The claim itself at the top: which listing, which rescue
org, who clicked, how much. Then cancellation. Then the pickup code block
with its hash, expiry and attempt counter. Then the outcome, collected or
no-show, each recording the user and the org that reported it. The two
reminder timestamps at the end are markers so a one-shot reminder is sent
once, not every ten minutes.

Two unique indexes do the real work. One active claim per listing is a
partial index, so ending a claim frees the listing with no application
code. One idempotency key per rescue org makes a retried claim replay
instead of double booking.

pickup_code is stored in the clear alongside its hash. That is
deliberate: the partner needs to see it again after a reload, and the
hash is what the constant-time verify compares. Neither column is ever
serialised to a response.
-->

---
class: flex flex-col uml-slide
---

# organisations, users &amp; login_restrictions

<div class="text-base mt-2" style="color:#00000099">Owned and migrated by the Go profile service</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440" fill="none">
  <defs>
    <marker id="erd4-many" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12" fill="none" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="erd4-one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M6 1 V11" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
    </marker>
  </defs>
  <rect x="40" y="30" width="310" height="239" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="76" x2="350" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="195.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile service</text>
  <text x="195.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">organisations</text>
  <text x="49" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="341" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="49" y="105" style="font-size:8.5px;font-weight:700" fill="#444444">UK</text>
  <text x="74" y="105" style="font-size:10.5px" fill="#111111">name</text>
  <text x="341" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="122" style="font-size:10.5px" fill="#111111">type</text>
  <text x="341" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">org_type</text>
  <text x="74" y="139" style="font-size:10.5px" fill="#111111">status</text>
  <text x="341" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">org_status</text>
  <text x="49" y="156" style="font-size:8.5px;font-weight:700" fill="#444444">UK</text>
  <text x="74" y="156" style="font-size:10.5px" fill="#111111">domain</text>
  <text x="341" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text  partial</text>
  <text x="74" y="173" style="font-size:10.5px" fill="#111111">description</text>
  <text x="341" y="173" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="190" style="font-size:10.5px" fill="#111111">contact_email</text>
  <text x="341" y="190" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="207" style="font-size:10.5px" fill="#111111">contact_phone</text>
  <text x="341" y="207" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="224" style="font-size:10.5px" fill="#111111">address</text>
  <text x="341" y="224" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="241" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="341" y="241" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="74" y="258" style="font-size:10.5px" fill="#111111">updated_at</text>
  <text x="341" y="258" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="430" y="30" width="310" height="205" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="430" y1="76" x2="740" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="585.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile service</text>
  <text x="585.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">users</text>
  <text x="439" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="464" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="731" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="439" y="105" style="font-size:8.5px;font-weight:700" fill="#444444">UK</text>
  <text x="464" y="105" style="font-size:10.5px" fill="#111111">cognito_sub</text>
  <text x="731" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="122" style="font-size:10.5px" fill="#111111">email</text>
  <text x="731" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="139" style="font-size:10.5px" fill="#111111">name</text>
  <text x="731" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="439" y="156" style="font-size:8.5px;font-weight:700" fill="#444444">UK</text>
  <text x="464" y="156" style="font-size:10.5px" fill="#111111">username</text>
  <text x="731" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text  lower, partial</text>
  <text x="439" y="173" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="464" y="173" style="font-size:10.5px" fill="#111111">org_id</text>
  <text x="731" y="173" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid  nullable</text>
  <text x="464" y="190" style="font-size:10.5px" fill="#111111">is_admin</text>
  <text x="731" y="190" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">boolean</text>
  <text x="464" y="207" style="font-size:10.5px" fill="#111111">status</text>
  <text x="731" y="207" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="224" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="731" y="224" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="430" y="260" width="310" height="120" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="430" y1="306" x2="740" y2="306" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="585.0" y="277" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">profile service</text>
  <text x="585.0" y="297" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">login_restrictions</text>
  <text x="439" y="318" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="464" y="318" style="font-size:10.5px" fill="#111111">username</text>
  <text x="731" y="318" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="335" style="font-size:10.5px" fill="#111111">failed_count</text>
  <text x="731" y="335" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">integer</text>
  <text x="464" y="352" style="font-size:10.5px" fill="#111111">locked_until</text>
  <text x="731" y="352" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="464" y="369" style="font-size:10.5px" fill="#111111">updated_at</text>
  <text x="731" y="369" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <line x1="352" y1="70" x2="428" y2="70" stroke="#1a1a1a" stroke-width="1.1" marker-start="url(#erd4-one)" marker-end="url(#erd4-many)"/>
  <text x="390" y="58" text-anchor="middle" style="font-size:9.5px" fill="#444444">org_id</text>
  <path d="M790 30 H1047 L1065 48 V162 H790 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1047 30 V48 H1065" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="802" y="49" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="802" y="68" style="font-size:10.5px" fill="#111111">org_type</text>
  <text x="802" y="85" style="font-size:10.5px" fill="#111111">donor | rescue_partner</text>
  <text x="802" y="102" style="font-size:10.5px" fill="#111111"></text>
  <text x="802" y="119" style="font-size:10.5px" fill="#111111">org_status</text>
  <text x="802" y="136" style="font-size:10.5px" fill="#111111">pending | approved</text>
  <text x="802" y="153" style="font-size:10.5px" fill="#111111">rejected | suspended</text>
  <path d="M790 230 H1047 L1065 248 V311 H790 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1047 230 V248 H1065" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="802" y="249" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="802" y="268" style="font-size:10.5px" fill="#111111">No FK from login_restrictions.</text>
  <text x="802" y="285" style="font-size:10.5px" fill="#111111">A lockout has to work for a</text>
  <text x="802" y="302" style="font-size:10.5px" fill="#111111">username with no user row.</text>
  <path d="M40 300 H332 L350 318 V364 H40 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M332 300 V318 H350" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="52" y="319" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="52" y="338" style="font-size:10.5px" fill="#111111">org_id is nullable: platform</text>
  <text x="52" y="355" style="font-size:10.5px" fill="#111111">admins belong to no organisation.</text>
</svg>
</div>

<!--
PROFILE TABLES

Three tables, and every interesting rule is an index rather than
application code.

organisations.name is unique outright. domain is unique too, but
partially: the index only covers rows where domain is non-empty, so any
number of organisations can have no claimed domain while no two can claim
the same one. That is what makes signup able to find your organisation
from your email address.

users.cognito_sub is the link to the identity provider and is unique.
username has a unique index on lower(username), again partial, so
usernames are case-insensitively unique without forcing everyone to have
one. org_id is nullable because a platform administrator belongs to no
organisation, which is exactly why the listings guards treat "no org" and
"admin" as different cases.

login_restrictions deliberately has no foreign key. It is keyed on the
username string, because the whole point is to lock out repeated failed
attempts against a username that may not correspond to any user row.
-->

---
class: flex flex-col uml-slide
---

# audit_log &amp; notifications

<div class="text-base mt-2" style="color:#00000099">The append-only trail and the delivery record</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 440" fill="none">
  <defs>
    <marker id="erd5-many" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M0 6 L12 0 M0 6 L12 6 M0 6 L12 12" fill="none" stroke="#1a1a1a" stroke-width="1.2"/>
    </marker>
    <marker id="erd5-one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="11" markerHeight="11" orient="auto">
      <path d="M6 1 V11" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
    </marker>
  </defs>
  <rect x="40" y="30" width="320" height="222" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="40" y1="76" x2="360" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="200.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">listings service</text>
  <text x="200.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">audit_log</text>
  <text x="49" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="74" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="351" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="49" y="105" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="74" y="105" style="font-size:10.5px" fill="#111111">user_id</text>
  <text x="351" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid  nullable</text>
  <text x="49" y="122" style="font-size:8.5px;font-weight:700" fill="#444444">FK</text>
  <text x="74" y="122" style="font-size:10.5px" fill="#111111">org_id</text>
  <text x="351" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid  nullable</text>
  <text x="74" y="139" style="font-size:10.5px" fill="#111111">action</text>
  <text x="351" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="156" style="font-size:10.5px" fill="#111111">entity_type</text>
  <text x="351" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="173" style="font-size:10.5px" fill="#111111">entity_id</text>
  <text x="351" y="173" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid  nullable</text>
  <text x="74" y="190" style="font-size:10.5px" fill="#111111">subject</text>
  <text x="351" y="190" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="207" style="font-size:10.5px" fill="#111111">reason</text>
  <text x="351" y="207" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="74" y="224" style="font-size:10.5px" fill="#111111">metadata</text>
  <text x="351" y="224" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">jsonb</text>
  <text x="74" y="241" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="351" y="241" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <rect x="430" y="30" width="320" height="273" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <line x1="430" y1="76" x2="750" y2="76" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="590.0" y="47" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">notifications database</text>
  <text x="590.0" y="67" text-anchor="middle" style="font-size:13px;font-weight:700" fill="#111111">notifications</text>
  <text x="439" y="88" style="font-size:8.5px;font-weight:700" fill="#444444">PK</text>
  <text x="464" y="88" style="font-size:10.5px" fill="#111111">id</text>
  <text x="741" y="88" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">uuid</text>
  <text x="464" y="105" style="font-size:10.5px" fill="#111111">recipient_email</text>
  <text x="741" y="105" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="122" style="font-size:10.5px" fill="#111111">recipient_user_id</text>
  <text x="741" y="122" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text  cognito sub</text>
  <text x="464" y="139" style="font-size:10.5px" fill="#111111">type</text>
  <text x="741" y="139" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">notification_type</text>
  <text x="464" y="156" style="font-size:10.5px" fill="#111111">channel</text>
  <text x="741" y="156" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">notification_channel</text>
  <text x="464" y="173" style="font-size:10.5px" fill="#111111">payload</text>
  <text x="741" y="173" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">jsonb</text>
  <text x="464" y="190" style="font-size:10.5px" fill="#111111">status</text>
  <text x="741" y="190" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">notification_status</text>
  <text x="464" y="207" style="font-size:10.5px" fill="#111111">failure_reason</text>
  <text x="741" y="207" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="224" style="font-size:10.5px" fill="#111111">event_id</text>
  <text x="741" y="224" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="241" style="font-size:10.5px" fill="#111111">body</text>
  <text x="741" y="241" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">text</text>
  <text x="464" y="258" style="font-size:10.5px" fill="#111111">read_at</text>
  <text x="741" y="258" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="464" y="275" style="font-size:10.5px" fill="#111111">deleted_at</text>
  <text x="741" y="275" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <text x="464" y="292" style="font-size:10.5px" fill="#111111">created_at</text>
  <text x="741" y="292" text-anchor="end" style="font-size:9px;font-style:italic" fill="#555555">timestamptz</text>
  <path d="M40 268 H342 L360 286 V383 H40 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M342 268 V286 H360" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="52" y="287" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="52" y="306" style="font-size:10.5px" fill="#111111">Append only. A trigger rejects</text>
  <text x="52" y="323" style="font-size:10.5px" fill="#111111">every UPDATE and DELETE.</text>
  <text x="52" y="340" style="font-size:10.5px" fill="#111111">Both services insert here, so a</text>
  <text x="52" y="357" style="font-size:10.5px" fill="#111111">status change and its audit row</text>
  <text x="52" y="374" style="font-size:10.5px" fill="#111111">commit in one transaction.</text>
  <path d="M800 30 H1047 L1065 48 V145 H800 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1047 30 V48 H1065" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="812" y="49" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="812" y="68" style="font-size:10.5px" fill="#111111">notification_channel</text>
  <text x="812" y="85" style="font-size:10.5px" fill="#111111">email | in_app</text>
  <text x="812" y="102" style="font-size:10.5px" fill="#111111"></text>
  <text x="812" y="119" style="font-size:10.5px" fill="#111111">notification_status</text>
  <text x="812" y="136" style="font-size:10.5px" fill="#111111">sent | failed</text>
  <path d="M800 190 H1047 L1065 208 V322 H800 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1047 190 V208 H1065" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="812" y="209" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="812" y="228" style="font-size:10.5px" fill="#111111">Two partial unique indexes on</text>
  <text x="812" y="245" style="font-size:10.5px" fill="#111111">event_id dedupe delivery: one</text>
  <text x="812" y="262" style="font-size:10.5px" fill="#111111">email and one in-app row per</text>
  <text x="812" y="279" style="font-size:10.5px" fill="#111111">event per recipient, so a</text>
  <text x="812" y="296" style="font-size:10.5px" fill="#111111">redelivered message cannot</text>
  <text x="812" y="313" style="font-size:10.5px" fill="#111111">send twice.</text>
</svg>
</div>

<!--
AUDIT LOG & NOTIFICATIONS

audit_log is append only, and that is enforced by a database trigger that
rejects every update and delete, not by convention. Both services write
to it, which is the reason it sits in the shared database: an
organisation status change and its audit row commit in the same
transaction, so there is no window where one exists without the other.

Three columns are nullable for a reason. user_id is null for system
actions like the expiry sweep. entity_id is null when the subject has no
row to point at, a failed login against a username that does not exist,
and subject carries the raw identifier instead.

notifications is the one table in its own database. One row per delivery
attempt, not per event, so an email and an in-app notification for the
same event are two rows distinguished by channel.

event_id is what makes redelivery safe. Two partial unique indexes allow
exactly one sent email and one in-app row per event per recipient, so if
SQS delivers the same message twice the second insert loses. That is
deduplication in the schema rather than in the consumer.
-->


---
layout: section
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Appendix</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Architecture <span class="accent">design</span>
</div>

<div class="text-sm mt-10" style="color:#00000066">
Figures for chapter 2
</div>

<!--
ARCHITECTURE SECTION MARKER

Figures backing chapter two of the report. First up is the component
diagram for 2.2, service decomposition and bounded contexts.
-->

---
class: flex flex-col uml-slide
---

# Bounded contexts

<div class="text-base mt-2" style="color:#00000099">Three contexts, two integration patterns</div>

<div class="uml-figure">
<svg viewBox="0 0 1100 480" fill="none">
  <defs>
    <marker id="cm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <rect x="50" y="46" width="340" height="152" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6"/>
  <text x="220.0" y="66" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">&#171;bounded context&#187;</text>
  <text x="220.0" y="89" text-anchor="middle" style="font-size:16px;font-weight:700" fill="#111111">Identity &amp; Access</text>
  <line x1="50" y1="101" x2="390" y2="101" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="66" y="120" style="font-size:8.5px;font-weight:700;letter-spacing:0.08em" fill="#444444">AGGREGATES</text>
  <text x="66" y="140" style="font-size:12.5px" fill="#111111">Organisation</text>
  <text x="66" y="158" style="font-size:12.5px" fill="#111111">User</text>
  <line x1="50" y1="166" x2="390" y2="166" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="220.0" y="187" text-anchor="middle" style="font-size:11px" fill="#555555">service/profile  ·  Go</text>
  <rect x="50" y="286" width="340" height="152" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6"/>
  <text x="220.0" y="306" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">&#171;bounded context&#187;</text>
  <text x="220.0" y="329" text-anchor="middle" style="font-size:16px;font-weight:700" fill="#111111">Donation</text>
  <line x1="50" y1="341" x2="390" y2="341" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="66" y="360" style="font-size:8.5px;font-weight:700;letter-spacing:0.08em" fill="#444444">AGGREGATES</text>
  <text x="66" y="380" style="font-size:12.5px" fill="#111111">Listing</text>
  <text x="66" y="398" style="font-size:12.5px" fill="#111111">Claim</text>
  <line x1="50" y1="406" x2="390" y2="406" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="220.0" y="427" text-anchor="middle" style="font-size:11px" fill="#555555">service/listings  ·  NestJS</text>
  <rect x="700" y="186" width="340" height="134" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6"/>
  <text x="870.0" y="206" text-anchor="middle" style="font-size:9.5px;font-style:italic" fill="#444444">&#171;bounded context&#187;</text>
  <text x="870.0" y="229" text-anchor="middle" style="font-size:16px;font-weight:700" fill="#111111">Notification</text>
  <line x1="700" y1="241" x2="1040" y2="241" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="716" y="260" style="font-size:8.5px;font-weight:700;letter-spacing:0.08em" fill="#444444">AGGREGATES</text>
  <text x="716" y="280" style="font-size:12.5px" fill="#111111">Notification</text>
  <line x1="700" y1="288" x2="1040" y2="288" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="870.0" y="309" text-anchor="middle" style="font-size:11px" fill="#555555">service/notifications  ·  NestJS</text>
  <g stroke="#1a1a1a" stroke-width="1.3">
    <line x1="220" y1="200" x2="220" y2="284" marker-end="url(#cm-arr)"/>
    <line x1="392" y1="150" x2="698" y2="226" marker-end="url(#cm-arr)"/>
    <line x1="392" y1="345" x2="698" y2="296" marker-end="url(#cm-arr)"/>
  </g>
  <g style="font-size:11px;font-weight:700" fill="#111111">
    <text x="206" y="236" text-anchor="end">U</text>
    <text x="206" y="276" text-anchor="end">D</text>
    <text x="402" y="144">U</text>
    <text x="686" y="220" text-anchor="end">D</text>
    <text x="402" y="360">U</text>
    <text x="686" y="312" text-anchor="end">D</text>
  </g>
  <g style="font-size:11.5px;font-style:italic" fill="#111111">
    <text x="238" y="260">&#171;Conformist&#187;</text>
    <text x="545" y="172" text-anchor="middle">&#171;Published Language&#187;</text>
    <text x="545" y="340" text-anchor="middle">&#171;Published Language&#187;</text>
  </g>
  <path d="M560 380 H1022 L1040 398 V461 H560 Z" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.1"/>
  <path d="M1022 380 V398 H1040" fill="none" stroke="#1a1a1a" stroke-width="1.1"/>
  <text x="572" y="399" style="font-size:10px;font-weight:700" fill="#111111">note</text>
  <text x="572" y="418" style="font-size:10.5px" fill="#111111">U upstream, D downstream.</text>
  <text x="572" y="435" style="font-size:10.5px" fill="#111111">Conformist: the downstream context uses the upstream model as it is.</text>
  <text x="572" y="452" style="font-size:10.5px" fill="#111111">Published Language: a shared event envelope, owned by neither producer.</text>
</svg>
</div>

<!--
BOUNDED CONTEXTS

Three contexts, one service each, drawn where the model divides rather
than where the code happened to be split. Identity and Access owns
Organisation and User and answers who a caller is and whether they may
transact. Donation owns Listing and Claim and holds the whole donation
lifecycle. Notification owns Notification and cares only about getting a
message to a person. Each has its own ubiquitous language, and no term
crosses a boundary meaning two different things.

Two integration patterns, and both are deliberate.

Donation is a Conformist to Identity and Access. It consumes the
Organisation and User model exactly as that context defines it, with no
anticorruption layer. We chose conformity because the upstream model is
small, stable, and genuinely the same concept on both sides, so a
translation layer would have added cost without adding meaning. The
listings service mirrors the profile service's column definitions and
foreign-keys against them directly, while profile stays the sole owner of
their schema.

Both contexts are upstream of Notification through a Published Language:
a small envelope of type, channel, recipient and payload, published to a
queue, that belongs to neither producer's internal model. That is what
lets a Go service and a TypeScript service publish into the same
consumer, and lets Notification add channels or change templates without
either upstream knowing.

If asked why Conformist and not Shared Kernel: a shared kernel implies
neither side changes the model unilaterally. Here profile changes it
freely and listings follows, which is exactly the Conformist definition.
-->
---
class: flex flex-col uml-slide
---

# Logical architecture

<div class="uml-figure">
<svg viewBox="0 0 1100 368" fill="none">
  <defs>
    <marker id="sl-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#1a1a1a" stroke-width="1.3"/>
    </marker>
  </defs>
  <rect x="220" y="20" width="300" height="50" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="370.0" y="50.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Web app</text>
  <rect x="580" y="20" width="300" height="50" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="730.0" y="50.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Admin console</text>
  <text x="200" y="49" text-anchor="end" style="font-size:9.5px;font-weight:700;letter-spacing:0.08em" fill="#777777">CLIENTS</text>
  <rect x="220" y="112" width="660" height="46" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="550.0" y="140.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">API Gateway</text>
  <text x="200" y="139" text-anchor="end" style="font-size:9.5px;font-weight:700;letter-spacing:0.08em" fill="#777777">API</text>
  <rect x="220" y="200" width="200" height="56" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="320.0" y="233.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Profile</text>
  <rect x="450" y="200" width="200" height="56" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="550.0" y="233.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Listings</text>
  <rect x="680" y="200" width="200" height="56" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="780.0" y="233.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Notifications</text>
  <text x="200" y="233" text-anchor="end" style="font-size:9.5px;font-weight:700;letter-spacing:0.08em" fill="#777777">SERVICES</text>
  <rect x="220" y="298" width="660" height="50" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="550.0" y="328.0" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Shared PostgreSQL database</text>
  <text x="200" y="327" text-anchor="end" style="font-size:9.5px;font-weight:700;letter-spacing:0.08em" fill="#777777">DATA</text>
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="370" y1="72" x2="370" y2="110" marker-end="url(#sl-arr)"/>
    <line x1="730" y1="72" x2="730" y2="110" marker-end="url(#sl-arr)"/>
    <line x1="320" y1="160" x2="320" y2="198" marker-end="url(#sl-arr)"/>
    <line x1="550" y1="160" x2="550" y2="198" marker-end="url(#sl-arr)"/>
    <line x1="780" y1="160" x2="780" y2="198" marker-end="url(#sl-arr)"/>
    <line x1="320" y1="258" x2="320" y2="296" marker-end="url(#sl-arr)"/>
    <line x1="550" y1="258" x2="550" y2="296" marker-end="url(#sl-arr)"/>
    <line x1="780" y1="258" x2="780" y2="296" marker-end="url(#sl-arr)"/>
  </g>
</svg>
</div>

<!--
LOGICAL ARCHITECTURE

Four layers, read top to bottom.

Two clients. The platform web app is what donors and rescue partners use.
The admin console is a separate, smaller app for platform administrators,
and it is run locally rather than deployed.

Both go through one API gateway. That is the only publicly reachable
address in the system; it routes each request to a service purely on the
path, and every request past it carries a bearer token.

Three services, split by what they are responsible for. Profile owns
users, organisations and the approval workflow. Listings owns listings,
claims and pickup verification, so it holds the whole donation flow.
Notifications sends the email and serves the in-app alert feed.

All three read and write the same PostgreSQL database. That was a
deliberate choice: it keeps foreign keys between a claim and the
organisation that made it as real database constraints rather than
something the application has to check, and it lets a status change and
its audit record commit in one transaction.

If asked about the cost of a shared database: the services are coupled at
the storage layer, so a careless migration in one can break another. We
contain that by giving each service sole ownership of the tables it
migrates.
-->
---
class: flex flex-col uml-slide
---

# Use case model

<div class="uml-figure">
<svg viewBox="0 0 1100 470" fill="none">
  <g stroke="#1a1a1a" stroke-width="1.2">
    <line x1="138" y1="170" x2="298" y2="80"/>
    <line x1="138" y1="170" x2="298" y2="170"/>
    <line x1="138" y1="170" x2="298" y2="260"/>
    <line x1="962" y1="170" x2="802" y2="80"/>
    <line x1="962" y1="170" x2="802" y2="170"/>
    <line x1="962" y1="170" x2="802" y2="260"/>
    <line x1="138" y1="390" x2="293" y2="390"/>
    <line x1="962" y1="390" x2="807" y2="390"/>
  </g>
  <ellipse cx="400" cy="80" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="400" y="85" text-anchor="middle" style="font-size:13px" fill="#111111">Post a listing</text>
  <ellipse cx="400" cy="170" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="400" y="175" text-anchor="middle" style="font-size:13px" fill="#111111">Cancel a listing</text>
  <ellipse cx="400" cy="260" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="400" y="265" text-anchor="middle" style="font-size:13px" fill="#111111">Verify pickup</text>
  <ellipse cx="700" cy="80" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="700" y="85" text-anchor="middle" style="font-size:13px" fill="#111111">Browse listings</text>
  <ellipse cx="700" cy="170" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="700" y="175" text-anchor="middle" style="font-size:13px" fill="#111111">Claim a listing</text>
  <ellipse cx="700" cy="260" rx="102" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="700" y="265" text-anchor="middle" style="font-size:13px" fill="#111111">Cancel a claim</text>
  <ellipse cx="400" cy="390" rx="107" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="400" y="395" text-anchor="middle" style="font-size:13px" fill="#111111">Register organisation</text>
  <ellipse cx="700" cy="390" rx="107" ry="28" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.4"/>
  <text x="700" y="395" text-anchor="middle" style="font-size:13px" fill="#111111">Approve organisation</text>
  <g transform="translate(120,170)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Donor</text>
  </g>
  <g transform="translate(980,170)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Rescue partner</text>
  </g>
  <g transform="translate(120,390)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Guest</text>
  </g>
  <g transform="translate(980,390)">
    <g stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round">
      <circle cx="0" cy="-28" r="11"/>
      <line x1="0" y1="-17" x2="0" y2="12"/>
      <line x1="-16" y1="-6" x2="16" y2="-6"/>
      <line x1="0" y1="12" x2="-13" y2="33"/>
      <line x1="0" y1="12" x2="13" y2="33"/>
    </g>
    <text x="0" y="54" text-anchor="middle" style="font-size:14px;font-weight:700" fill="#111111">Platform administrator</text>
  </g>
</svg>
</div>

<!--
USE CASE MODEL

Four actors. A Guest has no account yet and can only register an
organisation, which is deliberately a public action because the first
person from a charity has nowhere to sign in to. A Platform administrator
approves that organisation, and until they do, nobody from it can post or
claim anything. That is why the bottom row comes first in any demo.

The top two rows are the donation flow itself, and it reads left to
right. A donor posts a listing. A rescue partner browses what is
available and claims one. The donor verifies the pickup when the partner
turns up, which is the only action that completes a claim. Either side
can cancel before that happens.

Claim a listing is the one that mattered most in design, because it is
the only place two users can collide: two rescue partners can want the
same tray of food at the same moment. The rest of the system is
single-actor and much less interesting.

Two notes on accuracy if anyone asks. Cancel a claim is drawn on the
rescue partner's side because that is the common case, but the API lets
either party to a claim cancel it. And there is no org-admin role in the
system; the profile service has exactly two roles, platform administrator
and member.
-->
---
class: flex flex-col uml-slide
---

# Domain model

<div class="uml-figure">
<svg viewBox="0 0 1100 470" fill="none">
  <g stroke="#1a1a1a" stroke-width="1.3">
    <line x1="320" y1="95" x2="418" y2="95"/>
    <line x1="190" y1="212" x2="190" y2="273"/>
    <line x1="322" y1="148" x2="416" y2="273"/>
    <line x1="320" y1="350" x2="418" y2="350"/>
    <line x1="682" y1="330" x2="778" y2="330"/>
  </g>
  <rect x="60" y="40" width="260" height="170" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="190.0" y="63" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#111111">Organisation</text>
  <line x1="60" y1="74" x2="320" y2="74" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="74" y="92" style="font-size:11.5px" fill="#111111">name</text>
  <text x="74" y="109" style="font-size:11.5px" fill="#111111">type</text>
  <text x="74" y="126" style="font-size:11.5px" fill="#111111">status</text>
  <text x="74" y="143" style="font-size:11.5px" fill="#111111">emailDomain</text>
  <line x1="60" y1="148" x2="320" y2="148" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="74" y="166" style="font-size:11.5px" fill="#111111">approve()</text>
  <text x="74" y="183" style="font-size:11.5px" fill="#111111">reject()</text>
  <text x="74" y="200" style="font-size:11.5px" fill="#111111">suspend()</text>
  <rect x="420" y="40" width="260" height="113" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="550.0" y="63" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#111111">User</text>
  <line x1="420" y1="74" x2="680" y2="74" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="434" y="92" style="font-size:11.5px" fill="#111111">name</text>
  <text x="434" y="109" style="font-size:11.5px" fill="#111111">username</text>
  <text x="434" y="126" style="font-size:11.5px" fill="#111111">email</text>
  <text x="434" y="143" style="font-size:11.5px" fill="#111111">isPlatformAdmin</text>
  <rect x="60" y="275" width="260" height="170" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="190.0" y="298" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#111111">Listing</text>
  <line x1="60" y1="309" x2="320" y2="309" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="74" y="327" style="font-size:11.5px" fill="#111111">contents</text>
  <text x="74" y="344" style="font-size:11.5px" fill="#111111">useBy</text>
  <text x="74" y="361" style="font-size:11.5px" fill="#111111">pickupWindow</text>
  <text x="74" y="378" style="font-size:11.5px" fill="#111111">status</text>
  <line x1="60" y1="383" x2="320" y2="383" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="74" y="401" style="font-size:11.5px" fill="#111111">publish()</text>
  <text x="74" y="418" style="font-size:11.5px" fill="#111111">edit()</text>
  <text x="74" y="435" style="font-size:11.5px" fill="#111111">cancel()</text>
  <rect x="420" y="275" width="260" height="153" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="550.0" y="298" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#111111">Claim</text>
  <line x1="420" y1="309" x2="680" y2="309" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="434" y="327" style="font-size:11.5px" fill="#111111">status</text>
  <text x="434" y="344" style="font-size:11.5px" fill="#111111">quantity</text>
  <text x="434" y="361" style="font-size:11.5px" fill="#111111">outcome</text>
  <line x1="420" y1="366" x2="680" y2="366" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="434" y="384" style="font-size:11.5px" fill="#111111">cancel()</text>
  <text x="434" y="401" style="font-size:11.5px" fill="#111111">reportNoShow()</text>
  <text x="434" y="418" style="font-size:11.5px" fill="#111111">complete()</text>
  <rect x="780" y="275" width="250" height="102" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="905.0" y="298" text-anchor="middle" style="font-size:15px;font-weight:700" fill="#111111">PickupCode</text>
  <line x1="780" y1="309" x2="1030" y2="309" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="794" y="327" style="font-size:11.5px" fill="#111111">expiresAt</text>
  <text x="794" y="344" style="font-size:11.5px" fill="#111111">attempts</text>
  <line x1="780" y1="349" x2="1030" y2="349" stroke="#1a1a1a" stroke-width="1.2"/>
  <text x="794" y="367" style="font-size:11.5px" fill="#111111">verify(code)</text>
  <g style="font-size:10.5px" fill="#444444">
    <text x="327" y="88">1</text>
    <text x="411" y="88" text-anchor="end">0..*</text>
    <text x="369" y="112" text-anchor="middle" style="font-style:italic">employs</text>
    <text x="198" y="228">1</text>
    <text x="198" y="266">0..*</text>
    <text x="205" y="250" style="font-style:italic">donates</text>
    <text x="332" y="163">1</text>
    <text x="398" y="268">0..*</text>
    <text x="378" y="212" style="font-style:italic">claims</text>
    <text x="327" y="343">1</text>
    <text x="411" y="343" text-anchor="end">0..*</text>
    <text x="369" y="367" text-anchor="middle" style="font-style:italic">claimed by</text>
    <text x="689" y="323">1</text>
    <text x="771" y="323" text-anchor="end">0..1</text>
    <text x="730" y="347" text-anchor="middle" style="font-style:italic">secured by</text>
  </g>
</svg>
</div>

<!--
DOMAIN MODEL

Five conceptual classes. This is not the database schema; there are no
column types or nullability here, and two of the classes do not map
one-to-one onto a table.

Organisation is the party. It is the thing that gets approved, and it is
what donates and what claims. A User is a person acting on its behalf,
which is why the associations for donating and claiming run from
Organisation and not from User.

Listing and Claim carry the donation. The multiplicity between them is
one to many because a listing accumulates a history of claims over its
life, but the system constrains it further than the diagram can show: at
most one of those claims is active at any moment.

PickupCode is modelled as its own class rather than as fields on Claim
because it has behaviour of its own. It verifies a presented code, counts
failures and voids itself after three. Pulling it out is what let that
rule be tested on its own.

Operations in the boxes are responsibilities, not method signatures.
Organisation really does own its transitions in the Go service.
Listing's and Claim's rules are implemented as pure functions beside the
data rather than as methods on it, which is a difference worth
explaining rather than hiding.
-->
