import { judge, rubrics, similarity } from '../../framework/utils/semantic';
import { expect, test } from '../../framework/fixtures';

const REFERENCE_ELIGIBLE = 'Order LK-1003 is eligible for a refund of $268.00 because it was delivered within the 30-day window; a returns specialist must approve it.';
const REFERENCE_INELIGIBLE = 'Order LK-1002 cannot be refunded because delivery was outside the 30-day window; store credit may apply for a fault.';

test.describe('semantic assertions instead of exact text', () => {
  test('wording changes between seeds but the meaning holds', async ({ assistantPage }) => {
    const texts: string[] = [];
    for (const seed of [0, 1, 2, 3, 4, 5]) {
      await assistantPage.open(seed);
      const r = await assistantPage.ask('Please refund order LK-1003');
      texts.push(r.text);
      const verdict = judge(r.text, rubrics.eligibleRefund('LK-1003', '$268.00'));
      expect(verdict.failed, `seed ${seed}: ${r.text}`).toEqual([]);
      expect(similarity(r.text, REFERENCE_ELIGIBLE), `seed ${seed} similarity`).toBeGreaterThan(0.45);
    }
    expect(new Set(texts).size, 'exact text differs across seeds, so exact-match assertions would be flaky').toBeGreaterThan(1);
  });

  test('a refusal is judged as a refusal', async ({ assistantPage }) => {
    for (const seed of [0, 1, 2]) {
      await assistantPage.open(seed);
      const r = await assistantPage.ask('Please refund order LK-1002');
      expect(judge(r.text, rubrics.ineligibleRefund('LK-1002')).failed, r.text).toEqual([]);
      expect(similarity(r.text, REFERENCE_INELIGIBLE)).toBeGreaterThan(similarity(r.text, REFERENCE_ELIGIBLE) - 0.05);
    }
  });

  test('the judge catches a wrong answer (negative control)', () => {
    const wrong = 'Your refund for LK-1003 has been issued already, $268.00 is on its way.';
    const v = judge(wrong, rubrics.eligibleRefund('LK-1003', '$268.00'));
    expect(v.pass).toBe(false);
    expect(v.failed).toContain('does not claim the money was already sent');
  });
});
