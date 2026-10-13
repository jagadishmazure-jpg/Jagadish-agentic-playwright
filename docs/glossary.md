# Glossary

| Term | Meaning |
|---|---|
| Actionability | Checks Playwright runs before an action: attached, visible, stable, receives events, enabled |
| ARIA snapshot | YAML-like dump of the accessibility tree, used for assertions and by Playwright MCP |
| Azure Playwright | Azure service (Playwright Workspaces, in Azure App Testing) that runs browsers for Playwright tests |
| Blob report | Per-shard machine report merged later with `merge-reports` |
| Browser context | Isolated browser profile; one per test by default |
| Citation | Policy id the assistant used; checked against known ids |
| Entra ID | Microsoft identity platform; the only auth the workspace accepts here |
| False heal | A healer pointing a broken locator at the wrong element |
| Fixture | Value a test receives by name, with setup and teardown |
| Flaky test | Passes and fails on the same code |
| Guard | Code that allows, blocks or escalates each agent tool call |
| HAR | Recorded HTTP traffic that can be replayed |
| Indirect prompt injection | Instructions hidden in content the model reads |
| MCP | Model Context Protocol; Playwright MCP exposes browser actions as tools |
| OIDC | Federated login from GitHub Actions to Azure without secrets |
| Page object | Class wrapping a page's locators and actions |
| Ref | Element id from an MCP snapshot (`e15`, `f1e3`) |
| Shard | One slice of the suite run on its own machine |
| SSE | Server-sent events; how the assistant streams |
| Storage state | Saved cookies and local storage used to skip login |
| Strict mode | Locators must match exactly one element for actions |
| Web-first assertion | `expect(locator)` assertion that retries |
