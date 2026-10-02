# RescuFood — Presentation Guide (SWE5006 Practice Project)

Speaker guide for [`slides.md`](./slides.md). The deck follows the six-segment
outline in
[`DMSS-SWE5006-Predicted-Presentation-Guideline.md`](./DMSS-SWE5006-Predicted-Presentation-Guideline.md),
mapped onto the actual RescuFood system.

- **Total target:** ~40 minutes including Q&A (Q&A folded into each section).
- **Build/run:** `npm run dev` (present), `npm run build` (verified OK), `npm run export` (PDF).
- **Presenter view:** each slide's spoken script is in the slide's `<!-- -->` note; this file is the at-a-glance plan.
- **Click-through slides** (build animations): "The pipeline", "What a push does", "Semantic versioning", "Security runs on every change", "The gates get stricter", plus the two one-line statement slides. Advance on the beats noted below.

## Segment timing map

The deck is **26 slides**. Section-marker slides (3, 6, 9, 13, 17, 24) are single-word dividers — say the title and move on.

| Segment | Slides | Target (X+Y) |
| --- | --- | --- |
| Title + agenda | 1–2 | 1 min |
| 01 Overview | 3–5 | 2+1 |
| 02 Project conduct & agile | 6–8 | 5+1 |
| 03 Analysis & design | 9–12 | 7+2 |
| 04 Design patterns | 13–16 | 6+2 |
| 05 DevSecOps & automation | 17–23 | 6+1 |
| 06 Demo | 24–25 | 8+2 |
| Close | 26 | included |

## Slide-by-slide

