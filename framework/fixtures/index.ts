import { test as base } from '@playwright/test';
import { LarkspurClient } from '../api/LarkspurClient';
import { env, type EnvConfig } from '../config/env';
import * as pages from '../pages';

export { expect } from './matchers';

type Pages = {
  loginPage: pages.LoginPage;
  catalogPage: pages.CatalogPage;
  productPage: pages.ProductPage;
  cartPage: pages.CartPage;
  checkoutPage: pages.CheckoutPage;
  returnsPage: pages.ReturnsPage;
  ordersPage: pages.OrdersPage;
  assistantPage: pages.AssistantPage;
};

type Fixtures = Pages & {
  env: EnvConfig;
  api: LarkspurClient;
  /** A client already authenticated as the returns specialist (API login, no UI). */
  staffApi: LarkspurClient;
};

/**
 * Test-scoped fixtures: one page object per page (created lazily), a typed API client, and a staff
 * client logged in through the API. Specs import { test, expect } from here instead of @playwright/test.
 */
export const test = base.extend<Fixtures>({
  env: async ({}, use) => use(env),
  api: async ({ request }, use) => use(new LarkspurClient(request)),
  staffApi: async ({ playwright, baseURL }, use) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const client = new LarkspurClient(ctx);
    await client.login(env.users.specialist.username, env.users.specialist.password);
    await use(client);
    await ctx.dispose();
  },
  loginPage: async ({ page }, use) => use(new pages.LoginPage(page)),
  catalogPage: async ({ page }, use) => use(new pages.CatalogPage(page)),
  productPage: async ({ page }, use) => use(new pages.ProductPage(page)),
  cartPage: async ({ page }, use) => use(new pages.CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new pages.CheckoutPage(page)),
  returnsPage: async ({ page }, use) => use(new pages.ReturnsPage(page)),
  ordersPage: async ({ page }, use) => use(new pages.OrdersPage(page)),
  assistantPage: async ({ page }, use) => use(new pages.AssistantPage(page)),
});

export const AUTH = {
  customer: '.auth/customer.json',
  specialist: '.auth/specialist.json',
} as const;
