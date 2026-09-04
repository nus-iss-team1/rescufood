// Merges the unit and integration coverage JSON reports and prints a
// Markdown summary (for $GITHUB_STEP_SUMMARY). Report-only - never exits
// non-zero on low coverage.
//
//   node scripts/coverage-summary.mjs <unit.json> <integration.json>

import { readFileSync } from 'node:fs';
import libCoverage from 'istanbul-lib-coverage';

const [, , unitPath, intPath] = process.argv;

const map = libCoverage.createCoverageMap({});
for (const path of [unitPath, intPath]) {
  try {
    map.merge(JSON.parse(readFileSync(path, 'utf8')));
  } catch (err) {
    console.log(`> could not read ${path}: ${err.message}`);
  }
}

const files = map
  .files()
  .filter(
    (f) =>
      !f.includes('.spec.') &&
      !/[\\/]test[\\/]/.test(f) &&
      !f.endsWith('.d.ts'),
  );

const totals = {
  statements: [0, 0],
  branches: [0, 0],
  functions: [0, 0],
  lines: [0, 0],
};
const byDir = new Map();

for (const f of files) {
  const s = map.fileCoverageFor(f).toSummary().data;
  for (const k of Object.keys(totals)) {
    totals[k][0] += s[k].covered;
    totals[k][1] += s[k].total;
  }
  const rel = (f.split(/[\\/]src[\\/]/)[1] ?? f).replace(/\\/g, '/');
  const dir = rel.includes('/')
    ? 'src/' + rel.split('/').slice(0, -1).join('/')
    : 'src';
  const acc = byDir.get(dir) ?? [0, 0];
  acc[0] += s.statements.covered;
  acc[1] += s.statements.total;
  byDir.set(dir, acc);
}

const pct = ([c, t]) => (t === 0 ? '100.0' : ((100 * c) / t).toFixed(1));

console.log('### Coverage (unit + integration)\n');
console.log('| Metric | % |');
console.log('|---|---|');
for (const k of ['statements', 'branches', 'functions', 'lines']) {
  console.log(`| ${k} | ${pct(totals[k])}% |`);
}
console.log('\n<details><summary>By directory (statements)</summary>\n');
console.log('| Directory | % |');
console.log('|---|---|');
for (const [dir, acc] of [...byDir].sort()) {
  console.log(`| ${dir} | ${pct(acc)}% |`);
}
console.log('\n</details>');
