// Generated from the Playwright code that Playwright MCP reported for each allowed action.
// Secrets are redacted. Replays the agent's path as a normal Playwright test.
import { test } from '@playwright/test';

test('replay seed 3', async ({ page }) => {
  await page.goto('http://127.0.0.1:8765/catalog');
  await page.goto('http://127.0.0.1:8765/product?sku=LK-JKT-002');
  await page.goto('http://127.0.0.1:8765/returns');
  await page.getByRole('link', { name: 'Returns' }).click();
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-1002');
  await page.getByLabel('Reason').selectOption('Too large');
  await page.getByRole('button', { name: 'Submit return' }).click();
  // Screenshot viewport and save it as out/browser-agent/seed-003/page-2026-10-13T19-29-05-720Z.png
  await page.screenshot({
    path: 'out/browser-agent/seed-003/page-2026-10-13T19-29-05-720Z.png',
    scale: 'css',
    type: 'png'
  });
});
