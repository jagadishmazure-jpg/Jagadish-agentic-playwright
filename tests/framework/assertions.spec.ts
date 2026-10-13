import { expect as pwExpect } from '@playwright/test';
import { expect, test } from '../../framework/fixtures';

test.describe('assertions and auto-waiting', () => {
  test('web-first assertions retry; one-shot reads do not', async ({ page }) => {
    await page.route('**/api/products?*', async (route) => {
      await new Promise((r) => setTimeout(r, 600)); // the list arrives late
      await route.continue();
    });
    await page.goto('/catalog');
    const count = page.getByTestId('result-count');
    // One-shot: reads the value once, before the data arrives.
    expect(await count.textContent()).toBe('0');
    // Web-first: retries until the condition holds or the timeout passes.
    await expect(count).toHaveText('10');
  });

  test('soft assertions report every failure without stopping the test', async ({ page }) => {
    await page.goto('/product?sku=LK-JKT-001');
    await expect.soft(page.getByRole('heading', { level: 1 }), 'product name').toHaveText('Ridgeline Rain Shell');
    await expect.soft(page.locator('#price'), 'price').toHaveText('$129.00');
    await expect.soft(page.locator('li.review'), 'review count').toHaveCount(2);
    expect(test.info().errors).toHaveLength(0);
  });

  test('custom messages and a custom matcher', async ({ page }) => {
    await page.goto('/product?sku=LK-TNT-001');
    await expect(page.locator('#price'), 'tent price shown on the product page').toHaveAmount(299);
    expect('Refund approved for the order', 'semantic custom matcher').toBeSemanticallyCloseTo('the order refund was approved', 0.6);
  });

  test('expect.poll and toPass for things that are not locators', async ({ request }) => {
    await expect.poll(async () => (await request.get('/healthz')).status(), { message: 'app healthy', timeout: 5000 }).toBe(200);
    let attempts = 0;
    await expect(async () => {
      attempts += 1;
      const r = await request.get('/api/slow?ms=50');
      pwExpect(r.ok()).toBeTruthy();
      pwExpect(attempts).toBeGreaterThanOrEqual(2); // fails the first time on purpose to show the retry
    }).toPass({ intervals: [100], timeout: 5000 });
  });

  test('expect.configure: a slower expect for one known-slow check', async ({ page }) => {
    await page.route('**/api/me', async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({ json: { username: 'riley', display: 'Riley', role: 'customer' } });
    });
    await page.route('**/api/orders', (route) => route.fulfill({ json: [] }));
    await page.goto('/account');
    const slowExpect = expect.configure({ timeout: 10_000 });
    await slowExpect(page.getByText('Welcome back, Riley')).toBeVisible();
  });

  test('aria snapshot assertion of a whole region', async ({ page }) => {
    await page.goto('/static/size-guide.html');
    await expect(page.getByRole('table', { name: 'Jacket sizes' })).toMatchAriaSnapshot(`
      - table "Jacket sizes":
        - rowgroup:
          - row "Size Chest (cm)"
        - rowgroup:
          - row "S 88–96"
          - row "M 96–104"
          - row "L 104–112"
    `);
  });
});
