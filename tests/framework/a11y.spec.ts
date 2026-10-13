import { scanA11y } from '../../framework/utils/a11y';
import { expect, test } from '../../framework/fixtures';

for (const path of ['/', '/catalog', '/returns', '/product?sku=LK-JKT-001', '/login', '/checkout']) {
  test(`no WCAG 2.1 A/AA violations on ${path}`, async ({ page }, testInfo) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await scanA11y(page, testInfo)).toEqual([]);
  });
}

test('accessible names and roles of key controls', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page.getByRole('button', { name: 'Add Talus Hiking Boot to cart' })).toHaveAccessibleName('Add Talus Hiking Boot to cart');
  await expect(page.getByTestId('product-card').first()).toHaveRole('listitem');
});
