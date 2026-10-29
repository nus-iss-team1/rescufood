---
theme: default
title: RescuFood architecture and design diagrams
info: |
  ## RescuFood diagrams
  Architecture and design figures for the SWE5006 project report.
  Each figure is one slide, sized to be screenshotted straight into the report.
  The speaker notes under each slide are the accompanying report text.
class: dgm-centre
colorSchema: light
fonts:
  sans: Geist
  serif: Geist
  mono: Geist Mono
  weights: '400,500,600,700,800'
drawings:
  persist: false
transition: none
mdc: true
---

<div class="dgm-wordmark">Rescu<span class="accent">Food</span></div>

<div class="dgm-lede">Architecture and design figures for the project report.</div>

<div class="dgm-foot">One figure per slide &middot; report text in the speaker notes</div>

<!--
HOW TO USE THIS DECK

Every slide after the contents is either a section divider or a single figure
drawn to be screenshotted straight into the report. The notes under each
figure are written as report prose, so they can be read in presenter mode or
lifted into the chapter they belong to.

Run `npm run dev:diagrams` to view, or `npm run export:diagrams` to write one
PNG per slide into deliverables/diagrams/.
-->

---
class: dgm-page dgm-toc-page
---

# Contents

<div class="dgm-toc">
<div class="dgm-toc-row"><span class="dgm-toc-num">Part 1</span><span class="dgm-toc-name">Architecture design</span><span class="dgm-toc-actor">4 figures</span></div>
<div class="dgm-toc-part">Part 2 &middot; use cases, analysis and design models</div>
<div class="dgm-toc-row"><span class="dgm-toc-num">01</span><span class="dgm-toc-name">Onboarding and access</span><span class="dgm-toc-actor">Guest</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">02</span><span class="dgm-toc-name">Platform administration</span><span class="dgm-toc-actor">Administrator</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">03</span><span class="dgm-toc-name">Listing and discovery</span><span class="dgm-toc-actor">Donor, rescue partner</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">04</span><span class="dgm-toc-name">Claim creation</span><span class="dgm-toc-actor">Rescue partner</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">05</span><span class="dgm-toc-name">Claim termination</span><span class="dgm-toc-actor">Both parties, the system</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">06</span><span class="dgm-toc-name">Collection and handover</span><span class="dgm-toc-actor">Both parties</span></div>
<div class="dgm-toc-row"><span class="dgm-toc-num">07</span><span class="dgm-toc-name">Notification</span><span class="dgm-toc-actor">Platform user, the system</span></div>
</div>

<!--
CONTENTS

Part one is the system as a whole: the component view, the logical layers and
the packages inside each service. Part two breaks the system down by use case,
and each of the seven carries two figures, an analysis model and a design
model.
-->

---
src: ./pages/dgm-architecture.md
---

---
src: ./pages/dgm-uc-01-onboarding.md
---

---
src: ./pages/dgm-uc-02-administration.md
---

---
src: ./pages/dgm-uc-03-listing.md
---

---
src: ./pages/dgm-uc-04-claim-creation.md
---

---
src: ./pages/dgm-uc-05-claim-termination.md
---

---
src: ./pages/dgm-uc-06-handover.md
---

---
src: ./pages/dgm-uc-07-notification.md
---
