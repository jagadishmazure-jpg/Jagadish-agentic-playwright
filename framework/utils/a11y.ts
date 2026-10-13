import AxeBuilder from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';

/**
 * Runs axe-core against the page for WCAG 2.1 A and AA rules and attaches the full JSON result to
 * the report. Returns the violations so specs can assert on them (normally: none).
 */
export async function scanA11y(page: Page, testInfo: TestInfo, opts: { include?: string; exclude?: string[] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (opts.include) builder = builder.include(opts.include);
  for (const e of opts.exclude ?? []) builder = builder.exclude(e);
  const results = await builder.analyze();
  await testInfo.attach('axe-results', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  return results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
}
