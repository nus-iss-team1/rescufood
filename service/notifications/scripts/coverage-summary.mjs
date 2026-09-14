// Merges the unit and integration coverage reports and prints the standard
// Istanbul coverage table (the one `jest --coverage` shows). In CI it also
// appends it to the job summary. Report-only - never exits non-zero.
//
//   node scripts/coverage-summary.mjs <unit.json> <integration.json>

import { appendFileSync, readFileSync } from 'node:fs';
import libCoverage from 'istanbul-lib-coverage';
import { createContext } from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const [, , unitPath, intPath] = process.argv;

const merged = libCoverage.createCoverageMap({});
for (const path of [unitPath, intPath]) {
  try {
    merged.merge(JSON.parse(readFileSync(path, 'utf8')));
  } catch (err) {
    console.error(`> could not read ${path}: ${err.message}`);
  }
}

// Keep the source tree only - no specs, test helpers or type stubs.
const map = libCoverage.createCoverageMap({});
for (const file of merged.files()) {
  if (
    !file.includes('.spec.') &&
    !/[\\/]test[\\/]/.test(file) &&
    !file.endsWith('.d.ts')
  ) {
    map.addFileCoverage(merged.fileCoverageFor(file));
  }
}

// Render the text reporter to a string.
let table = '';
const restore = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk) => {
  table += chunk;
  return true;
};
try {
  reports
    .create('text', { maxCols: 100 })
    .execute(createContext({ coverageMap: map, dir: '.' }));
} finally {
  process.stdout.write = restore;
}

process.stdout.write('\nCoverage (unit + integration)\n\n' + table + '\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Coverage (unit + integration)\n\n\`\`\`\n${table}\`\`\`\n`,
  );
}
