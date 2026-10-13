// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.
// Source: benchmark seed 26, task return. Only the final assertion was added.
import { expect, test } from '@playwright/test';

test('generated: seed 26 return', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Returns', exact: true }).click();
  await page.goto('/returns?v=2');
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-1002');
  await page.getByLabel('Reason').selectOption('Too large');
  await page.getByRole('button', { name: 'Submit return' }).click();
  await expect(page.getByRole('status')).toHaveText(/Return RMA-\d{4} created for LK-1002/);
});
