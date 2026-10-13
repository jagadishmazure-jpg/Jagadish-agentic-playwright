import { expect, test } from '../../framework/fixtures';

test.describe('iframes, shadow DOM, popups and dialogs', () => {
  test('fill a field inside the payment iframe @cross', async ({ checkoutPage }) => {
    await checkoutPage.goto();
    await checkoutPage.addCard('4000 0000 0000 0002');
    await expect(checkoutPage.payment.getByRole('status')).toHaveText('Card declined');
    await checkoutPage.addCard('4242 4242 4242 4242');
    await expect(checkoutPage.payment.getByRole('status')).toHaveText('Card accepted');
    await expect(checkoutPage.payStatus).toHaveText('Card added.');
    // The same frame through locator.contentFrame(), and frameLocator().owner() back to the <iframe>.
    await expect(checkoutPage.page.getByTitle('Payment').contentFrame().getByLabel('Card number')).toHaveValue('4242 4242 4242 4242');
    await expect(checkoutPage.payment.owner()).toHaveAttribute('src', '/static/payment-frame.html');
  });

  test('shadow DOM: role and CSS locators pierce open shadow roots', async ({ productPage }) => {
    await productPage.open('LK-JKT-002');
    await expect(productPage.ratingStars).toHaveAccessibleName('Rated 4.8 out of 5');
    await productPage.helpful.click();
    await expect(productPage.page.locator('lk-rating output')).toHaveText('Thanks for the feedback');
    // XPath does not pierce shadow roots:
    await expect(productPage.page.locator('xpath=//lk-rating//button')).toHaveCount(0);
  });

  test('popup window: wait for the event before the click', async ({ productPage }) => {
    await productPage.open('LK-JKT-001');
    const popup = await productPage.openSizeGuide();
    await expect(popup).toHaveTitle(/Size guide/);
    await expect(popup.getByRole('row', { name: /M 96–104/ })).toBeVisible();
    await popup.close();
    await expect(productPage.name).toHaveText('Ridgeline Rain Shell');
  });

  test('new tab opened by the user (context page event)', async ({ page, context }) => {
    await page.goto('/');
    const pagePromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Start a return' }).click({ modifiers: ['ControlOrMeta'] });
    const tab = await pagePromise;
    await tab.waitForLoadState();
    await expect(tab).toHaveURL(/\/returns$/);
    expect(context.pages()).toHaveLength(2);
  });

  test('confirm dialog: dismissed by default, accepted when the test says so', async ({ page, cartPage }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('lk_cart', JSON.stringify(['LK-JKT-001', 'LK-PCK-001'])));
    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(2);
    // No handler registered: Playwright dismisses the dialog, so nothing is removed.
    await page.getByRole('button', { name: 'Remove Ridgeline Rain Shell' }).click();
    await expect(cartPage.rows).toHaveCount(2);
    const message = await cartPage.remove('Ridgeline Rain Shell', true);
    expect(message).toBe('Remove this item from your cart?');
    await expect(cartPage.rows).toHaveCount(1);
    await expect(cartPage.total).toHaveAmount(89);
  });
});
