# ADR 0006: Azure is code-complete but gated

**Decision.** Terraform, Bicep and workflows for Azure Playwright and Container Apps exist and pass static checks; deploy jobs require `DEPLOY_ENABLED == 'true'`, which is unset. Auth is Entra ID only (workspace local auth disabled, OIDC from CI).
**Why.** Show the production path without spending money or touching a cloud account without approval.
**Trade-off.** No cloud numbers. None are claimed.
