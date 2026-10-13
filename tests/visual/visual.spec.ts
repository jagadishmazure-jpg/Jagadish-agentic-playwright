import { expect, test } from '../../framework/fixtures';

/**
 * Visual comparisons. Baselines are generated and compared inside the official Playwright Docker
 * image (see Dockerfile.e2e) so fonts and rendering match on every machine. Dynamic regions are
 * masked; animations and the caret are disabled in playwright.config.ts.
 */
test.describe('visual comparisons', () => {
  test('catalog grid', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByTestId('result-count')).toHaveText('10');
    await expect(page.getByRole('list', { name: 'Products' })).toHaveScreenshot('catalog-grid.png');
  });

  test('product page with the reviews masked', async ({ page }) => {
    await page.goto('/product?sku=LK-JKT-001');
    await expect(page.locator('#product')).toHaveAttribute('aria-busy', 'false');
    await expect(page).toHaveScreenshot('product.png', { mask: [page.locator('#reviews')], fullPage: true });
  });

  test('assistant answer with the generated text masked (layout, chips and citations still compared)', async ({ assistantPage, page }) => {
    await assistantPage.open(0);
    await assistantPage.ask('What is your returns policy?');
    await expect(page.getByRole('log', { name: 'Conversation' })).toHaveScreenshot('assistant-answer.png', {
      mask: [page.getByTestId('answer-text'), page.getByTestId('notice')],
    });
  });
});
