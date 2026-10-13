import { scanA11y } from '../../framework/utils/a11y';
import { expect, test } from '../../framework/fixtures';

test('assistant page and open approval dialog have no WCAG A/AA violations', async ({ assistantPage, page }, testInfo) => {
  await assistantPage.open(0);
  expect(await scanA11y(page, testInfo)).toEqual([]);
  await assistantPage.ask('Please refund order LK-1003');
  await expect(assistantPage.approvalDialog).toBeVisible();
  expect(await scanA11y(page, testInfo)).toEqual([]);
  await expect(page.getByRole('log', { name: 'Conversation' })).toBeVisible();
});
