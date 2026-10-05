import { test, expect } from './fixtures/sessions';

// Who can open which page. Read-only: nothing here creates data.

// The plain `page` fixture has no saved session, so these run signed out.
test.describe('Signed out', () => {
  for (const path of [
    '/dashboard',
    '/listings',
    '/listings/new',
    '/browse',
    '/requests',
    '/settings',
  ]) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }
});

test.describe('Signed in', () => {
  test('sign-in page sends a signed-in user to the dashboard', async ({
    donorPage,
  }) => {
    await donorPage.goto('/login');
    await expect(donorPage).toHaveURL(/\/dashboard$/);
  });
});

test.describe('Donor', () => {
  test('cannot browse listings to claim', async ({ donorPage }) => {
    await donorPage.goto('/browse');
    await expect(
      donorPage.getByText('You do not have access to this page.'),
    ).toBeVisible();
  });

  test('cannot open a listing to claim it', async ({ donorPage }) => {
    // Any id will do: the role check runs before the listing is looked up.
    // If that order ever changes, this lands on "not found" and fails
    // rather than passing for the wrong reason.
    await donorPage.goto('/browse/00000000-0000-0000-0000-000000000000');
    await expect(
      donorPage.getByText(
        'Only authorized rescue partner organisations can view surplus food details or claim lots.',
      ),
    ).toBeVisible();
    await expect(
      donorPage.getByRole('button', { name: 'Claim Lot' }),
    ).toHaveCount(0);
  });
});

test.describe('Rescue partner', () => {
  for (const path of ['/listings', '/listings/new']) {
    test(`cannot open ${path}`, async ({ partnerPage }) => {
      await partnerPage.goto(path);
      await expect(
        partnerPage.getByText('You do not have access to this page.'),
      ).toBeVisible();
    });
  }
});
