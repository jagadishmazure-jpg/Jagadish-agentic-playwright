import { expect as base, type Locator } from '@playwright/test';
import { similarity } from '../utils/semantic';

/** Custom matchers: money amounts in the UI, and semantic similarity for generated text. */
export const expect = base.extend({
  async toHaveAmount(locator: Locator, expected: number, options?: { timeout?: number }) {
    const timeout = options?.timeout ?? this.timeout;
    let actual = NaN;
    let pass = false;
    try {
      await base.poll(async () => (actual = Number((await locator.textContent())?.replace(/[^0-9.]/g, ''))), { timeout }).toBe(expected);
      pass = true;
    } catch {
      pass = false;
    }
    return { pass, name: 'toHaveAmount', expected, actual, message: () => `expected amount ${expected}, got ${actual}` };
  },
  toBeSemanticallyCloseTo(received: string, reference: string, threshold = 0.5) {
    const score = similarity(received, reference);
    const pass = score >= threshold;
    return { pass, name: 'toBeSemanticallyCloseTo', message: () => `similarity ${score.toFixed(2)} vs threshold ${threshold}\n  received: ${received}\n  reference: ${reference}` };
  },
});
