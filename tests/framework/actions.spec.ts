import { expect, test } from '../../framework/fixtures';

test.describe('actions and form controls', () => {
  test('dropdown, checkbox and radio drive the filter @cross', async ({ catalogPage, page }) => {
    await catalogPage.goto();
    await catalogPage.category.selectOption('boots'); // by value
    await expect(catalogPage.resultCount).toHaveText('3');
    await catalogPage.category.selectOption({ label: 'Jackets' }); // by visible label
    await catalogPage.inStock.check();
    await expect(catalogPage.inStock).toBeChecked();
    await expect(catalogPage.resultCount).toHaveText('2');
    await catalogPage.inStock.uncheck();
    await expect(catalogPage.resultCount).toHaveText('3');
    const price = page.getByRole('radio', { name: 'Price' });
    await price.check();
    await expect(price).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Name' })).not.toBeChecked();
    await expect(catalogPage.cards.first().getByRole('heading')).toHaveText('Fernwood Fleece');
  });

  test('keyboard: type, press, select all and clear', async ({ page }) => {
    await page.goto('/returns');
    const order = page.getByLabel('Order number');
    await order.pressSequentially('LK-10', { delay: 10 }); // key by key, for inputs with key handlers
    await order.press('3');
    await expect(order).toHaveValue('LK-103');
    await order.press('ControlOrMeta+a');
    await order.press('Backspace');
    await expect(order).toHaveValue('');
    await order.fill('LK-1003');
    await order.clear();
    await expect(order).toBeEmpty();
    await order.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Reason')).toBeFocused();
  });

  test('hover and scroll into view', async ({ page }) => {
    await page.goto('/catalog');
    const link = page.getByRole('link', { name: 'Summit 1P Bivy' });
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect(link).toBeInViewport();
  });

  test('drag and drop reorders the priorities', async ({ returnsPage }) => {
    await returnsPage.goto();
    await expect(returnsPage.priorities).toHaveText(['Fast refund', 'Free label', 'Store credit bonus']);
    await returnsPage.priorities.filter({ hasText: 'Store credit bonus' }).dragTo(returnsPage.priorities.filter({ hasText: 'Fast refund' }));
    await expect(returnsPage.priorities).toHaveText(['Store credit bonus', 'Fast refund', 'Free label']);
  });

  test('click vs force vs dispatchEvent on a disabled button', async ({ page }) => {
    await page.goto('/catalog');
    const disabled = page.getByRole('button', { name: 'Add Fernwood Fleece to cart' });
    await expect(disabled).toBeDisabled();
    // A normal click waits for "enabled" and times out: that is the actionability check protecting you.
    const err = await disabled.click({ timeout: 500 }).catch((e: Error) => e);
    expect(String(err)).toContain('Timeout');
    // force skips the checks; the browser still ignores real clicks on disabled buttons, so nothing is added.
    await disabled.click({ force: true });
    await expect(page.getByTestId('cart-count')).toHaveText('0');
    // dispatchEvent fires a synthetic DOM event that bubbles to the page's delegated handler, so an
    // out-of-stock item lands in the cart: something no real user could do. That is why it is a last resort.
    await disabled.dispatchEvent('click');
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
