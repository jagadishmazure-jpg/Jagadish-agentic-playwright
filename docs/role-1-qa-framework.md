# Role 1: a classic Playwright QA framework

The framework tests **Larkspur Outfitters**, a fictional outdoor-gear shop (`src/larkspur/`). It is a FastAPI app with pages that deliberately contain the awkward parts of real sites: a password plus one-time-code login, a payment form inside an iframe, a web component with a shadow root, a popup window, confirm dialogs, a sortable table, an infinite-scroll feed, file upload and download, and a slow endpoint.

## What Playwright is

Playwright is a browser automation library and test runner. One API drives Chromium, Firefox and WebKit over each browser's own debugging protocol (no WebDriver layer), and the runner (`@playwright/test`) adds fixtures, parallel workers, retries, projects, reporters and tracing. Every test gets a fresh **browser context**, which is like a new incognito profile: cookies and storage are isolated, and creating one takes milliseconds, so isolation is cheap.

## Layout

```
framework/
  config/env.ts        which environment, which users, which budgets
  pages/               one page object per page, locators by role/label/test id
  api/                 typed API client used for setup, clean-up and API tests
  fixtures/            custom `test` that hands every spec its page objects and clients
  utils/               data builders, axe helper, semantic judge, reusable actions
tests/
  setup/               log in once per role, save storage state
  framework/           one spec per topic (locators, actions, waits, network, ...)
  api/                 no browser at all
```

Specs never call `page.locator` with a CSS string when a role or label works, and never sleep.

## Page objects and fixtures

Page objects hold locators and intent-level methods (`checkout.placeOrder()`), not assertions about business rules; those stay in the spec so a reader sees what is being checked. Fixtures in `framework/fixtures/index.ts` build the page objects lazily, so a test that only uses `catalog` never constructs the others. Fixtures also carry the API clients (`api` as the customer, `staffApi` as staff) so a test can arrange data through the API and assert through the UI.

## Locators vs element handles

A `Locator` is a recipe, not a pointer. It is resolved again every time it is used, which is why it survives re-renders (`locators.spec.ts` › dynamic content). `page.$()` returns an `ElementHandle` bound to one DOM node; if the framework re-renders, the handle points at a detached node. Locators are also **strict**: if a locator matches two elements, an action throws instead of picking one (`locators.spec.ts` › strict mode). That strictness caught a real bug in this suite (see the [flaky-test playbook](flaky-test-playbook.md)).

Preference order used here: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` > CSS. Role locators double as accessibility checks: if a button has no accessible name, the test cannot find it.

## Synchronisation

Before an action, Playwright waits until the target is attached, visible, stable (not animating), able to receive events and enabled. Web-first assertions (`await expect(locator).toHaveText(...)`) retry until the condition holds or the timeout ends. Together these replace both implicit waits (which Playwright does not have) and hard sleeps.

What to wait for instead of time:
- a response: `page.waitForResponse(url)` started **before** the click that triggers it;
- a URL or load state: `page.waitForURL`, `page.waitForLoadState`;
- an element state: `locator.waitFor({ state: 'hidden' })`;
- time itself: `page.clock` (fake timers) for countdowns and session timeouts;
- an overlay that may or may not appear: `page.addLocatorHandler`.

All five are in `tests/framework/waits.spec.ts`.

## API request contexts

`request` (the fixture) is a standalone `APIRequestContext` with its own cookies. `page.request` shares the cookie jar of the page's browser context, so a call made through it is authenticated as whoever is logged in to that page, and cookies it receives show up in the browser. `framework/api/LarkspurClient.ts` takes either and the fixtures decide which identity to use.

## Authentication

`tests/setup/auth.setup.ts` runs once per run. The customer logs in through the UI (password, then a one-time code read from a test-only endpoint the app exposes only in test mode), the specialist logs in through the API (faster), and each storage state is saved under `.auth/` (git-ignored). Projects that need a signed-in user depend on `setup` and load the state. Tests for two users at once open two contexts with different states.

## Network control

`network.spec.ts` shows the main tools: `route.fulfill` to fake a response, `route.fetch` to change a real one, `route.abort` to block, a failing route to test error UI, a delayed route to test a latency budget, request assertions with `waitForRequest`, and HAR replay (`routeFromHAR`) of traffic recorded by `scripts/record-har.mjs`.

## Data

Every test creates what it needs with unique names (`framework/utils/data.ts`) and removes it through the API. Nothing depends on test order, so `fullyParallel: true` is safe.

## Configuration and environments

`TEST_ENV` picks a profile in `framework/config/env.ts`: `local` (starts the app with `webServer`), `docker` (inside the test image) or `staging` (a remote URL, no web server). Users come from environment variables with demo defaults. Projects split by browser and purpose; firefox, webkit, mobile, visual, healing and generated are opt-in so the default `npx playwright test` stays quick.

## Browsers and recent releases

- **Engines.** Chromium, Firefox and WebKit builds are downloaded per Playwright version, so a version bump is also a browser bump. Recent releases switched the Chromium download to Chrome for Testing builds; branded Chrome or Edge can be used with `channel`.
- **Test agents.** Since 1.56, `npx playwright init-agents` writes planner, generator and healer definitions for an LLM loop. See [test-agents.md](test-agents.md).
- **Debugging.** Beyond `--debug`, `--ui` and the Trace Viewer, recent releases improved the HTML report's timeline view and added a CLI aimed at agents. This repo keeps traces on first retry and video on failure.
- **Newer APIs** worth knowing about from the release notes: web storage helpers on the context, passkey/WebAuthn support, extra video recording modes, and in 1.64 `locator.within`, the `--shuffle` flag (used to find order-dependent tests) and per-project defaults. This repo pins 1.64.0.
- **Removed selectors.** The old framework-specific selector engines (React and Vue component selectors) are gone; use roles and test ids.

## Strategy

Most checks belong at the API level (fast, precise); the UI suite covers journeys and the parts only a browser can prove (rendering, focus, iframes, accessibility). A small `@smoke` set runs first. Visual checks run only in a pinned container. Flakiness is measured, not guessed (see [flaky-test-playbook.md](flaky-test-playbook.md)), and a test that only passes on retry fails CI (`failOnFlakyTests`).
