# Larkspur app

The fictional shop the suites test. Synthetic data only. Test endpoints are on by default (`LARKSPUR_TEST_MODE`).

| File | What it does |
|---|---|
| `server.py` | Pages and JSON API: auth with one-time code, products, cart, checkout, returns, uploads, SSE chat, approvals |
| `assistant.py` | Support assistant: seeded wording, tools, human approval for refunds, output masking |
| `guard.py` | PII masking and injection screening |
| `data.py` | Products, reviews (two carry planted injections), customers, orders, policies |
| `llm.py` | Model switch; the Azure option is planned and raises |
| `cli.py` | `larkspur serve` |
| `static/` | HTML, CSS and JS |
| `__init__.py` | Package marker |
