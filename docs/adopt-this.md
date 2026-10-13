# Adopt this in your own project

Take pieces, not the whole repo.

1. **Config and projects.** Copy `playwright.config.ts`: `setup` project with storage state, opt-in browsers, `failOnFlakyTests` and blob reporter on CI.
2. **Fixtures.** Copy the pattern in `framework/fixtures/index.ts`: page objects and API clients as fixtures, created lazily.
3. **CI.** Copy `e2e.yml` (shards + merge-reports) and `test_workflows.py` (pinning and permission checks). Re-pin SHAs with your Dependabot.
4. **Flakiness.** Run `scripts/measure_flakiness.mjs` on your slowest folder before and after changes; keep the JSON.
5. **AI features.** Start with structural and forbidden-content assertions; add `semantic.ts`-style judges only with a negative control each.
6. **Browser agents.** Put a guard like `BrowserGuard` between the model and MCP before giving it anything real. Start with approval on every click and relax rules with evidence.
7. **Cloud browsers.** Copy `playwright.service.config.ts`, create a workspace with local auth off, and use OIDC from CI.

Checklist before you trust it: storage state git-ignored, no sleeps, data unique per test, test-only endpoints off outside test environments, actions pinned.
