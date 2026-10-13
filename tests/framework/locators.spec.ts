import { expect, test } from '../../framework/fixtures';

test.describe('locators', () => {
  test.beforeEach(async ({ catalogPage }) => {
    await catalogPage.goto();
    await expect(catalogPage.resultCount).toHaveText('10');
  });

  test('user-facing locators: role, label, text, test id, placeholder @cross', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
    await expect(page.getByLabel('Category')).toHaveValue('');
    // Scoped to the product grid: the accessory feed below can render the same name once it scrolls in.
    // Unscoped, this line was a real intermittent strict-mode failure (see docs/flaky-test-playbook.md).
    await expect(page.getByRole('list', { name: 'Products' }).getByText('Ridgeline Rain Shell')).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount(10);
    await page.goto('/returns');
    await expect(page.getByPlaceholder('LK-1003')).toBeEditable();
  });

  test('strict mode: an ambiguous locator throws instead of guessing', async ({ page }) => {
    const anyAdd = page.getByRole('button', { name: /^Add .* to cart$/ });
    const error = await anyAdd.click({ timeout: 1000 }).catch((e: Error) => e);
    expect(String(error)).toContain('strict mode violation');
    // The fix is to narrow on purpose: filter by a card that has a given heading.
    const card = page.getByTestId('product-card').filter({ has: page.getByRole('heading', { name: 'Talus Hiking Boot' }) });
    await card.getByRole('button').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  test('filter, nth, first, last, and/or, within', async ({ page }) => {
    const cards = page.getByTestId('product-card');
    await expect(cards.filter({ hasText: 'Out of stock' })).toHaveCount(2);
    await expect(cards.filter({ hasNotText: 'Out of stock' })).toHaveCount(8);
    await expect(cards.first().getByRole('heading')).toHaveText('Basecamp 65L Pack');
    await expect(cards.last().getByRole('heading')).toHaveText('Talus Hiking Boot');
    await expect(cards.nth(1).getByRole('heading')).toHaveText('Cinder Down Parka');
    const disabledButtons = page.getByRole('button').and(page.locator('[disabled]'));
    await expect(disabledButtons).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Fernwood Fleece' }).or(page.getByText('nothing'))).toBeVisible();
    // Playwright 1.64: locator.within() reads "this, within that".
    const price = page.getByTestId('price').within(cards.filter({ hasText: 'Meadow 2P Tent' }));
    await expect(price).toHaveText('$299.00');
  });

  test('dynamic content: locators re-resolve after the list re-renders', async ({ page, catalogPage }) => {
    const first = page.getByTestId('product-card').first().getByRole('heading');
    await expect(first).toHaveText('Basecamp 65L Pack');
    await catalogPage.filter({ sort: 'Price' });
    await expect(first).toHaveText('Fernwood Fleece'); // same Locator object, new DOM node
    await catalogPage.filter({ category: 'Boots' });
    await expect(catalogPage.resultCount).toHaveText('3');
  });

  test('a custom locator strategy: a data attribute engine scoped by helper', async ({ page }) => {
    const bySku = (sku: string) => page.locator(`button[data-sku="${sku}"]`);
    await bySku('LK-PCK-001').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await expect(bySku('LK-JKT-003')).toBeDisabled();
  });
});
