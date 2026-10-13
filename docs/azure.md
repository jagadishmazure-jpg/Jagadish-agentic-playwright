# Azure mapping

Everything Azure here is **designed, coded and statically checked, never deployed**. `deploy.yml` and `teardown.yml` only run when the repository variable `DEPLOY_ENABLED` is `'true'`, and it is unset. No Azure subscription was touched while building this repo.

| Need | Azure service | In this repo | Status |
|---|---|---|---|
| Many browsers in parallel without our own grid | **Azure Playwright** (Playwright Workspaces, part of Azure App Testing) | `playwright.service.config.ts`, `infra/*/playwright` resources | Configured, gated |
| Host the app under test | Azure Container Apps (scale to zero) | `azurerm_container_app.demo`, `modules/app.bicep` | IaC only |
| Private images | Azure Container Registry (Basic, admin off), pulled with a managed identity | `azurerm_container_registry` + AcrPull | IaC only |
| Logs | Log Analytics (local auth off) | both stacks | IaC only |
| CI identity | Microsoft Entra ID workload identity federation (OIDC) | `azure/login` in infra/deploy/teardown | Gated |
| Agent model | Azure OpenAI via Agent Framework chat client | `src/larkspur/llm.py` raises | Planned |
| Secrets for the agent | Azure Key Vault | `DEMO_SECRETS` stands in | Planned |

## Azure Playwright, Entra ID only

The workspace is created with `localAuth: Disabled`, so access tokens cannot be used; only Entra ID identities can open cloud browsers. The test config uses `createAzurePlaywrightConfig` from `@azure/playwright` with `DefaultAzureCredential` and `ServiceAuth.ENTRA_ID`, and refuses to load unless `PLAYWRIGHT_SERVICE_URL` is set. `exposeNetwork: '<loopback>'` lets cloud browsers reach an app running next to the test runner.

```bash
az login
export PLAYWRIGHT_SERVICE_URL=wss://<region>.api.playwright.microsoft.com/playwrightworkspaces/<id>/browsers
npm run test:azure -- --workers=20
```

## Turning deployment on (one-time, by an owner)

1. Create an Entra app registration with a federated credential for this repo's `dev` and `prod` environments; grant it Contributor and User Access Administrator on a sandbox subscription.
2. Create Terraform state storage; set repository variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `TFSTATE_RESOURCE_GROUP`, `TFSTATE_STORAGE_ACCOUNT`, optionally `AZURE_RUNNER_PRINCIPAL_ID` and `PLAYWRIGHT_SERVICE_URL`.
3. Add required reviewers to the `prod` environment.
4. Set `DEPLOY_ENABLED=true`. Tear down with the `teardown` workflow (type the environment name to confirm).

## Cost notes

Container Apps scales to zero; the registry is Basic; Log Analytics has a 1 GB daily cap. Azure Playwright is billed per test minute, so `--workers` is a cost lever as well as a speed lever. Check current pricing before enabling.
