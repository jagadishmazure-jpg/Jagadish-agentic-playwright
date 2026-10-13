/**
 * Azure Playwright (Playwright Workspaces, part of Azure App Testing): run the same suite on
 * cloud-hosted browsers with Microsoft Entra ID authentication. GATED: nothing in CI uses this file
 * unless the repository variable AZURE_PLAYWRIGHT_ENABLED is 'true' AND PLAYWRIGHT_SERVICE_URL is set,
 * and it has never been run from this repository.
 *
 *   az login
 *   export PLAYWRIGHT_SERVICE_URL=wss://<region>.api.playwright.microsoft.com/playwrightworkspaces/<id>/browsers
 *   npx playwright test --config=playwright.service.config.ts --workers=20
 *
 * The cloud browsers must reach the app: exposeNetwork '<loopback>' tunnels the browsers' requests
 * for localhost back to the machine running the tests, so the local demo app works unchanged.
 */
import { DefaultAzureCredential } from '@azure/identity';
import { createAzurePlaywrightConfig, ServiceAuth, ServiceOS } from '@azure/playwright';
import { defineConfig } from '@playwright/test';
import config from './playwright.config';

if (!process.env.PLAYWRIGHT_SERVICE_URL) {
  throw new Error('PLAYWRIGHT_SERVICE_URL is not set: this config only runs against an Azure Playwright workspace (see docs/azure.md).');
}

export default defineConfig(
  config,
  createAzurePlaywrightConfig(config, {
    credential: new DefaultAzureCredential(), // Entra ID: az login locally, OIDC federated identity in CI. No access tokens.
    serviceAuthType: ServiceAuth.ENTRA_ID,
    os: ServiceOS.LINUX,
    connectTimeout: 30_000,
    exposeNetwork: '<loopback>',
  }),
  {
    reporter: [['html', { open: 'never' }], ['@azure/playwright/reporter']],
  },
);
