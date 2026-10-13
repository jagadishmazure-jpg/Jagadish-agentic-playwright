# Flaky-test playbook

A flaky test passes and fails on the same code. Each one teaches people to ignore red builds, so treat them as bugs with an owner.

## Measure first

```bash
npx playwright test tests/agent-app --repeat-each=20 --retries=0      # quick check
node scripts/measure_flakiness.mjs 20 tests/agent-app                 # per-test pass/fail to evidence/flakiness.json
npx playwright test --shuffle                                         # 1.64: random order exposes order dependence
```

In CI, `failOnFlakyTests` turns "passed on retry" into a failure, and the retry records a trace.

## Two real flakes from this repo

**1. Strict-mode collision depending on timing.** An unscoped `getByText('Ridgeline Rain Shell')` on the catalog passed most runs and sometimes threw a strict-mode error, because on some runs a second element containing that text was on the page by the time the assertion resolved. Fix: scope it to the product list (`page.getByRole('list', { name: 'Products' }).getByText(...)`, now in `locators.spec.ts`). Lesson: unscoped text locators turn page timing into test flakiness; strict mode made it fail loudly instead of acting on the wrong element.

**2. Shared state across parallel tests.** An injection test asserted that no approval was pending. Other tests, running at the same time against the same server, create approvals. Measured with `measure_flakiness.mjs`: 6 failures in 440 executions (22 tests × 20), all in that one test. Fix: filter to the test's own order (`LK-1002`). After: 0 failures in 440. Both measurements are in `evidence/`.

A third surprise was not a flake but a wrong assumption: `dispatchEvent('click')` on a disabled button **did** add an item, because the click handler is delegated to a parent and the synthetic event bubbles there. `actions.spec.ts` now asserts that behaviour as a warning about `dispatchEvent` and `force`.

## Causes and fixes

| Symptom | Usual cause | Fix |
|---|---|---|
| Element not found sometimes | Racing a render or a request | Web-first assertion or `waitForResponse` started before the action |
| Strict-mode violation sometimes | Locator too broad | Scope to a region; use role + name |
| Fails only in parallel | Shared data or server state | Unique data per test; assert only on what this test created |
| Fails only in a given order | Leaked state | `--shuffle`; fresh context per test (default) |
| Visual diff on CI only | Fonts, GPU, OS | Screenshots only inside the pinned Docker image |
| Time-related failures | Real clocks, time zones | `page.clock`, fixed `timezoneId`/`locale` |
| Slow on CI | Fewer cores | Budgets with headroom; `workers` set explicitly |

## Passes locally, fails in CI

Check, in order: headless vs headed differences, viewport and device scale, fonts, time zone and locale, fewer CPU cores (timeouts), cold caches and first-request latency, missing env vars or users, test order and parallelism, and network access to third parties (block them; `network.spec.ts`). Open the CI trace (`npx playwright show-trace`) before changing anything.

## Rules

- Never add a sleep. Never raise a timeout without knowing what was slow.
- Quarantine with `test.fixme` and an issue, never by deleting.
- Retries hide flakes; keep them at 1 in CI and fail on flaky.
