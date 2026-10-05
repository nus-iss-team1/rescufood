import { test as base, type Page } from '@playwright/test';
import { DONOR_AUTH, PARTNER_AUTH } from '../helpers/auth';

// One isolated, already-signed-in browser context per role. A test asks for
// whichever roles it needs - both at once when a step on one side should
// show up on the other - and only the ones it uses are opened.
export const test = base.extend<{ donorPage: Page; partnerPage: Page }>({
  donorPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: DONOR_AUTH });
    await use(await context.newPage());
    await context.close();
  },
  partnerPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: PARTNER_AUTH });
    await use(await context.newPage());
    await context.close();
  },
});

export { expect } from '@playwright/test';
