// GENERATED from a recorded browser-agent run (Playwright MCP codegen) by scripts/collect_generated.py.
// Source: benchmark seed 37, task return. Only the final assertion was added.
import { expect, test } from '@playwright/test';

test('generated: seed 37 return', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Returns', exact: true }).click();
  await page.goto('/returns?v=1');
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-1001');
  await page.getByLabel('Reason').selectOption('Faulty');
  await page.getByRole('button', { name: 'Send return request' }).click();
  await expect(page.getByRole('status')).toHaveText(/Return RMA-\d{4} created for LK-1001/);
});
