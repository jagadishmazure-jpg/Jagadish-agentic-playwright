# Interview coverage map

This repo was planned against three private study guides on Playwright interviews: a Playwright study notebook (16 topics), a framework-design question bank (16 sections) and a set of 24 tricky Playwright questions. The guides are copyrighted. They are **not included** in this repo, nothing in them is quoted, and every answer here is written in my own words with a test or file you can run. An automated check (`scripts/overlap_check.py`, run locally against the extracted text) found 0 runs of 8 or more words in common between this repo and the guides.

Status labels: **Built** = code and a passing test. **Doc** = answered in prose only, because a test would be artificial (marked why). **Planned** = not done.

## A. Study notebook topics

| # | Topic | Where | Status |
|---|---|---|---|
| 1 | What Playwright is | [role-1-qa-framework.md](role-1-qa-framework.md#what-playwright-is) | Doc |
| 2 | Why choose it | [interview-talking-points.md](interview-talking-points.md#playwright-vs-selenium-vs-cypress) | Doc |
| 3 | Install and setup | [README quick start](../README.md#quick-start), `package.json`, `playwright.config.ts` | Built |
| 4 | Project structure | [architecture.md](architecture.md), folder READMEs | Built |
| 5 | Browser support | `playwright.config.ts` projects chromium/firefox/webkit/mobile; `e2e.yml` cross-browser job | Built |
| 6 | Locators | `tests/framework/locators.spec.ts` (5 tests) | Built |
| 7 | Actions | `tests/framework/actions.spec.ts` (5 tests) | Built |
| 8 | Assertions and auto-waiting | `tests/framework/assertions.spec.ts` (6 tests) | Built |
| 9 | Page objects and fixtures | `framework/pages/`, `framework/fixtures/index.ts` | Built |
| 10 | Dropdowns, checkboxes, radios | `actions.spec.ts` › dropdown, checkbox and radio | Built |
| 11 | Navigation, frames, waits | `frames-shadow-popups.spec.ts`, `waits.spec.ts` | Built |
| 12 | Practices, debugging | [flaky-test-playbook.md](flaky-test-playbook.md), trace/video/screenshot config | Built |
| 13 | API testing (GET/POST/PUT/PATCH/DELETE) | `tests/api/products.api.spec.ts` | Built |
| 14 | Assertions and test data management | `framework/utils/data.ts`, `api-ui.spec.ts` (create via API, clean up via API) | Built |
| 15 | Real-world end-to-end flow | `tests/framework/e2e-checkout.spec.ts` | Built |
| 16 | Tooling, config, CI | `playwright.config.ts`, [ci.md](ci.md) | Built |

## B. Framework-design question bank

| Section | Question | Where | Status |
|---|---|---|---|
| 1 Design | Scalable framework, structure, utilities | [role-1-qa-framework.md](role-1-qa-framework.md), `framework/` | Built |
| 1 Design | Page objects | `framework/pages/*` | Built |
| 1 Design | Test data | `framework/utils/data.ts`; unique names per run; API seeding and clean-up | Built |
| 1 Design | Multi-environment runs | `framework/config/env.ts` (`TEST_ENV` local/docker/staging) | Built |
| 2 API + UI | API testing | `tests/api/*.api.spec.ts` (11 tests) | Built |
| 2 API + UI | Reuse an API response in a UI check | `api-ui.spec.ts` › reuse an API response | Built |
| 2 API + UI | Log in through the API | `tests/setup/auth.setup.ts` › specialist signs in through the API | Built |
| 2 API + UI | `route.fulfill` | `network.spec.ts` › mock an API response | Built |
| 2 API + UI | `APIRequestContext` vs `page.request` | [role-1-qa-framework.md](role-1-qa-framework.md#api-request-contexts) and `framework/fixtures/index.ts` (`api` vs `staffApi`) | Built |
| 3 Locators | Locator vs `page.$` | `assertions.spec.ts` › web-first vs one-shot; [role-1](role-1-qa-framework.md#locators-vs-element-handles) | Built |
| 3 Locators | Auto-waiting | `assertions.spec.ts`, `actions.spec.ts` | Built |
| 3 Locators | Dynamic elements | `locators.spec.ts` › re-resolve after re-render | Built |
| 3 Locators | Shadow DOM | `frames-shadow-popups.spec.ts` › shadow DOM | Built |
| 3 Locators | Custom locators | `locators.spec.ts` › custom locator strategy | Built |
| 4 Sync | `waitForSelector` / `waitForLoadState` / `waitForTimeout` | `waits.spec.ts`; hard waits banned in [flaky-test-playbook.md](flaky-test-playbook.md) | Built |
| 4 Sync | Implicit waits | Doc: Playwright has none; actionability checks replace them ([role-1](role-1-qa-framework.md#synchronisation)) | Doc |
| 5 Parallel | Parallel runs, workers vs projects | `playwright.config.ts` (`fullyParallel`, projects) | Built |
| 5 Parallel | Threads | Doc: workers are OS processes, not threads | Doc |
| 5 Parallel | Sharding | `e2e.yml` 3 shards + merge-reports | Built |
| 5 Parallel | Cutting run time | API login once, storage state, sharding, `--only-changed` ([ci.md](ci.md)) | Built |
| 6 Network | Intercept, validate UI calls, failures, slow, block | `network.spec.ts` (7 tests) | Built |
| 7 Auth | Log in once, storage state | `tests/setup/auth.setup.ts`, `auth.spec.ts` | Built |
| 7 Auth | SSO | Doc: same storage-state approach after the identity provider redirect; never automate a real IdP in CI | Doc |
| 7 Auth | Multiple users | `auth.spec.ts` › two users at once; `approval.spec.ts` › second context | Built |
| 8 CI/CD | GitHub Actions | `.github/workflows/*` | Built |
| 8 CI/CD | Jenkins, Azure DevOps | [ci.md](ci.md#other-ci-systems) | Doc |
| 8 CI/CD | Reports and artifacts | `e2e.yml` merged HTML + JUnit artifacts | Built |
| 8 CI/CD | Docker | `Dockerfile.e2e`, visual job | Built |
| 9 Debugging | Flaky tests | [flaky-test-playbook.md](flaky-test-playbook.md), `scripts/measure_flakiness.mjs`, two real flakes | Built |
| 9 Debugging | Trace Viewer, screenshots, video, `--debug` | `playwright.config.ts` (`trace: on-first-retry` etc.) | Built |
| 10 Cross-browser | Three engines | firefox/webkit projects, `@cross` tag | Built |
| 10 Cross-browser | Mobile emulation, devices | `mobile.spec.ts`, mobile project | Built |
| 11 Files | Upload | `files.spec.ts` › upload from disk and buffer | Built |
| 11 Files | Download and validate | `files.spec.ts` › download the return label | Built |
| 12 Advanced | iframe, tabs, alerts | `frames-shadow-popups.spec.ts` | Built |
| 12 Advanced | Drag and drop | `actions.spec.ts` › drag and drop | Built |
| 12 Advanced | Infinite scroll, tables | `tables-scroll.spec.ts` | Built |
| 13 Real-time | Random failures, CI-only flakes, retries | [flaky-test-playbook.md](flaky-test-playbook.md) | Built |
| 13 Real-time | OTP | `tests/setup/auth.setup.ts` reads the code from a test-only endpoint | Built |
| 13 Real-time | CAPTCHA | Doc: switched off in test environments or bypassed with a test key; never solved | Doc |
| 13 Real-time | Payment | `e2e-checkout.spec.ts` (iframe, test card) | Built |
| 14 Coding | Login + dashboard | `auth.spec.ts` › dashboard lists only this customer's orders | Built |
| 14 Coding | Wait for an API call | `waits.spec.ts` › wait for a specific response | Built |
| 14 Coding | Upload, dropdown, reusable function | `files.spec.ts`, `actions.spec.ts`, `framework/utils/actions.ts` | Built |
| 15 Follow-ups | Why Playwright, why POM, why API + UI, reliability, ideal framework | [interview-talking-points.md](interview-talking-points.md) | Doc |
| 16 Strategy | Test strategy | [role-1-qa-framework.md](role-1-qa-framework.md#strategy) | Doc |

## C. Tricky questions

| # | Topic | Where | Status |
|---|---|---|---|
| 1 | How auto-wait works | `actions.spec.ts`, [role-1](role-1-qa-framework.md#synchronisation) | Built |
| 2 | Why not `waitForTimeout` | `waits.spec.ts` › Clock API | Built |
| 3 | Locator vs ElementHandle | `assertions.spec.ts` › web-first vs one-shot | Built |
| 4 | Strict mode | `locators.spec.ts` › strict mode | Built |
| 5 | Preferred locators | `locators.spec.ts` › user-facing locators | Built |
| 6 | Web-first assertions | `assertions.spec.ts` | Built |
| 7 | `expect.poll` / `toPass` | `assertions.spec.ts` › expect.poll and toPass | Built |
| 8 | Browser vs context vs page | `auth.spec.ts` › separate contexts | Built |
| 9 | Storage state | `tests/setup/auth.setup.ts` | Built |
| 10 | Passes locally, fails in CI | [flaky-test-playbook.md](flaky-test-playbook.md#passes-locally-fails-in-ci) | Doc |
| 11 | Flaky tests | Two real flakes found and fixed, [flaky-test-playbook.md](flaky-test-playbook.md) | Built |
| 12 | iframes and shadow DOM | `frames-shadow-popups.spec.ts` | Built |
| 13 | Mocking | `network.spec.ts` | Built |
| 14 | Popups | `frames-shadow-popups.spec.ts` › popup window | Built |
| 15 | Dialogs | `frames-shadow-popups.spec.ts` › confirm dialog | Built |
| 16 | `click` vs `force` vs `dispatchEvent` | `actions.spec.ts` (and a real surprise: dispatchEvent bypassed a disabled button) | Built |
| 17 | Workers | `playwright.config.ts`, [ci.md](ci.md) | Built |
| 18 | Shards | `e2e.yml` | Built |
| 19 | Playwright vs Selenium vs Cypress | [interview-talking-points.md](interview-talking-points.md#playwright-vs-selenium-vs-cypress) | Doc |
| 20 | Chrome for Testing builds | [role-1](role-1-qa-framework.md#browsers-and-recent-releases) | Doc |
| 21 | Test agents (planner, generator, healer) | `.github/agents/`, [test-agents.md](test-agents.md) | Built (definitions); Planned (LLM-driven run) |
| 22 | Newer debugging tools | [role-1](role-1-qa-framework.md#browsers-and-recent-releases) | Doc |
| 23 | Passkeys, web storage, video modes | [role-1](role-1-qa-framework.md#browsers-and-recent-releases) | Doc |
| 24 | Removed framework-specific selectors | `locators.spec.ts` uses role/test-id instead; [role-1](role-1-qa-framework.md#browsers-and-recent-releases) | Doc |

## D. Beyond the guides (AI agent QA and browser agents)

| Topic | Where | Status |
|---|---|---|
| Streaming answers, latency budgets | `tests/agent-app/streaming.spec.ts` | Built |
| Tool calls and citations | `tools-citations.spec.ts` | Built |
| Human approval | `approval.spec.ts`, `tests/api/assistant.api.spec.ts` | Built |
| PII | `pii.spec.ts` | Built |
| Prompt injection | `injection.spec.ts`; browser-agent benchmark | Built |
| Semantic assertions | `semantic.spec.ts`, [testing-ai-output.md](testing-ai-output.md) | Built |
| Browser agent with guardrails | `src/browser_agent/`, [role-3-browser-agent.md](role-3-browser-agent.md) | Built |
| Self-healing locators | `framework/healing/healer.ts`, `tests/healing/` | Built |
| Real LLM in the loop | [limitations.md](limitations.md) | Planned |
