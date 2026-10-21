# Slides

The RescuFood presentation. These slides are built from text and code (using a
tool called [Slidev](https://github.com/slidevjs/slidev)) rather than drawn by
hand in PowerPoint. This README explains how to change the slides and how to
turn them into a PDF or PowerPoint file you can share.

> **New here?** Read the next section first — it explains how this is different
> from a normal PowerPoint, so nothing later is surprising.

## How this is different from a normal PowerPoint

- There is **no `.pptx` file sitting in the project** that you open and edit.
  The slides are written as text in a file called `slides.md`.
- You change the slides by **editing that text**, previewing the result in a
  web browser, and then **exporting** a PDF or PowerPoint when you want a file
  to send to someone.
- The exported PowerPoint is a **picture of each slide** — great for sharing or
  presenting, but you **cannot click into it and retype the words**. If
  something needs changing, you edit the text and export again.

Think of `slides.md` as the "master copy," and the PDF/PowerPoint as a
"printout" you make from it.

> **Just want the finished PowerPoint?** A ready-made copy is kept in the
> **`deliverables`** folder (`slides/deliverables/rescufood.pptx`) and comes
> with the project when you sync it. If that's all you need, open that file —
> you can stop reading here. The rest of this guide is for when you want to
> **change** the slides.

## One-time setup

You need [Node.js](https://nodejs.org) installed (the LTS version is fine).
Then open a terminal **in this `slides` folder** and run this once:

```sh
npm install
```

This downloads everything the slides need. You only do this the first time (or
if someone tells you dependencies changed).

## Changing the slides

1. In the terminal (in this `slides` folder), run:

   ```sh
   npm run dev
   ```

2. Open the link it prints — **http://localhost:3030** — in your web browser.
   This is a live preview of the deck.
3. Open the file `slides.md` in any text editor and change the wording.
   Each slide is separated by a line with three dashes: `---`.
4. **Save the file.** The browser preview updates by itself within a second —
   no need to restart anything.
5. When you're happy, stop the preview by clicking in the terminal and pressing
   `Ctrl + C`, then export (next section).

Helpful extras while previewing:

- Press `P` in the browser preview to see the **presenter notes** (the speaking
  points written under each slide).
- Use the arrow keys to move between slides.

If anything about layout or design looks broken, that's usually a code change —
ask a developer rather than fighting it in `slides.md`.

## Making a PDF or PowerPoint to share

Run **one** of these in the terminal (in the `slides` folder):

```sh
npm run export        # makes a PDF
npm run export:pptx   # makes a PowerPoint (.pptx)
```

| You want… | Run this | What you get |
|---|---|---|
| The best-looking file for presenting or submitting | `npm run export` | A **PDF** |
| A PowerPoint file (`.pptx`) | `npm run export:pptx` | A **PowerPoint**, where each slide is a picture (not editable text) |

Where each file is saved (inside this `slides` folder):

- **PowerPoint → `deliverables/rescufood.pptx`** — this folder is kept with the
  project, so the file is shared with the team automatically.
- PDF → `dist/slides.pdf` (or similar) — the `dist` folder is **not** shared
  with the project (see the last section).

### Opening the PowerPoint

- **Windows:** in the terminal, run `Invoke-Item deliverables/rescufood.pptx`,
  or open File Explorer, go into the `slides` folder, then the `deliverables`
  folder, and double-click `rescufood.pptx`.

### Good to know

- Exporting **replaces** the previous PowerPoint each time (it always uses the
  same name). You won't end up with lots of copies.
- **Close the PowerPoint before exporting again.** If the file is open,
  Windows won't let it be replaced and the export will fail.
- To change the wording, edit `slides.md` and export again — don't try to edit
  the `.pptx` directly.

## Where to find files (and why the PDF might be missing)

Two folders, treated differently on purpose:

- **`deliverables/`** holds the finished PowerPoint and **is shared with the
  project.** After you download or sync the project, `rescufood.pptx` is
  already there — just open it. No setup, no commands.
- **`dist/`** holds the PDF and the website build. It is **deliberately not
  shared** with the project, so it **will not exist** on a freshly synced
  computer. That's normal.

So:

- **Looking for the PowerPoint?** It's in `deliverables/rescufood.pptx` — it
  comes with the project.
- **Looking for the PDF and can't find it / there's no `dist` folder?** It just
  hasn't been made on your computer yet. Do the
  [one-time setup](#one-time-setup) (`npm install`), then run `npm run export`.
  The `dist` folder is created automatically with the PDF inside.

**Keeping the shared PowerPoint up to date:** the copy in `deliverables/` is
only as new as the last time someone exported it. If you change the slides,
run `npm run export:pptx` again and share/commit the updated file so everyone
gets the latest version.

If someone needs a file but can't run these steps, ask a team member to
export it and **send it to them directly** (email or chat).

## For developers

Source lives in `slides.md`, with Vue components in `components/`, split-out
slides in `pages/`, imported code samples in `snippets/`, and theme CSS in
`styles/` + `style.css`. Static assets in `public/` are served at the site root
(e.g. `public/infra.svg` → `/infra.svg`).

- `npm run build` produces the static site in `dist/` (used for Netlify/Vercel).
- `dist/` is gitignored; **`deliverables/` is intentionally committed** so the
  exported `rescufood.pptx` ships with the repo for non-technical teammates.
  Re-run `npm run export:pptx` and commit the result when the deck changes.
- `export:pptx` runs with `--with-clicks`, so each click-reveal step becomes its
  own slide. It's powered by Playwright; if a fresh machine complains, run
  `npm i -D playwright-chromium && npx playwright install chromium`.
- The architecture slide embeds `/infra.svg`. Regenerate it from
  `infrastructure/infra-plan.drawio` (VS Code Draw.io extension → Export → SVG)
  into `slides/public/infra.svg`; the `fix-svg` script normalises it before
  `dev`, `build`, and `export:pptx`.
