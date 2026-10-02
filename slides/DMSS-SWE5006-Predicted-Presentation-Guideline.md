# Predicted Practice Project Presentation Guideline — SWE5006 Designing Modern Software Systems (Jul–Nov 2026)

> **Status: PREDICTION, not an official document.** Derived by adapting the *Architecting Scalable Systems* (SWE5001) presentation guideline (V2.8) to the content emphasis of the *Designing Modern Software Systems* SWE5006 briefing (Jul–Nov 2026). Confirm the real guideline with the lecturer (Chandra) when it is released — it usually appears close to the presentation date (predicted early Nov 2026).

## How this prediction was derived

- **Format template:** the ASS guideline — a ~40 minute timed outline in `(X+Y)` form (Y = Q&A), plus presentation tips and a schedule table.
- **Content template:** the DMSS briefing, which frames projects around a **preferably monolithic**, **client/server, web-based, relational-DB** system that **de-prioritises scalability** and emphasises **robustness, reusability, maintainability, extensibility**, applied across the four DMSS modules.
- **Primary DMSS artifacts cross-checked:** the three sample project proposals and the SWE5006 progress-report template (from the Practice Module notes folder). These confirmed the emphasis on non-functional requirements, security, and a Scrum/sprint reporting cadence — see *Gaps found on scrutiny* below.
- **Net effect:** I kept the ASS *structure* but replaced its scalability / platform-thinking / physical-cloud / DDD emphasis with DMSS's emphasis on Agile practices, OOAD analysis-and-design, Design Patterns, and DevSecOps automation — while keeping quality attributes (NFRs) as a running thread.

### What changes vs. the ASS guideline
| ASS emphasis (removed / reduced) | DMSS emphasis (introduced) |
|---|---|
| Platform-thinking, producers & consumers | Business problem + monolithic system context |
| Physical/cloud architecture, nodes, cloud services, persistence at scale | Monolithic backend, relational DB, minimal infra |
| Domain Driven Design | OOAD, analysis → design transition |
| Scalability / auto-scaling demos, scripted perf testing | Scalability *dispensed with*; demo functionally complex use cases |
| Design patterns only lightly touched | **Design Patterns as a dedicated segment** |
| Agile only lightly touched | **Essential Practices for Agile Teams as a dedicated segment** |
| "DevOps" | **DevSecOps** with (minimal) security + automation |

---

## Predicted General Presentation Outline (~40 minutes)

*Time for Q&A is included in the overall duration. Timings are given as `(X+Y)` where Y is the Q&A time.*

**1. Overview (2+1 minutes)**
- a. Explain the context and the business problem the solution addresses.
- b. Explain the scope of the project — the key use cases in scope and why they were chosen (mix of CRUD plus a few functionally/technically complex ones).
- c. State the design goals and key **non-functional requirements / quality attributes** emphasised: robustness, reusability, maintainability, extensibility, and security. (Scalability is de-prioritised for the proof-of-concept, though real proposals often still state modest performance/availability targets.)

**2. Project Conduct & Agile Practices (5+1 minutes)**
- a. Current status of the project, including outstanding issues.
- b. Actual milestones and rough total effort expended by each team member (~10 man-days per participant).
- c. Show how the team practised **Essential Practices for Agile Teams**: product backlog, user stories, sprint plans, burndown charts, sprint reviews and **sprint retrospectives** (what went well / what could be better / what to try next — mirrors the progress-report template); TDD, pair programming, refactoring, continuous integration.

**3. Analysis & Design (7+2 minutes)**
- a. High-level design / software architecture of the (preferably monolithic) system.
- b. The **transition strategy from analysis to design** (OOAD) — the DMSS-specific emphasis.
- c. Detailed analysis and design specification for one or two architecturally representative user stories / use cases in scope.
- d. How the design addresses the key non-functional requirements (e.g. maintainability, extensibility, and the security model such as RBAC / authentication).

**4. Design Patterns (6+2 minutes)**
- a. Identify the tough design problems in the solution.
- b. Explain the specific **design patterns** applied, and why each is the right solution in its context.
- c. Show how the patterns improve reusability, maintainability and extensibility (before/after or class-diagram views).

