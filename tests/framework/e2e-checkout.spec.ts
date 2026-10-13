import { expect, test } from '../../framework/fixtures';

test('shopper buys a daypack end to end: browse, add, review cart, pay in iframe, place order @smoke @cross', async ({ catalogPage, cartPage, checkoutPage, page }) => {
  await test.step('browse and filter', async () => {
    await catalogPage.goto();
    await catalogPage.filter({ category: 'Packs', inStockOnly: true, sort: 'Price' });
    await expect(catalogPage.resultCount).toHaveText('2');
  });
  await test.step('add to cart', async () => {
    await catalogPage.addToCart('Switchback 28L Daypack');
    await expect(catalogPage.cartCount).toHaveText('1');
  });
  await test.step('review cart', async () => {
    await cartPage.goto();
    await expect(cartPage.rows).toHaveCount(1);
    await expect(cartPage.total).toHaveAmount(89);
    await page.getByRole('link', { name: 'Checkout' }).click();
  });
  await test.step('pay and place the order', async () => {
    await checkoutPage.fillAddress('Riley Ashford', '12 Example Lane');
    await checkoutPage.addCard('4242 4242 4242 4242');
    await expect(checkoutPage.payStatus).toHaveText('Card added.');
    await checkoutPage.placeOrder();
    await expect(checkoutPage.result).toHaveText(/^Order placed: LK-\d{4}$/);
    await expect(checkoutPage.cartCount).toHaveText('0');
  });
});

test('placing an order without a card is refused in the UI', async ({ checkoutPage }) => {
  await checkoutPage.goto();
  await checkoutPage.fillAddress('Riley Ashford', '12 Example Lane');
  await checkoutPage.placeOrder();
  await expect(checkoutPage.result).toHaveText('Add a card first.');
});
