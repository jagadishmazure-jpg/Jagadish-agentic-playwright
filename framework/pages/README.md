# Page objects

One class per page; locators are user-facing (role, label, test id).

| File | What it does |
|---|---|
| `BasePage.ts` | Navigation, header, toasts |
| `LoginPage.ts` | Password plus one-time code |
| `CatalogPage.ts` | Filters, sort, product cards, infinite scroll |
| `ProductPage.ts` | Details, reviews, size-guide popup |
| `CartPage.ts` | Cart lines and totals |
| `CheckoutPage.ts` | Address, payment iframe, place order |
| `ReturnsPage.ts` | Return form, upload, label download |
| `OrdersPage.ts` | Order table |
| `AssistantPage.ts` | Chat, streaming, tool chips, citations, approval dialog |
| `ConsolePage.ts` | Specialist approval console |
| `index.ts` | Re-exports |
