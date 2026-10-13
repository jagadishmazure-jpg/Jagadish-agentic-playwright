import { expect, test } from '../../framework/fixtures';

test.describe('streaming answers', () => {
  test('the answer streams in: first token arrives before the answer is complete @cross', async ({ assistantPage, page }) => {
    await assistantPage.open(0);
    // Sample the answer length as it grows: a streamed answer shows several distinct partial lengths.
    const lengths = new Set<number>();
    await assistantPage.input.fill('Please refund order LK-1003');
    await assistantPage.send.click();
    const text = page.getByTestId('answer-text').last();
    await expect(async () => {
      lengths.add(((await text.textContent()) ?? '').length);
      expect(await page.getByTestId('answer').last().getAttribute('data-done')).toBe('true');
    }).toPass({ intervals: [20], timeout: 10_000 });
    expect(lengths.size, 'distinct partial lengths observed while streaming').toBeGreaterThan(3);
  });

  test('latency budgets: first token and full answer', async ({ assistantPage, env }) => {
    await assistantPage.open(1);
    const r = await assistantPage.ask('What is your returns policy?');
    test.info().annotations.push({ type: 'latency', description: `first=${r.firstTokenMs}ms total=${r.totalMs}ms server=${r.serverLatencyMs}ms` });
    expect(r.firstTokenMs).toBeLessThan(env.firstTokenBudgetMs);
    expect(r.totalMs).toBeLessThan(env.answerBudgetMs);
  });

  test('the send button is disabled while an answer streams', async ({ assistantPage }) => {
    await assistantPage.open(0);
    await assistantPage.input.fill('Please refund order LK-1003');
    await assistantPage.send.click();
    await expect(assistantPage.send).toBeDisabled();
    await expect(assistantPage.send).toBeEnabled({ timeout: 10_000 });
    await expect(assistantPage.status).toHaveText('Done');
  });
});
