# Security policy

## Scope

This repository contains a demo shop with synthetic data, Playwright test suites, a browser agent driven by a scripted model, and infrastructure templates that have never been deployed. It holds no credentials, model keys, subscription or tenant identifiers, or real customer data. The only card number is the public test number, and the demo passwords exist only for the local app.

## Reporting a vulnerability

1. Open a private security advisory on GitHub (Security tab, "Report a vulnerability"). Include the file, the problem and how to reproduce it.
2. If that button is not shown, open an issue titled `Security contact request` with no technical details, and I will reply with a private channel.

I aim to acknowledge a report within 5 working days. This is a personal portfolio maintained by one person, so there is no formal SLA or bug bounty.

## Design choices that matter for security

- **No stored secrets.** Workflows reference only `GITHUB_TOKEN`; Azure login is OIDC. The Playwright workspace has local (access-token) auth disabled, so only Entra ID identities can use it.
- **Test sessions stay local.** Storage-state files (`.auth/`), traces, reports and `.env` are git-ignored; gitleaks scans full history.
- **The browser agent is fenced.** Origin allowlist, secrets only by name into matching fields, human approval for irreversible clicks, step budget, no code-execution tools, redacted audit log. See [docs/browser-agent-safety.md](docs/browser-agent-safety.md).
- **The assistant** masks PII on every output path, screens retrieved content for injected instructions and cannot move money without a specialist.
- **Test-only endpoints** (one-time-code lookup, reset) are on in this demo by design. Never enable them in a real application.
- **Supply chain:** SHA-pinned actions, digest-pinned images, lockfiles, Dependabot (npm, pip, actions, docker, terraform), CodeQL (JS/TS, Python, Actions), SPDX SBOM, checkov and tflint.
- **Deployment gated off** until `DEPLOY_ENABLED` is set; prod needs environment reviewers.
- **GitHub settings:** secret scanning with push protection, Dependabot alerts and security updates, private vulnerability reporting, and rulesets on `main` that block force-pushes and deletion and require CI checks on pull requests (the maintainer can bypass the CI rule for direct pushes, so those are checked after the push).

See [docs/threat-model.md](docs/threat-model.md).

## Supported versions

Only the `main` branch is maintained.
