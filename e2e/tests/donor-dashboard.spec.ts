import { test, expect } from './fixtures/sessions';

// Read-only: nothing here creates data, so it can run in any order.
test.describe('Donor dashboard', () => {
  test('leads with the four counts a donor acts on', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');

    for (const label of [
      'Available now',
      'Awaiting pickup',
      'Collected',
      'Rescued',
    ]) {
      await expect(
        donorPage.getByRole('link', { name: new RegExp(label) }),
      ).toBeVisible();
    }
  });

  test('each count opens its filtered listing view', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');
    await donorPage
      .getByRole('link', { name: /Available now/ })
      .click();

    await expect(donorPage).toHaveURL(/\/listings\?status=available$/);
  });

  test('shows an attention panel rather than a lifecycle grid', async ({
    donorPage,
  }) => {
    await donorPage.goto('/dashboard');

    await expect(
      donorPage.getByRole('heading', { name: 'Needs attention' }),
    ).toBeVisible();
    // The breakdown moved to /reports; the dashboard must not grow it back.
    await expect(
      donorPage.getByText('Listings by Lifecycle Status'),
    ).toHaveCount(0);
  });

  test('sends the donor to the full breakdown', async ({ donorPage }) => {
    await donorPage.goto('/dashboard');
    await donorPage
      .getByRole('link', { name: /Full lifecycle breakdown/ })
      .click();

    await expect(donorPage).toHaveURL(/\/reports$/);
    await expect(
      donorPage.getByRole('heading', { name: 'Reports', exact: true }),
    ).toBeVisible();
  });

  test('reports carries the breakdown and the rescue metrics', async ({
    donorPage,
  }) => {
    await donorPage.goto('/reports');

    await expect(
      donorPage.getByText('Listings by Lifecycle Status'),
    ).toBeVisible();
    await expect(donorPage.getByText('Total Rescued Food')).toBeVisible();
  });
});
