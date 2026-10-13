# CI

| Workflow | Runs | Jobs |
|---|---|---|
| `ci.yml` | push to main, PRs | python (ruff, pytest: unit + workflow hardening + hygiene, release gate, doc drift), typescript (tsc, list every project), bicep (warnings fail), sbom (SPDX), secrets (gitleaks, full history) |
| `e2e.yml` | push, PRs, manual | e2e ×3 shards (setup, api, chromium, healing, generated) with blob reports → report (merge to HTML + JUnit artifacts), cross-browser (Firefox, WebKit, mobile on `@cross`/`@mobile`), visual (pinned Docker image) |
| `codeql.yml` | push, PRs, weekly | javascript-typescript, python, actions |
| `infra.yml` | push, PRs | terraform fmt/validate/test, tflint, checkov; plan only with Azure variables |
| `deploy.yml` | push to main, manual | preflight summary; everything else gated by `DEPLOY_ENABLED` |
| `teardown.yml` | manual | gated, typed confirmation |

## Hardening

All actions pinned to commit SHAs with version comments, top-level `permissions: contents: read`, `id-token: write` only on Azure jobs, no `pull_request_target`, no stored Azure secrets, Docker images pinned by digest, Dependabot for npm, pip, actions, docker and terraform. `tests/py/test_workflows.py` fails the build if any of that regresses.

## Flakiness policy in CI

Retries are 1 on CI and `failOnFlakyTests` is on, so a test that passes only on retry fails the run while the retry still produces a trace for diagnosis. Traces on first retry, screenshots on failure, video kept on failure.

## Speed

Login once per role (storage state), API setup instead of UI setup, `fullyParallel`, 3 shards, opt-in projects for slow browsers. Useful extras not used here: `--only-changed` on PRs, and Azure Playwright for many more workers.

## Other CI systems

The commands are CI-agnostic: install packages, fetch browsers and their OS libraries (`npx playwright install --with-deps`), run one slice per machine (`--shard=i/n`), then combine the blob reports (`npx playwright merge-reports`). In Azure DevOps that is a matrix job plus `PublishTestResults@2` for the JUnit file and a pipeline artifact for the HTML report; in Jenkins a parallel stage with the JUnit plugin and `publishHTML`. Either can run inside `Dockerfile.e2e` for identical browsers.
