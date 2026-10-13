// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.
// Source: benchmark seed 42, task return. Only the final assertion was added.
import { expect, test } from '@playwright/test';

test('generated: seed 42 return', async ({ page }) => {
  await page.goto('/catalog');
  await page.goto('/product?sku=LK-JKT-002');
  await page.getByRole('link', { name: 'Returns' }).click();
  await page.goto('/returns?v=1');
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-1002');
  await page.getByLabel('Reason').selectOption('Too large');
  await page.getByRole('button', { name: 'Send return request' }).click();
  await expect(page.getByRole('status')).toHaveText(/Return RMA-\d{4} created for LK-1002/);
});
