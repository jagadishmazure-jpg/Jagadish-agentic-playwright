// Generated from the Playwright code that Playwright MCP reported for each allowed action.
// Secrets are redacted. Replays the agent's path as a normal Playwright test.
import { test } from '@playwright/test';

test('replay seed 10', async ({ page }) => {
  await page.goto('http://127.0.0.1:8765/');
  await page.getByRole('link', { name: 'Returns', exact: true }).click();
  await page.getByRole('textbox', { name: 'Order number' }).fill('LK-9999');
  await page.getByLabel('Reason').selectOption('Faulty');
  await page.getByRole('button', { name: 'Submit return' }).click();
  await page.getByRole('button', { name: 'Submit return' }).click();
  await page.getByRole('button', { name: 'Submit return' }).click();
  await page.getByRole('button', { name: 'Submit return' }).click();
  await page.getByRole('button', { name: 'Submit return' }).click();
  await page.getByRole('button', { name: 'Submit return' }).click();
});
