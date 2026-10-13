import { expect, test } from '../../framework/fixtures';

/**
 * Seed test for Playwright Test Agents (planner, generator, healer). The agents run this first to get
 * a page in a known state, then explore from there. It uses the repo's fixtures so generated tests
 * inherit the same baseURL, web server and test-id attribute. See docs/test-agents.md.
 */
test.describe('Larkspur seed', () => {
  test('seed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Gear for wet trails' })).toBeVisible();
  });
});
