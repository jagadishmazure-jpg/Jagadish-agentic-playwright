import { makeProduct } from '../../framework/utils/data';
import { expect, test } from '../../framework/fixtures';

test.describe('API and UI together', () => {
  test('create data through the API, verify it in the UI, clean up through the API', async ({ staffApi, page }, testInfo) => {
    const p = makeProduct(testInfo, { name: `Trail Gaiter ${testInfo.parallelIndex}${testInfo.repeatEachIndex}`, category: 'tents', price: 31 });
    await staffApi.createProduct(p);
    try {
      await page.goto('/catalog');
      await page.getByLabel('Category').selectOption('tents');
      await expect(page.getByRole('heading', { name: p.name })).toBeVisible();
    } finally {
      await staffApi.deleteProduct(p.sku);
    }
  });

  test('reuse an API response as the expected data for the UI', async ({ api, productPage }) => {
    const detail = await api.product('LK-JKT-001');
    await productPage.open('LK-JKT-001');
    await expect(productPage.name).toHaveText(detail.name);
    await expect(productPage.price).toHaveAmount(detail.price);
    await expect(productPage.reviews).toHaveCount(detail.reviews.length);
  });

  test('validate the API response produced by a UI action', async ({ page }) => {
    await page.goto('/catalog');
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/products?') && r.url().includes('category=boots'));
    await page.getByLabel('Category').selectOption('boots');
    const items = (await (await respPromise).json()) as { category: string }[];
    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.category))).toEqual(new Set(['boots']));
  });
});
