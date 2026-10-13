import path from 'node:path';
import { expect, test } from '../../framework/fixtures';
import { delay } from '../../framework/utils/actions';

const HAR = path.join(__dirname, '..', 'fixtures', 'products.har');

test.describe('network control', () => {
  test('mock an API response with route.fulfill @cross', async ({ page }) => {
    await page.route('**/api/products?*', (route) =>
      route.fulfill({ json: [{ sku: 'LK-MCK-001', name: 'Mocked Lantern', category: 'packs', price: 12.5, in_stock: true, rating: 5 }] }),
    );
    await page.goto('/catalog');
    await expect(page.getByTestId('result-count')).toHaveText('1');
    await expect(page.getByRole('heading', { name: 'Mocked Lantern' })).toBeVisible();
  });

  test('modify a real response with route.fetch', async ({ page }) => {
    await page.route('**/api/products?*', async (route) => {
      const resp = await route.fetch();
      const items = (await resp.json()) as { price: number }[];
      await route.fulfill({ response: resp, json: items.map((p) => ({ ...p, price: p.price * 2 })) });
    });
    await page.goto('/catalog');
    await expect(page.getByTestId('product-card').filter({ hasText: 'Meadow 2P Tent' }).getByTestId('price')).toHaveText('$598.00');
  });

  test('block requests: abort the favicon and any third-party host', async ({ page }) => {
    const blocked: string[] = [];
    await page.route(/favicon|\.invalid\//, (route) => {
      blocked.push(route.request().url());
      return route.abort();
    });
    await page.goto('/catalog');
    await page.evaluate(() => fetch('http://tracker.invalid/pixel').catch(() => null));
    await expect.poll(() => blocked.length).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId('result-count')).toHaveText('10');
  });

  test('simulate a failed network call and check the UI copes', async ({ page }) => {
    await page.route('**/api/returns', (route) => route.fulfill({ status: 503, json: { detail: 'returns service unavailable' } }));
    await page.goto('/returns');
    await page.getByLabel('Order number').fill('LK-1001');
    await page.getByLabel('Reason').selectOption('faulty');
    await page.getByRole('button', { name: 'Submit return' }).click();
    await expect(page.locator('#return-result')).toHaveText('Return not created: returns service unavailable');
  });

  test('simulate a slow network and assert a latency budget', async ({ page }) => {
    await page.route('**/api/products?*', async (slow) => {
      await delay(800);
      await slow.continue();
    });
    const t0 = Date.now();
    await page.goto('/catalog');
    await expect(page.getByTestId('result-count')).toHaveText('10', { timeout: 3000 });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(800);
  });

  test('assert on the request the UI sends', async ({ page }) => {
    await page.goto('/returns');
    await page.getByLabel('Order number').fill('LK-1003');
    await page.getByLabel('Reason').selectOption('too-small');
    const reqPromise = page.waitForRequest((r) => r.url().endsWith('/api/returns') && r.method() === 'POST');
    await page.getByRole('button', { name: 'Submit return' }).click();
    const req = await reqPromise;
    expect(req.postDataJSON()).toEqual({ order_id: 'LK-1003', reason: 'too-small', photo: null });
    const resp = await req.response();
    expect(resp?.status()).toBe(201);
    expect(await resp?.json()).toMatchObject({ order_id: 'LK-1003', return_id: expect.stringMatching(/^RMA-\d{4}$/) });
  });

  test('replay recorded traffic from a HAR file', async ({ page }) => {
    // tests/fixtures/products.har was recorded from this app with scripts/record-har.mjs; edited to a fictional list.
    await page.routeFromHAR(HAR, { url: '**/api/products?*', notFound: 'fallback' });
    await page.goto('/catalog');
    await expect(page.getByTestId('result-count')).toHaveText('2');
    await expect(page.getByRole('heading', { name: 'Recorded Rain Hat' })).toBeVisible();
  });
});
