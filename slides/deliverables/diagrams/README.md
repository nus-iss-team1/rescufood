# Report diagrams

One PNG per slide, exported from `slides/diagrams.md`. Regenerate with
`npm run export:diagrams` from `slides/`. The export clears this folder first,
so keep nothing else in here.

The deck is grouped by use case. Each group opens with a divider naming its
actors and the use cases it covers, then carries four figures: the analysis
model and its sequence, then the design model and its sequence. The report
prose for each figure is in the speaker
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

## Part 2, use cases, section 3.5

| Use case                   | Divider | Analysis | Analysis seq | Design | Design seq | Section |
|----------------------------|---------|----------|--------------|--------|------------|---------|
| 01 Onboarding and access   | 8       | 9        | 10           | 11     | 12         | 3.5.2   |
| 02 Platform administration | 13      | 14       | 15           | 16     | 17         | 3.5.3   |
| 03 Listing and discovery   | 18      | 19       | 20           | 21     | 22         | 3.5.4   |
| 04 Claim creation          | 23      | 24       | 25           | 26     | 27         | 3.5.5   |
| 05 Claim termination       | 28      | 29       | 30           | 31     | 32         | 3.5.6   |
| 06 Collection and handover | 33      | 34       | 35           | 36     | 37         | 3.5.7   |
| 07 Notification            | 38      | 39       | 40           | 41     | 42         | 3.5.8   |

The sequence slides show pre-rendered PNGs from `slides/public/sequences/`
rather than inline drawings, because they are generated outside the deck.

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
