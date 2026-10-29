# Sequence diagrams

The 14 sequence diagrams in the diagrams deck (`diagrams.md`), one analysis
and one design sequence per use case, are generated from code in this folder.
The slides show the resulting PNGs; nothing in the slides needs editing when
a diagram changes.

| File          | What it is                                                     |
|---------------|----------------------------------------------------------------|
| `specs.mjs`   | The diagrams themselves, as data. This is the file you edit.   |
| `seq.mjs`     | Draws one spec as a UML sequence diagram (SVG).                 |
| `render.mjs`  | Turns every spec into a PNG in `public/sequences/`.            |

## Change a diagram

1. Edit the matching entry in `specs.mjs`. Each use case has an `analysis`
   and a `design` spec.
2. From `slides/`, run:

   ```
   npm run build:sequences          # all 14
   npm run build:sequences -- 04    # only use case 04
   ```

3. The PNGs in `public/sequences/` are overwritten. If `npm run dev:diagrams`
   is running, refresh the page to see them.

No extra install is needed: rendering uses `playwright-chromium`, which is
already a dev dependency.

## Spec format

```js
{
  colW: 160,                     // optional column width, default 170
  participants: [
    actor('p', 'Rescue partner'),                  // stick figure
    box('svc', 'RequestsService', 'service'),      // box with «stereotype»
  ],
  steps: [
    { from: 'p', to: 'svc', label: 'create(dto)' },             // call
    { from: 'svc', to: 'p', label: '201 claim', ret: true },    // return
    { from: 'svc', to: 'svc', label: 'fingerprint(dto)' },      // self-call
    { frag: 'alt', guard: '[prior record]' },                    // open alt
    { else: '[no prior record]' },                               // next operand
    { end: true },                                               // close it
    { frag: 'opt', guard: '[third failure]' },                   // opt fragment
    { frag: 'tx' },                                              // "transaction" box
    { note: 'Published after commit.', over: ['svc', 'pub'] },   // note
    { divider: 'first sign-in' },                                // dashed separator
  ],
}
```

Every `frag` needs a matching `{ end: true }`. Labels wrap automatically, and
long participant names shrink to fit their box.

## Keep them consistent

- **Analysis sequences** use only the boundary, control and entity classes,
  and their operations, from the analysis class diagram on the slide before.
  If you rename a class there, rename it here too.
- **Design sequences** follow the real call order in `origin/develop`
  (`RequestsService.create`, `transitionOrg`, `signUpAction`,
  `SqsConsumerService.process` and so on). When the code changes, update the
  spec. They currently differ from the design class diagrams in two places:
  listings upload images through the service rather than presigned URLs, and
  a few method names (`assertIsParty`, `claimEnded`,
  `reopenListingAfterClaimEnded`) follow the code.

## Using them in the report

The report (Chapter 3, section 3.5) uses the same PNGs, copied from
`public/sequences/`:

| Use case                     | Analysis sequence | Design sequence |
|------------------------------|-------------------|-----------------|
| 01 Onboarding and access     | Figure 3.10       | Figure 3.12     |
| 02 Platform administration   | Figure 3.14       | Figure 3.16     |
| 03 Listing and discovery     | Figure 3.18       | Figure 3.20     |
| 04 Claim creation            | Figure 3.23       | Figure 3.25     |
| 05 Claim termination         | Figure 3.27       | Figure 3.29     |
| 06 Collection and handover   | Figure 3.32       | Figure 3.34     |
| 07 Notification              | Figure 3.36       | Figure 3.38     |
