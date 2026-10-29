# Report diagrams

One PNG per slide, exported from `slides/diagrams.md`. Regenerate with
`npm run export:diagrams` from `slides/`. The export clears this folder first,
so keep nothing else in here.

The deck is grouped by use case. Each group opens with a divider naming its
actors and the use cases it covers, then carries two figures: an analysis
model and a design model. The report prose for each figure is in the speaker
notes of the matching slide. Run `npm run dev:diagrams` and press `p` for
presenter view, or read the `<!-- ... -->` block under the slide in `pages/`.

## Part 1, architecture design, section 3.2

| File | Slide                                      |
|------|--------------------------------------------|
| 1    | Cover                                      |
| 2    | Contents                                   |
| 3    | Divider                                    |
| 4    | Component diagram, software architecture   |
| 5    | Logical architecture, four layers          |
| 6    | Package diagram, listings-service          |
| 7    | Package diagram, profile and notifications |

## Part 2, use cases, section 3.3

| Use case                   | Divider | Analysis | Design | Section |
|----------------------------|---------|----------|--------|---------|
| 01 Onboarding and access   | 8       | 9        | 10     | 3.3.2   |
| 02 Platform administration | 11      | 12       | 13     | 3.3.2   |
| 03 Listing and discovery   | 14      | 15       | 16     | 3.2.2   |
| 04 Claim creation          | 17      | 18       | 19     | 3.2.3   |
| 05 Claim termination       | 20      | 21       | 22     | 3.2.3   |
| 06 Collection and handover | 23      | 24       | 25     | 3.2.4   |
| 07 Notification            | 26      | 27       | 28     | 3.2.5   |

Source files, one per use case:

- `slides/diagrams.md` is the deck entry point, cover and contents.
- `slides/pages/dgm-architecture.md` holds part one.
- `slides/pages/dgm-uc-01-onboarding.md` through `dgm-uc-07-notification.md`
  hold one use case each, divider first.
- `slides/components/Uml*.vue` are the drawing primitives.

Two things to know before editing:

- The PNG export does not pick up UnoCSS utility classes, only real CSS. Style
  these slides through `slides/style.css` (the `.dgm-*` rules) or inline
  styles, never through utilities.
- This deck is separate from the presentation in `slides/slides.md`, whose
  appendix carries the matching use case and sequence diagrams for the same
  seven groups. The two overlap on logical architecture and the domain model;
  pick one source per figure before submitting the report.
