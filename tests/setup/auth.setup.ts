import { expect, test as setup } from '@playwright/test';
import { env } from '../../framework/config/env';
import { LoginPage } from '../../framework/pages';

/**
 * Setup project: authenticate once per role and save the browser state. Other projects load it with
 * test.use({ storageState }). The files hold live session cookies, so .auth/ is gitignored and the
 * folder is never uploaded as a CI artifact.
 */
setup('customer signs in through the UI (password + one-time code)', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginWithOtp(env.users.customer.username, env.users.customer.password);
  await expect(page.getByText('Welcome back, Riley')).toBeVisible();
  await page.context().storageState({ path: '.auth/customer.json' });
});

setup('specialist signs in through the API (no UI, faster)', async ({ page, request, baseURL }) => {
  const resp = await request.post('/api/auth/token', { data: env.users.specialist });
  expect(resp.ok()).toBeTruthy();
  const { session } = await resp.json();
  await page.context().addCookies([{ name: 'lk_session', value: session, url: baseURL!, httpOnly: true, sameSite: 'Strict' }]);
  await page.goto('/account');
  await expect(page.getByText('Welcome back, Returns specialist')).toBeVisible();
  await page.context().storageState({ path: '.auth/specialist.json' });
});