**5. DevSecOps Engineering & Automation (6+1 minutes)**
- a. Source-code and artifact management strategy (e.g. Git, branching, artifact/registry handling).
- b. The **DevSecOps pipeline** and procedures — a concrete stage flow such as *source checkout → unit & functional tests → build artifact → containerize → deploy* — plus the tooling used (CI server, Jira/board, containers).
- c. The **security** practices woven in (e.g. dependency/vulnerability scanning, secrets handling, authentication such as JWT, password hashing). The briefing calls for *minimal* security, but sample projects typically go further.
- d. Technical findings and issues encountered.

**6. Demo (8+2 minutes)**
- a. Demonstrate the significant / functionally complex use cases of the solution.
- b. Show quality attributes in action — well-structured code, unit tests running, and the **DevSecOps pipeline executing** (build → test → containerize). *No scalability/auto-scaling demo is expected, unlike ASS.*

*Total: ~40 minutes including Q&A.*

---

## Predicted Presentation Tips
1. Summarise and highlight the significant achievements. Talk more about the interesting and unique parts of the solution; the audience should remember what is distinctive, not what is generic.
2. Manage your time well. Do not present too many slides. The audience can read the slides, so do not read them aloud.
3. Explain your design top-down: make sure the audience understands the requirements and high-level design and decisions before drilling into detail.
4. Ensure slide contents are readable from the audience's distance (especially for face-to-face).

---

## Predicted Schedule (from the DMSS briefing)
Based on the DMSS briefing's rough schedule (dates marked tentative in the briefing):

| Date | Milestone |
|---|---|
| 3 Jul 2026 | Module Briefing |
| 17 Jul 2026 | Proposal Submission |
| 24 Jul 2026 | Proposal Review |
| 27 Jul 2026 | Project Conduct begins (fortnightly progress reports) |
| **2 Nov 2026, 6.30 PM** | **Project Presentation** ← the presentation event |
| 9 Nov 2026 | Report Submission |

The detailed per-team time-slot table and Zoom link (as seen in the ASS document) will be released by ISS closer to 2 Nov 2026.

---

## Assessment context (from the DMSS briefing, for reference)
- **Final Presentation: 20%** of the overall grade (same weight for company-sponsored and not).
- Project Report: 50% (company-sponsored) or 80% (not), including 5% peer assessment.
- Graded by a team of ISS lecturers; minimum 50% to pass, 60% to be eligible to stack toward the MTech.

---

## Gaps found on scrutiny (and how they were addressed)
After cross-checking the three DMSS sample proposals and the SWE5006 progress-report template, the following gaps in the first draft were identified and fixed:

1. **Non-functional requirements were under-represented.** All three sample proposals carry dedicated NFR sections (performance, availability, security, reliability, usability, maintainability). NFRs / quality attributes are now a running thread — surfaced in the Overview, in Analysis & Design (3d), and in the Demo.
2. **Security was treated as an afterthought.** The briefing says "minimal security," but the sample proposals implement RBAC, JWT authentication, salted password hashing, encryption in transit/at rest, and audit logs. Security now has an explicit item in the DevSecOps segment (5c) and appears in the design segment.
3. **Sprint retrospectives weren't called out.** The progress-report template is Scrum-centric (sprint objectives, plan-vs-actual, burndown, retrospective, contribution summary). The Agile segment now names sprint retrospectives explicitly.
4. **The DevSecOps pipeline was too generic.** Now includes a concrete stage flow (checkout → test → build → containerize → deploy) and tooling, matching what sample proposals describe.
5. **The scalability claim was too absolute.** The first draft said scalability is "out of scope." The briefing's YAFD example dispenses with it, but real proposals still state modest performance/availability targets. Reworded to "de-prioritised" rather than excluded.

Still **not** derivable from the available documents (genuine unknowns — confirm with ISS):
- The exact per-segment minute allocation and whether a distinct "peer assessment" or "lessons learned" segment is expected in the talk.
- Whether presentation is face-to-face or via Zoom, and the per-team slot table.
- Any DMSS-specific slide-count cap or template.

### Confidence notes
- **High confidence:** the six-segment timed format, presentation tips, ~40 min total, and the schedule dates (these come straight from the two source documents).
- **Medium confidence:** the exact minute split per segment. I rebalanced ASS's timings to give Design Patterns and Agile their own segments, since they are full DMSS modules. The real split may differ.
- **Lower confidence:** whether ISS keeps a single "Analysis & Design" segment or splits logical/physical as ASS does — DMSS's monolithic, non-scalable framing makes a single design segment more likely.
