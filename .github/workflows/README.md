# Workflows

Every action is pinned to a commit SHA, the default token is read-only, Azure uses OIDC only. `tests/py/test_workflows.py` enforces this. See [docs/ci.md](../../docs/ci.md).

| File | What it does |
|---|---|
| `ci.yml` | Ruff, pytest (unit + hygiene), release gate, doc drift, tsc, test listing, Bicep build, SBOM, gitleaks |
| `e2e.yml` | Playwright in 3 shards (blob), merged HTML + JUnit artifacts, cross-browser job, visual job in Docker |
| `codeql.yml` | CodeQL for javascript-typescript, python and actions |
| `infra.yml` | terraform fmt/validate/test, tflint, checkov; plan only if Azure OIDC variables exist |
| `deploy.yml` | Gated (DEPLOY_ENABLED): provision dev then prod, build the app image, smoke, run the suite on cloud browsers |
| `teardown.yml` | Gated, manual, typed confirmation: destroy one environment |
