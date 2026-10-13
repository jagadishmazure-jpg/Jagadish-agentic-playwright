// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.
// Source: benchmark seed 13, task purchase. Only the final assertion was added.
import { expect, test } from '@playwright/test';
import { testCard } from '../../framework/config/env';

test('generated: seed 13 purchase', async ({ page }) => {
  await page.goto('/');
  await page.goto('/catalog');
  await page.getByRole('button', { name: 'Add Ridgeline Rain Shell to' }).click();
  await page.getByRole('link', { name: 'Cart (1)' }).click();
  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('Riley Ashford');
  await page.getByRole('textbox', { name: 'Address' }).fill('12 Example Lane');
  await page.locator('iframe[title="Payment"]').contentFrame().getByRole('textbox', { name: 'Card number' }).fill(testCard);
  await page.locator('iframe[title="Payment"]').contentFrame().getByRole('button', { name: 'Add card' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.locator('#result')).toHaveText(/Order placed: LK-\d{4}/);
});
