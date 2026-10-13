# infra/

Infrastructure-as-code for running this suite against cloud browsers. **Never applied from this repository.** The deploy workflow is gated by the `DEPLOY_ENABLED` repository variable, which is unset.

| Stack | What it creates |
|---|---|
| `terraform/` | Resource group, Log Analytics (Entra-only), Basic container registry (no admin user), user-assigned identity with AcrPull, Container Apps environment and the Larkspur demo app (scale to zero, optional CIDR allowlist), and an **Azure Playwright workspace** (`Microsoft.LoadTestService/playwrightWorkspaces@2025-09-01`, `localAuth: Disabled`) through `azapi` |
| `bicep/` | The same resources and names, subscription-scoped |

Checks that run in CI (`infra.yml`): `terraform fmt -check`, `terraform validate`, `terraform test` (2 offline plan runs with mocked providers), `tflint`, `checkov` (skips explained inline: Premium-only registry features), and `bicep build` with warnings treated as errors.

```bash
cd infra/terraform && terraform init -backend=false && terraform test
bicep build infra/bicep/main.bicep
```

See [docs/azure.md](../docs/azure.md) for the service mapping and costs.
