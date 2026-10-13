import { devices } from '@playwright/test';
import { expect, test } from '../../framework/fixtures';

test.describe('mobile emulation', () => {
  test('catalog works on a phone viewport with touch @mobile', async ({ page, isMobile }) => {
    await page.goto('/catalog');
    await expect(page.getByTestId('product-card')).toHaveCount(10);
    const box = await page.getByTestId('product-card').first().boundingBox();
    if (isMobile) expect(box!.width).toBeGreaterThan(300); // one column on a phone
  });

  test('device descriptor in a single test without a separate project', async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], baseURL: test.info().project.use.baseURL });
    const page = await ctx.newPage();
    await page.goto('/');
    expect(await page.evaluate(() => window.innerWidth)).toBe(390);
    expect(await page.evaluate(() => navigator.userAgent)).toContain('iPhone');
    await ctx.close();
  });
});
