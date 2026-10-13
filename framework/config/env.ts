/**
 * Environment selection. TEST_ENV picks a profile; individual values can still be overridden by
 * environment variables, so CI and Docker never need code changes.
 *
 *   TEST_ENV=local (default)  the app is started by Playwright's webServer on 127.0.0.1:8765
 *   TEST_ENV=docker           tests run inside the official Playwright image against the same app
 *   TEST_ENV=staging          an example remote profile: no webServer, base URL from BASE_URL
 *
 * Demo credentials belong to the fictional local app and are not secrets. For a real system, the
 * same names are read from the environment (CI secrets or Key Vault), never from this file.
 */
export type EnvName = 'local' | 'docker' | 'staging';

export interface EnvConfig {
  name: EnvName;
  baseURL: string;
  startServer: boolean;
  users: Record<'customer' | 'customer2' | 'specialist', { username: string; password: string }>;
  /** Latency budget for the first streamed token of the assistant, in milliseconds. */
  firstTokenBudgetMs: number;
  /** Budget for a complete assistant answer, in milliseconds. */
  answerBudgetMs: number;
}

const port = Number(process.env.APP_PORT ?? 8765);

const demoUsers = {
  customer: { username: process.env.LK_CUSTOMER_USER ?? 'riley', password: process.env.LK_CUSTOMER_PASSWORD ?? 'trail-demo-1' },
  customer2: { username: process.env.LK_CUSTOMER2_USER ?? 'morgan', password: process.env.LK_CUSTOMER2_PASSWORD ?? 'trail-demo-2' },
  specialist: { username: process.env.LK_SPECIALIST_USER ?? 'specialist', password: process.env.LK_SPECIALIST_PASSWORD ?? 'trail-demo-3' },
};

const profiles: Record<EnvName, EnvConfig> = {
  local: { name: 'local', baseURL: `http://127.0.0.1:${port}`, startServer: true, users: demoUsers, firstTokenBudgetMs: 2000, answerBudgetMs: 6000 },
  docker: { name: 'docker', baseURL: `http://127.0.0.1:${port}`, startServer: true, users: demoUsers, firstTokenBudgetMs: 3000, answerBudgetMs: 9000 },
  staging: {
    name: 'staging',
    baseURL: process.env.BASE_URL ?? 'https://larkspur-staging.example.com',
    startServer: false,
    users: demoUsers,
    firstTokenBudgetMs: 3000,
    answerBudgetMs: 10000,
  },
};

export function loadEnv(name = (process.env.TEST_ENV ?? 'local') as EnvName): EnvConfig {
  const p = profiles[name];
  if (!p) throw new Error(`Unknown TEST_ENV '${name}'. Use one of: ${Object.keys(profiles).join(', ')}`);
  return { ...p, baseURL: process.env.BASE_URL ?? p.baseURL };
}

export const env = loadEnv();