| # | Slide | Key talking points | How to present |
| --- | --- | --- | --- |
| 1 | Title — RescuFood | One line: real-time platform that moves surplus food to charities before it spoils. | Hold while people settle. Don't read the subtitle; say it in your own words. ~15s. |
| 2 | What we'll cover | The six segments = the six graded areas. State rough timings. | Read the six markers once, quickly, then move. Don't linger. |
| 3 | Section 01 — The problem | Section marker only. | Say the title, advance. Do not talk over it. |
| 4 | Surplus food is a coordination problem | Blocker is coordination, not goodwill: calls/chat/spreadsheets → double allocations, missed pickups. RescuFood = post → claim → verified pickup. | Contrast left (today) vs right (RescuFood). Land the phrase "one claim per listing, one source of truth" — it recurs. |
| 5 | Scope: what we built | Three capability areas (identity, listings/claims, pickup/notify). Design goals = DMSS quality attributes. Scalability deliberately out of scope. | Defer claim detail to §4. Be explicit and unapologetic about the PoC scope boundary. |
| 6 | Section 02 — How we ran it | Section marker. | Title, advance. |
| 7 | Agile, in practice | Scrum, fortnightly sprints; backlog→plan→review→retro; progress reports fell out of the rhythm. TDD where it paid, PR + review, CI on every PR. | Emphasise the retro's last line: one concrete change carried forward each sprint — that's why the pipeline got strict. |
| 8 | Status & effort | Deployed to prod; core loop works end-to-end; CI/CD on all envs. Outstanding: conflict/retry UX, SAST gating. ~10 man-days × 5. | Be honest about outstanding work. Name who owned what if asked. |
| 9 | Section 03 — Analysis & design | Section marker. | Title, advance. |
| 10 | The system, from the top (logical) | Two front ends (platform + local-only admin console, ADR-0001) → CDN + API Gateway edge → three services: profile (Go), listings (NestJS, core), notifications (NestJS, queue consumer). DB per service. SQS decouples. ECS Fargate. | Top-down. Flag the admin-console-local trade-off and the Sprint-3 CDN+API-Gateway hardening as deliberate decisions. Stress async: a slow email never blocks a claim. |
| 11 | Physical architecture · AWS (diagram) | The deployment view: API Gateway → VPC Link → internal ALB → Fargate across 2 AZs; RDS Postgres Multi-AZ in isolated subnets; Cognito; S3 + CloudFront for images; SQS + DLQ; CloudWatch. | Full-bleed diagram (from `infra-plan.drawio`). Walk left→right briefly, don't read every box. Call out the single NAT gateway as an honest PoC cost trade-off. |
| 12 | From analysis to design | User story → domain model → design. The invariant (one active claim/listing) surfaces in the model. Security designed in (JWT guard, org-membership guard, admin claim). Quality attributes made concrete. | This is the transition DMSS weights most. Underline: invariants live in the DB, not just code. |
| 13 | Section 04 — The hard problem: claiming | Section marker; this is the centrepiece. | Title, advance. Signal that this is the heart of the talk. |
| 14 | One listing, one claim — even under retries | Problem: no double claims, and honest retries must replay the same answer. Two patterns: idempotency key + guarded transaction (partial unique index). | State the problem crisply first, then name the two patterns. Point at the two table/index names. |
| 15 | The decision table does the reasoning | Every claim scenario resolves to a defined, tested outcome (from ADR-0002). Mechanism: `INSERT … ON CONFLICT DO NOTHING`. | Walk the rows briefly — don't read verbatim. Emphasise: no lock held across a request, exactly one winner. |
| 16 | The same patterns, reused everywhere | Repository, Guard, Publish/Subscribe, Scheduled sweeper — each reused across the codebase. | Message for graders: patterns reused to solve real problems, not name-dropped once. |
| 17 | Section 05 — DevSecOps & automation | Section marker. | Title, advance. |
| 18 | One branch per environment (statement) | The whole delivery model follows from one sentence. | **1 click** reveals the sub-line. Let it breathe. |
| 19 | dev → qa → prod (the pipeline) | feat/fix → develop (dev.rescufood.com) → qa (qa.) → main (prod). Every arrow a reviewed PR. Promotion carries everything since last; `git diff` is the release note. | **5 clicks.** Click 1: qa. Click 2: main. Click 3: every arrow is a PR. Click 4: promotion carries everything. Click 5: the diff is the release note. This is the required branching-strategy slide. |
| 20 | Semantic versioning on prod | Each merge to `main` tagged `vMAJOR.MINOR.PATCH`. MAJOR=breaking, MINOR=feature, PATCH=fix. Tag = release + image + rollback target. | **3 clicks** reveal MAJOR/MINOR/PATCH. Contrast with branching: version = *what*, branch = *where*. |
| 21 | What a push does | One push → builds only what changed (path filters), tags image for the environment (not branch), rolls that environment only (cluster from branch). | **3 clicks**, one per consequence. Stress qa can never reach prod — no input to get wrong. |
| 22 | Security runs on every change | Lint→unit→build→integration (testcontainers Postgres). Parallel SAST: CodeQL, Semgrep, Trivy. SARIF on the PR. qa also runs Playwright vs deployed site. | **3 clicks.** Click 1: the three scanners. Click 2: SARIF on PR. Click 3: Playwright on qa. This is the "Sec" — make clear it's real; report-only-for-now is deliberate. |
| 23 | The gates get stricter | Same ruleset, tightened left→right. develop: 1 approval, bypassable. qa: + e2e vs deployed. main: no force-push, no deletion, approval no exceptions. | **2 clicks** (qa, then main). Tell the war story: a green-CI change still took dev down; the env in front of prod caught the retry. Justifies the tightening approval flow. |
| 24 | Section 06 — Demo | Section marker. | Switch to the live env now. Have two browser profiles (donor + partner) pre-logged-in on qa.rescufood.com. |
| 25 | What we'll show | 1 post → 2 claim (+ refuse 2nd) → 3 pickup by OTP/QR → 4 notification (email + in-app) → 5 the pipeline (green PR, SARIF, promotion). | This is the demo driver — narrate the running system, don't read the list. Call back §4 explicitly when the 2nd claim is refused. Open a real PR to show a green check, SARIF findings, and a promotion. Keep a screen recording as fallback. |
| 26 | Close | "Correct where it counts. Automated everywhere else." Then Q&A. | Land the two ideas the deck is built on, then open the floor. |

> Confirm the click beats live in presenter view: `npm run dev`, then press `p`. The click counts above match the `clicks:` value in each slide's frontmatter.

## Presenting tips (from the guideline)

1. Talk about the interesting parts — the claim design and the pipeline — not the generic CRUD. The audience should remember what's distinctive.
2. Don't read slides aloud. The spoken script in each slide's note is a guide, not a script to recite.
3. Explain top-down: problem → architecture → detail. Never open a diagram before the audience knows why it exists.
4. Manage time. If running long, the compressible slides are 8 (status), 16 (patterns reused), and 20 (semver) — trim, don't skip §4, the physical architecture (11), or the demo.
5. Fold Q&A into each section; leave the final close for any remaining questions.
