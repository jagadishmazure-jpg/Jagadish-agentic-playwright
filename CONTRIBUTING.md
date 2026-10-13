# Contributing

1. `npm ci && pip install -e ".[dev]" && npx playwright install --with-deps chromium`
2. Make the change with a test. No sleeps, user-facing locators, unique data per test.
3. Run `npm run typecheck`, `npx playwright test`, `ruff check . && ruff format --check .`, `pytest -q`.
4. If you change anything that feeds `evidence/`, rerun the measurement and `python scripts/render_docs.py`. Never edit numbers by hand.
5. Open a pull request; CI must pass. Dependabot PRs are reviewed, not auto-merged.
