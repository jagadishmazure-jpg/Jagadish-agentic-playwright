import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly path = '/login';
  readonly userField: Locator;
  readonly passField: Locator;
  readonly otp: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.userField = page.getByLabel('Username');
    this.passField = page.getByLabel('Password');
    this.otp = page.getByLabel('One-time code');
    this.error = page.getByRole('alert').filter({ hasText: /\S/ });
  }

  /** Step 1: credentials. Returns the OTP challenge id the app issued (read from the login response). */
  async submitCredentials(user: string, secret: string): Promise<string> {
    await this.userField.fill(user);
    await this.passField.fill(secret);
    // Start waiting before the click so the response cannot be missed.
    const [resp] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/api/auth/login')),
      this.page.getByRole('button', { name: 'Continue' }).click(),
    ]);
    if (!resp.ok()) return '';
    return (await resp.json()).challenge as string;
  }

  /** Step 2: one-time code. In test mode the code comes from a test-only endpoint (see docs/interview-coverage.md, OTP). */
  async submitOtp(code: string): Promise<void> {
    await this.otp.fill(code);
    await this.page.getByRole('button', { name: 'Verify' }).click();
  }

  async loginWithOtp(username: string, password: string): Promise<void> {
    const challenge = await this.submitCredentials(username, password);
    expect(challenge, 'credentials should be accepted').not.toBe('');
    const r = await this.page.request.get(`/api/test/otp?challenge=${challenge}`);
    await this.submitOtp((await r.json()).code);
    await this.page.waitForURL('**/account');
  }
}
