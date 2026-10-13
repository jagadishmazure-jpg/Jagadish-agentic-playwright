# Terraform

Run `terraform init -backend=false && terraform test`. Never applied.

| File | What it does |
|---|---|
| `main.tf` | All resources |
| `variables.tf` | Inputs |
| `locals.tf` | Names and tags |
| `outputs.tf` | App URL, registry, workspace id and data-plane URI |
| `versions.tf` | azurerm ~> 4.50, azapi ~> 2.5 |
| `providers.tf` | Provider settings |
| `backend.tf` | Azure Storage state with Entra ID auth |
| `.tflint.hcl` | tflint rules |
| `envs/` | dev and prod variables and state keys |
| `tests/` | Offline plan tests |
