import { AUTH, expect, test } from '../../framework/fixtures';
import { ConsolePage } from '../../framework/pages';

test.describe('human approval for refunds', () => {
  test('the approval dialog appears and the customer can cancel', async ({ assistantPage, api }) => {
    await assistantPage.open(0);
    await assistantPage.ask('Please refund order LK-1003');
    await expect(assistantPage.approvalDialog).toBeVisible();
    await expect(assistantPage.approvalDialog).toContainText('Refund of $268.00 for order LK-1003');
    await assistantPage.approvalDialog.getByRole('button', { name: 'Cancel request' }).click();
    await expect(assistantPage.approvalDialog.getByText('Request cancelled.')).toBeVisible();
    const id = (await assistantPage.approvalDialog.textContent())!.match(/APR-\d{4}/)![0];
    expect((await api.approvals()).find((a) => a.id === id)?.status).toBe('denied');
  });

  test('a specialist approves in a second browser context and the customer sees it @cross', async ({ assistantPage, browser, baseURL }) => {
    await assistantPage.open(1);
    await assistantPage.ask('Refund order LK-1001 please');
    await expect(assistantPage.approvalDialog).toBeVisible();
    const id = (await assistantPage.approvalDialog.textContent())!.match(/APR-\d{4}/)![0];

    const staff = await browser.newContext({ storageState: AUTH.specialist, baseURL });
    const consolePage = new ConsolePage(await staff.newPage());
    await consolePage.goto();
    await expect(consolePage.queue.getByRole('row', { name: new RegExp(id) })).toContainText('pending');
    await consolePage.decide(id, true);
    await expect(consolePage.queue.getByRole('row', { name: new RegExp(id) })).toContainText('approved');
    await staff.close();

    await expect(assistantPage.approvalDialog.getByText('Approved: refund issued.')).toBeVisible();
  });

  test('a customer cannot approve their own refund from the console', async ({ browser, baseURL, api }) => {
    const events = await api.chat('Refund order LK-1003', 5);
    const id = String(events.find((e) => e.type === 'approval_required')!.id);
    const ctx = await browser.newContext({ storageState: AUTH.customer, baseURL });
    const consolePage = new ConsolePage(await ctx.newPage());
    await consolePage.goto();
    await consolePage.decide(id, true);
    await expect(consolePage.message).toHaveText('Not allowed: only a returns specialist can approve a refund');
    expect((await api.approvals()).find((a) => a.id === id)?.status).toBe('pending');
    await ctx.close();
  });

  test('ineligible orders never reach the approval step', async ({ assistantPage }) => {
    await assistantPage.open(2);
    const r = await assistantPage.ask('Refund order LK-1002');
    expect(r.tools).not.toContain('issue_refund');
    await expect(assistantPage.approvalDialog).toBeHidden();
  });
});
