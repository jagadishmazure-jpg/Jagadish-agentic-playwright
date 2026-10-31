# Interview talking points

Short answers I can back with something in this repo.

## Playwright vs Selenium vs Cypress

- **Selenium**: W3C WebDriver, every major language, huge ecosystem and grid support; waits are your job; slower round-trips.
- **Cypress**: runs inside the browser, great developer experience for one app; historically limited with multiple tabs, origins and browsers.
- **Playwright**: drives browsers over their own protocols from outside, so tabs, iframes, multiple origins and multiple users in one test are normal (`auth.spec.ts` two contexts). Auto-waiting and web-first assertions remove most sleeps. Runner includes parallelism, sharding, tracing and API testing. I choose it for new suites unless a team is invested in another stack.

## Why page objects

They put locators in one place, so a UI change is one edit, and they let specs read like intent. I keep assertions about rules in the spec, not in the page object.

## Why API + UI together

Arrange through the API (fast, reliable), act and assert through the UI (what users see), and check the API call the UI made. `api-ui.spec.ts` does all three.

## How do you make a suite reliable

User-facing locators, no sleeps, isolated data per test, storage-state login, network control for third parties, measure flakiness with repeats, fail on flaky in CI. Real examples in the [playbook](flaky-test-playbook.md).

## How do you test an AI feature

Structure exactly, forbidden content always, meaning with a judge that has a negative control, repeat across seeds. Also test the stream, not just the screen; that is where my masking bug was. ([testing-ai-output.md](testing-ai-output.md))

## How do you test AI-written content against business rules

One promptfoo assertion file per rule, declared once under `defaultTest`, reading product facts from `vars`, returning `FAILED: <rule> → <exact text>` with a metric per rule. On 50 synthetic descriptions every case failed exactly its planted rules, and all 34 failures quoted the text, versus 0 of 34 when the same rules returned bare booleans. ([promptfoo-business-rules.md](promptfoo-business-rules.md))

## How would you let an agent use a browser safely

Playwright MCP for the hands, a guard in front of every tool: origin allowlist, secrets by reference into matching fields only, human approval for irreversible clicks, step budget, no code-execution tools, full audit. Measured: every injection attempt in the benchmark blocked, 0 secrets reached the model. ([role-3](role-3-browser-agent.md))

## Self-healing: yes or no

Useful as a suggestion in a reviewed PR; dangerous applied silently. My healer's one false heal moved a click onto a different product, which would turn a real failure into a pass.

## The ideal framework

Small: config, page objects, fixtures, an API client, data builders. Projects for browsers and purposes. CI with shards, merged reports, traces on retry. Docs that say what is real.

## Numbers I can quote

See [results.md](results.md). Every number there was produced by a run and is regenerated from `evidence/`.
