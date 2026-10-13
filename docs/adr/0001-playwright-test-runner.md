# ADR 0001: Playwright Test with TypeScript for the suites

**Decision.** Use `@playwright/test` in TypeScript for every browser and API test.
**Why.** One runner for UI and API, three engines, built-in sharding, traces and reporters; TypeScript catches page-object mistakes at compile time (`tsc` runs in CI).
**Trade-off.** The app and agent are Python, so the repo has two toolchains. Accepted: each language is used where it is strongest.
