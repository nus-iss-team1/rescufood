import { test, expect } from './fixtures/sessions';

// Read-only: nothing here creates data, so it can run in any order.
// Card titles render as divs, not headings, so they are matched by text.

test.describe('Donor dashboard', () => {
  test('leads with the counts a donor acts on', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');

    for (const label of [
      'Available',
      'Awaiting pickup',
      'Collected',
      'Rescued',
    ]) {
      await expect(donorPage.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('each count opens its filtered listing view', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');
    await donorPage.getByRole('link', { name: 'View listings' }).click();

    await expect(donorPage).toHaveURL(/\/listings\?status=available$/);
  });

  test('shows the attention table, not a lifecycle grid', async ({
    donorPage,
  }) => {
    await donorPage.goto('/dashboard');

    await expect(
      donorPage.getByText('Needs attention', { exact: true }),
    ).toBeVisible();
    await expect(
      donorPage.getByText('Recent activity', { exact: true }),
    ).toBeVisible();
    // The breakdown lives on /reports; the dashboard must not grow it back.
    await expect(donorPage.getByText(/Listings by status/)).toHaveCount(0);
  });

  test('reaches reports from the sidebar', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');
    await donorPage.getByRole('link', { name: 'Reports' }).click();

    await expect(donorPage).toHaveURL(/\/reports$/);
    await expect(
      donorPage.getByRole('heading', { name: 'Reports', exact: true }),
    ).toBeVisible();
  });
});

test.describe('Donor reports', () => {
  test('carries the breakdown, the trend and the table', async ({
    donorPage,
  }) => {
    await donorPage.goto('/reports');

    await expect(
      donorPage.getByText('Listings by status', { exact: true }),
    ).toBeVisible();
    await expect(donorPage.getByText('Claim rate', { exact: true })).toBeVisible();
    await expect(
      donorPage.getByText('Listing performance', { exact: true }),
    ).toBeVisible();
  });

  test('omits the claims breakdown for a donor', async ({ donorPage }) => {
    await donorPage.goto('/reports');

    // Both the card title and its sr-only summary would carry this.
    await expect(donorPage.getByText(/Claims by status/)).toHaveCount(0);
  });

  test('narrows the claim rate to a shorter window', async ({ donorPage }) => {
    await donorPage.goto('/reports');

    const sevenDays = donorPage.getByRole('button', { name: '7 days' });
    await sevenDays.click();

    await expect(sevenDays).toHaveAttribute('aria-pressed', 'true');
  });

  test('pages the performance table', async ({ donorPage }) => {
    await donorPage.goto('/reports');

    // Present whenever the table rendered at all; disabled on a single page.
    await expect(
      donorPage.getByRole('button', { name: 'Next page' }).or(
        donorPage.getByText('No claims recorded yet.'),
      ),
    ).toBeVisible();
  });
});
