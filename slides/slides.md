---
theme: default
title: RescuFood Branching Strategy
info: |
  ## RescuFood Branching Strategy

  One branch per environment
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

<div class="text-sm mt-12 dgm-wide" style="color:#00000066">
NUS-ISS &middot; Team 1
</div>

<!--
TITLE

Hold here while people settle. One line if you need it: this is how code
gets from a laptop to rescufood.com, and it is the same three steps every
time.
-->

---
class: flex flex-col justify-center text-center
---

<div class="text-xs dgm-wide" style="color:#00000066">Section</div>

<div class="text-5xl font-extrabold leading-tight mt-6">
Branching &amp; <span class="accent">deployment</span>
</div>

<!--
SECTION

Say the title and move on. This is a marker, not a slide to talk over.
-->

---
class: flex flex-col justify-center text-center
clicks: 1
---

<div class="text-6xl font-extrabold leading-tight px-16">
One branch per <span class="accent">environment</span>.
</div>

<div class="rule-green mt-8" style="margin-left:auto;margin-right:auto"></div>

<div class="text-xl mt-8 transition-all duration-700" style="color:#00000099" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">
The branch you are on is the environment you are changing.
</div>

<!--
THE RULE

Everything in this deck follows from one sentence. We keep three
long-lived branches, and each one owns exactly one deployed environment.

Click. That is the whole mental model. If you know which branch you are
on, you know what you are about to affect. Nobody has to remember a
deploy procedure, because there isn't one.
-->

---
class: flex flex-col justify-center
clicks: 5
---

# The pipeline

<div class="mt-12">

<div class="flex items-center justify-center" style="gap:0.75rem">
  <div class="rounded-lg border text-sm py-2 px-4 font-medium text-center" style="border-color:#0000001a;background:#f2f0ed;color:#00000099">feat/* &nbsp;fix/*</div>
  <div style="color:#00000066">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center" style="width:9rem;border-color:#0000001a;background:#ffffff;color:#000000">develop</div>
  <div class="transition-all duration-700" style="color:#00000066" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-30'">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center transition-all duration-700" style="width:9rem" :style="$clicks >= 1 ? 'border-color:#0000001a;background:#ffffff;color:#000000' : 'border-color:#0000001a;background:#f2f0ed;color:#00000044'">qa</div>
  <div class="transition-all duration-700" style="color:#00000066" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-30'">&rarr;</div>
  <div class="rounded-lg border text-base py-2 font-semibold text-center transition-all duration-700" style="width:9rem" :style="$clicks >= 2 ? 'border-color:#1f6b45;background:#1f6b45;color:#ffffff' : 'border-color:#0000001a;background:#f2f0ed;color:#00000044'">main</div>
</div>

<div class="flex items-center justify-center mt-3" style="gap:0.75rem">
  <div class="text-sm py-2 px-4" style="width:8.5rem"></div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center" style="width:9rem"><span class="dgm text-xs" style="color:#00000099">dev</span></div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center transition-all duration-700" style="width:9rem" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'"><span class="dgm text-xs" style="color:#00000099">qa</span></div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center transition-all duration-700" style="width:9rem" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-0'"><span class="dgm text-xs" style="color:#1f6b45">prod</span></div>
</div>

<div class="flex items-center justify-center mt-2" style="gap:0.75rem">
  <div class="text-sm py-2 px-4" style="width:8.5rem"></div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono" style="width:9rem;color:#00000066">dev.rescufood.com</div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono transition-all duration-700" style="width:9rem;color:#00000066" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">qa.rescufood.com</div>
  <div style="opacity:0">&rarr;</div>
  <div class="text-center text-xs font-mono transition-all duration-700" style="width:9rem;color:#00000066" :class="$clicks >= 2 ? 'opacity-100' : 'opacity-0'">rescufood.com</div>
</div>

<div class="mt-12 mx-auto" style="max-width:34rem">
  <div class="flex items-baseline transition-all duration-700" :class="$clicks >= 3 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base" style="color:#000000">Every arrow is a <span class="accent font-semibold">pull request</span></span>
  </div>
  <div class="flex items-baseline mt-3 transition-all duration-700" :class="$clicks >= 4 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base" style="color:#000000">A promotion carries <span class="font-semibold">everything</span> since the last one</span>
  </div>
  <div class="flex items-baseline mt-3 transition-all duration-700" :class="$clicks >= 5 ? 'opacity-100' : 'opacity-0'">
    <span class="mr-3" style="color:#1f6b45">&bull;</span>
    <span class="text-base" style="color:#000000"><span class="font-mono text-sm">git diff qa..develop</span> is the release note</span>
  </div>
</div>

</div>

<!--
THE PIPELINE

Work starts on a feature or fix branch and merges into develop. That is
the only place day-to-day work lands.

Click. Promoting to qa is a merge from develop. Nothing is rebuilt from
scratch and nothing is cherry-picked.

Click. Promoting to prod is a merge from qa into main. Same shape again.

Each branch owns one environment, one set of CloudFormation stacks, and
one domain. There is no fourth path and no manual deploy step.

Click. Every arrow is a pull request, so every promotion is reviewable.

Click. And a promotion carries whatever has accumulated since the last
one. No cherry-picking, no release branch, no payload assembled by hand
under time pressure.

Click. Which makes that command the entire release note. If you want to
know what is about to ship to qa, you read that diff. Nothing else is
authoritative.
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
      <div class="text-sm mt-1" style="color:#00000099"><span class="font-mono">:qa</span>, not <span class="font-mono">:main</span>. The parameter files name environments, never branches.</div>
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

One push, three consequences, all automatic.

Click. Each service has a path filter. A change under service/listings
rebuilds listings and nothing else, so a one-line fix does not redeploy
the whole platform.

Click. The image is tagged for the environment, not the branch. Pushing
to main produces a prod tag. That is deliberate: the CloudFormation
parameter files read environment names, so nobody has to remember that
main means prod.

Click. The target cluster is derived from the branch inside the workflow.
There is no input to get wrong and no way for a qa push to touch prod.
The GitHub Environment resolves the same way, so credentials follow too.
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

The same rule set applies to all three branches, tightened as you move
right. Deletion and force pushes are blocked everywhere.

Click. qa adds the real signal: the Playwright suite runs against the
deployed environment after every promotion, not against a local build.
A green qa is evidence, not a hope.

Click. main is the one branch with no bypass. Prod cannot be force-pushed
and cannot be merged without a review, including by whoever wrote the
change. If that feels inconvenient, that is the point.

Worth saying out loud: we learned this the hard way. A change that passed
typecheck, lint and build still took dev down. The environment before it
is what caught the second attempt.
-->

---
class: flex flex-col justify-center text-center
clicks: 1
---

<div class="text-5xl font-extrabold leading-tight px-16">
Three environments.<br />
<span class="accent">One</span> way to reach each.
</div>

<div class="text-xl mt-10 transition-all duration-700" style="color:#00000099" :class="$clicks >= 1 ? 'opacity-100' : 'opacity-0'">
Merge the branch. Everything else is already decided.
</div>

<!--
CLOSE

Land on the payoff. There is exactly one route into each environment, and
it is a merge. No console clicks, no deploy scripts run from a laptop, no
tribal knowledge about which image goes where.

Click. The work is in the review, which is where it should be. Once the
merge happens the pipeline has no decisions left to make.
-->
