# Workflow scripts

Shell used by the deploy and teardown workflows. Never run from this repo: `DEPLOY_ENABLED` is unset.

| File | What it does |
|---|---|
| `deploy.sh` | `provision` (Terraform or Bicep), `image` (az acr build), `smoke` (app health, workspace Entra-only), `destroy` |
