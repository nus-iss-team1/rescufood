// Sanitises SVGs in public/ so draw.io exports render correctly in the deck.
//
// draw.io stamps `color-scheme: light dark` into every SVG export. Because the
// deck forces a light page, the browser resolves the SVG in dark mode and every
// light-filled shape renders invisibly. This strips that out and pins the SVG to
// a light colour-scheme with a white background.
//
// Runs automatically before `dev` and `build` (see package.json pre-hooks), so
// re-exporting a diagram never re-breaks it. Idempotent — safe to run repeatedly.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

let files;
try {
  files = (await readdir(publicDir)).filter((f) => f.toLowerCase().endsWith('.svg'));
} catch {
  // No public/ folder yet — nothing to do.
  process.exit(0);
}

let fixed = 0;
for (const file of files) {
  const path = join(publicDir, file);
  const original = await readFile(path, 'utf8');

  const patched = original
    // The specific draw.io export that breaks rendering.
    .replace(/color-scheme:\s*light dark/gi, 'color-scheme: light')
    // A bare transparent background can still pick up a dark page behind it;
    // give the diagram an explicit white canvas.
    .replace(/background(-color)?:\s*transparent/gi, 'background$1: #ffffff');

  if (patched !== original) {
    await writeFile(path, patched, 'utf8');
    fixed += 1;
    console.log(`fix-svg: sanitised ${file}`);
  }
}

if (fixed === 0) {
  console.log('fix-svg: nothing to change');
}
