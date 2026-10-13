import { writeFileSync, mkdirSync } from 'node:fs';
import { healByRole, locatorFor } from '../../framework/healing/healer';
import { expect, test } from '../../framework/fixtures';

/**
 * Heal benchmark for the offline healer. Each case starts from a locator that worked in the
 * hand-written suite, then breaks it the way UI changes break tests (a renamed label, a typo, extra
 * words) or removes the element entirely (a real bug). Ground truth is known, so we can count:
 *   correct heal     healed and resolves to the intended element
 *   false heal       healed to a different element (the dangerous outcome)
 *   correct refusal  element really gone, healer refused
 *   missed heal      element still there, healer refused
 */
interface Case { page: string; role: string; broken: string; intended: string | null; setup?: string; knownFalseHeal?: string }

const CASES: Case[] = [
  { page: '/returns', role: 'button', broken: 'Submit', intended: 'Submit return' },
  { page: '/returns', role: 'button', broken: 'Submit the return', intended: 'Submit return' },
  { page: '/returns?v=1', role: 'button', broken: 'Submit return', intended: 'Send return request' },
  { page: '/returns', role: 'textbox', broken: 'Order no', intended: 'Order number' },
  { page: '/returns', role: 'combobox', broken: 'Return reason', intended: 'Reason' },
  { page: '/login', role: 'button', broken: 'Continue to sign in', intended: 'Continue' },
  { page: '/login', role: 'textbox', broken: 'User name', intended: 'Username' },
  { page: '/catalog', role: 'button', broken: 'Add Talus Boot to cart', intended: 'Add Talus Hiking Boot to cart' },
  { page: '/catalog', role: 'button', broken: 'Add Ridgline Rain Shell to cart', intended: 'Add Ridgeline Rain Shell to cart' },
  { page: '/catalog', role: 'link', broken: 'Meadow Tent', intended: 'Meadow 2P Tent' },
  { page: '/checkout', role: 'button', broken: 'Place the order', intended: 'Place order' },
  { page: '/checkout', role: 'textbox', broken: 'Name', intended: 'Full name' },
  { page: '/assistant', role: 'button', broken: 'Send message', intended: 'Send' },
  { page: '/assistant', role: 'textbox', broken: 'Message', intended: 'Your message' },
  { page: '/orders', role: 'button', broken: 'Order total', intended: 'Total' },
  { page: '/catalog', role: 'button', broken: 'Add Basecamp 65L Pack to basket', intended: 'Add Basecamp 65L Pack to cart' },
  // Element removed: the right answer is to refuse, because the test is catching a real bug.
  { page: '/returns', role: 'button', broken: 'Submit return', intended: null, setup: "document.querySelector('#submit-return').remove()" },
  { page: '/checkout', role: 'button', broken: 'Place order', intended: null, setup: "document.querySelector('#place').remove()" },
  { page: '/product?sku=LK-JKT-001', role: 'button', broken: 'Add to cart', intended: null, setup: "document.querySelector('#add').remove()" },
  // Known false heal, found on the first run and kept visible on purpose: the healer "fixes" a removed
  // product's button by pointing it at another product's button. Shapes are similar, the meaning is not.
  // This is why every healed locator needs human review (docs/test-agents.md).
  {
    page: '/catalog',
    role: 'button',
    broken: 'Add Glacier Winter Boot to cart',
    intended: null,
    setup: "document.querySelector('[data-sku=\"LK-BOT-003\"]').remove()",
    knownFalseHeal: 'healed onto a different product button',
  },
];

const results: { case: string; outcome: string; proposal: unknown }[] = [];

test.describe.configure({ mode: 'serial' });

for (const c of CASES) {
  test(`heal ${c.role} "${c.broken}" on ${c.page}${c.intended === null ? ' (element removed)' : ''}`, async ({ page }) => {
    test.fail(!!c.knownFalseHeal, c.knownFalseHeal);
    await page.goto(c.page);
    await page.waitForLoadState('networkidle');
    if (c.setup) await page.evaluate(c.setup);
    const broken = page.getByRole(c.role as 'button', { name: c.broken, exact: true });
    await expect(broken).toHaveCount(0); // the locator really is broken
    const p = await healByRole(page, c.role, c.broken);
    let outcome: string;
    if (c.intended === null) outcome = p.healed ? 'false heal' : 'correct refusal';
    else if (!p.healed) outcome = 'missed heal';
    else outcome = p.newName === c.intended && (await locatorFor(page, p).count()) === 1 ? 'correct heal' : 'false heal';
    results.push({ case: `${c.page} ${c.role} "${c.broken}"`, outcome, proposal: p });
    expect(outcome, JSON.stringify(p)).not.toBe('false heal');
  });
}

test.afterAll(() => {
  const count = (o: string) => results.filter((r) => r.outcome === o).length;
  const summary = {
    healer: 'offline rule-based healer (framework/healing/healer.ts), not Playwright\'s LLM healer agent',
    cases: results.length,
    broken_locator_cases: CASES.filter((c) => c.intended !== null).length,
    removed_element_cases: CASES.filter((c) => c.intended === null).length,
    correct_heal: count('correct heal'),
    missed_heal: count('missed heal'),
    false_heal: count('false heal'),
    correct_refusal: count('correct refusal'),
    results,
  };
  if (results.length === CASES.length) {
    mkdirSync('evidence', { recursive: true });
    writeFileSync('evidence/healing.json', JSON.stringify(summary, null, 2) + '\n');
  }
});
