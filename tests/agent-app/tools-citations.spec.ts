import { expect, test } from '../../framework/fixtures';

test.describe('tool calls and citations', () => {
  test('order status uses the lookup tool and renders its result', async ({ assistantPage, page }) => {
    await assistantPage.open(2);
    const r = await assistantPage.ask('Where is my order LK-1004?');
    expect(r.tools).toEqual(['lookup_order']);
    await expect(page.getByTestId('tool-call').last()).toHaveText('Used tool: lookup_order → found');
    expect(r.text).toContain('LK-1004');
    expect(r.text).toMatch(/shipped/);
  });

  test('a refund request calls lookup, policy search and refund tools in order @cross', async ({ assistantPage }) => {
    await assistantPage.open(0);
    const r = await assistantPage.ask('I want a refund for order LK-1003');
    expect(r.tools).toEqual(['lookup_order', 'search_policy', 'issue_refund']);
  });

  test('policy answers cite real policy documents and never the tampered one', async ({ assistantPage, api }) => {
    await assistantPage.open(4);
    const r = await assistantPage.ask('What is the return policy for worn boots and the refund window?');
    expect(r.citations.length).toBeGreaterThan(0);
    expect(r.citations).not.toContain('POL-VND-09');
    // Every citation must point to a policy the knowledge base actually has (grounding check).
    const known = ['POL-RET-01', 'POL-RET-02', 'POL-RET-03', 'POL-SHP-01'];
    for (const c of r.citations) expect(known).toContain(c);
    expect(api).toBeTruthy();
  });

  test('unknown orders are reported, not invented', async ({ assistantPage }) => {
    await assistantPage.open(1);
    const r = await assistantPage.ask('Where is order LK-9999?');
    expect(r.text).toContain('LK-9999');
    expect(r.text).toMatch(/couldn't find|no order|doesn't exist/i);
  });
});
