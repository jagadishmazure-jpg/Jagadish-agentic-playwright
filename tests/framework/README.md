# Framework specs

Role 1. One file per topic.

| File | What it does |
|---|---|
| `a11y.spec.ts` | axe scans of six pages, accessible names of key controls |
| `actions.spec.ts` | Dropdown, checkbox, radio, keyboard, hover, drag and drop, click vs force vs dispatchEvent |
| `api-ui.spec.ts` | Create via API, check in UI; reuse API data; check the API call a UI action makes |
| `assertions.spec.ts` | Web-first vs one-shot, soft, custom matcher, poll/toPass, expect.configure, aria snapshot |
| `auth.spec.ts` | Login errors, OTP, storageState, two users in two contexts, redirects |
| `e2e-checkout.spec.ts` | Full purchase flow including the payment iframe |
| `files.spec.ts` | Upload from disk and buffer, download and validate a CSV |
| `frames-shadow-popups.spec.ts` | iframe, shadow DOM, popup, new tab, confirm dialog |
| `locators.spec.ts` | User-facing locators, strict mode, filter/nth/and/or/within, re-resolution, custom engine |
| `mobile.spec.ts` | Phone viewport with touch, device descriptor in one test |
| `network.spec.ts` | route.fulfill, route.fetch, abort, failure, slow network, request assertions, HAR replay |
| `tables-scroll.spec.ts` | Table data after sorting, infinite scroll |
| `waits.spec.ts` | waitForResponse/URL/LoadState, waitFor, Clock API, locator handler |
