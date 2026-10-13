// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.
// Source: benchmark seed 20, task return. Only the final assertion was added.
import { expect, test } from '@playwright/test';

test('generated: seed 20 return', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('link', { name: 'Returns' }).click();
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-1001');
  await page.getByLabel('Reason').selectOption('Faulty');
  await page.getByRole('button', { name: 'Submit return' }).click();
  await expect(page.getByRole('status')).toHaveText(/Return RMA-\d{4} created for LK-1001/);
});
