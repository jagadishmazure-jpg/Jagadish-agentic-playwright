import { expect, test } from '../../framework/fixtures';

test.describe('synchronisation without sleeps', () => {
  test('wait for a specific response, URL and load state', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/products') && r.status() === 200);
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });
    const resp = await respPromise;
    expect((await resp.json()).length).toBe(10);
    await page.getByRole('link', { name: 'Talus Hiking Boot' }).click();
    await page.waitForURL(/product\?sku=LK-BOT-001/);
    await page.waitForLoadState('load');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Talus Hiking Boot');
  });

  test('locator.waitFor for an element state', async ({ page }) => {
    await page.goto('/returns');
    const link = page.getByRole('link', { name: 'Download return label' });
    await link.waitFor({ state: 'hidden' });
    await page.getByLabel('Order number').fill('LK-1001');
    await page.getByLabel('Reason').selectOption('faulty');
    await page.getByRole('button', { name: 'Submit return' }).click();
    await link.waitFor({ state: 'visible' });
  });

  test('time-dependent UI with the Clock API instead of waiting', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-01T09:00:00-05:00') });
    await page.goto('/static/size-guide.html');
    await page.evaluate(() => {
      const p = document.createElement('p');
      p.id = 'later';
      document.body.append(p);
      setTimeout(() => (p.textContent = 'Shown after 10 minutes'), 10 * 60 * 1000);
    });
    await page.clock.fastForward('10:00');
    await expect(page.locator('#later')).toHaveText('Shown after 10 minutes');
  });

  test('a locator handler closes an overlay whenever it appears', async ({ page }) => {
    await page.goto('/returns');
    await page.evaluate(() => {
      const o = document.createElement('div');
      o.setAttribute('role', 'dialog');
      o.setAttribute('aria-label', 'Newsletter');
      o.style.cssText = 'position:fixed;inset:0;background:#fffe;z-index:9';
      o.innerHTML = '<button onclick="this.parentElement.remove()">No thanks</button>';
      document.body.append(o);
    });
    await page.addLocatorHandler(page.getByRole('dialog', { name: 'Newsletter' }), async (overlay) => {
      await overlay.getByRole('button', { name: 'No thanks' }).click();
    });
    await page.getByLabel('Order number').fill('LK-1002');
    await expect(page.getByLabel('Order number')).toHaveValue('LK-1002');
  });
});
