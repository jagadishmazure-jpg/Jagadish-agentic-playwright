# Bicep

Subscription-scoped twin of the Terraform stack. `bicep build main.bicep` must produce no warnings.

| File | What it does |
|---|---|
| `main.bicep` | Resource group and the two modules |
| `modules/` | `app.bicep` and `playwright.bicep` |
| `bicepconfig.json` | Linter configuration |
