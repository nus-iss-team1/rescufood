// Renders every spec in specs.mjs to public/sequences/<file>-<kind>.png,
// which the sequence slides in pages/dgm-uc-0*.md display.
//
//   npm run build:sequences            all 14 diagrams
//   npm run build:sequences -- 04      only specs whose file starts with "04"

import { chromium } from 'playwright-chromium';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from './seq.mjs';
import { specs } from './specs.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../public/sequences');
const only = process.argv[2];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
// 3x so the PNGs stay sharp when pasted into the report.
const page = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 1600, height: 900 } });

for (const spec of specs) {
  if (only && !spec.file.startsWith(only)) continue;
  for (const kind of ['analysis', 'design']) {
    const svg = render(spec[kind]);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
    const out = join(outDir, `${spec.file}-${kind}.png`);
    await page.locator('svg').first().screenshot({ path: out });
    console.log('wrote', out);
  }
}

await browser.close();
