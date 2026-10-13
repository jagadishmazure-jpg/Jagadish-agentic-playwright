import { AUTH, expect, test } from '../../framework/fixtures';

test.describe('authentication and sessions', () => {
  test('wrong password shows an error and no code step @smoke', async ({ loginPage }) => {
    await loginPage.goto();
    const challenge = await loginPage.submitCredentials('riley', 'not-the-password');
    expect(challenge).toBe('');
    await expect(loginPage.error).toHaveText('Wrong username or password.');
    await expect(loginPage.otp).toBeHidden();
  });

  test('a wrong one-time code is rejected', async ({ loginPage, env }) => {
    await loginPage.goto();
    await loginPage.submitCredentials(env.users.customer.username, env.users.customer.password);
    await loginPage.submitOtp('000000');
    await expect(loginPage.page.getByText('That code did not work.')).toBeVisible();
  });

  test.describe('with saved customer state', () => {
    test.use({ storageState: AUTH.customer });

    test('storageState skips the login screen @cross', async ({ page }) => {
      await page.goto('/account');
      await expect(page.getByText('Welcome back, Riley')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Account (Riley)' })).toBeVisible();
    });

    test('dashboard lists only this customer\'s orders', async ({ page }) => {
      await page.goto('/account');
      await expect(page.locator('#recent li')).toHaveText([/LK-1001/, /LK-1002/]);
    });
  });

  test('two users at once: separate browser contexts never share cookies', async ({ browser, env, baseURL }) => {
    const riley = await browser.newContext({ storageState: AUTH.customer, baseURL });
    const morgan = await browser.newContext({ baseURL });
    const tok = await (await morgan.request.post('/api/auth/token', { data: env.users.customer2 })).json();
    await morgan.addCookies([{ name: 'lk_session', value: tok.session, url: baseURL! }]);
    const [p1, p2] = [await riley.newPage(), await morgan.newPage()];
    await Promise.all([p1.goto('/orders'), p2.goto('/orders')]);
    await expect(p1.locator('#orders-table tbody tr')).toHaveCount(2);
    await expect(p2.locator('#orders-table tbody tr')).toHaveCount(2);
    await expect(p1.locator('#orders-table')).toContainText('LK-1001');
    await expect(p2.locator('#orders-table')).toContainText('LK-1003');
    await expect(p2.locator('#orders-table')).not.toContainText('LK-1001');
    await riley.close();
    await morgan.close();
  });

  test('signed-out users are sent to sign in', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByText('Please sign in to see your orders.')).toBeVisible();
  });
});
