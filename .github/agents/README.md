# Playwright test agents

Agent definitions created by `npx playwright init-agents --loop=copilot` (Playwright 1.56+), with the seed path pointed at `tests/seed/seed.spec.ts`. They need an LLM loop (VS Code Copilot, Claude Code and others); they were **not** run against this repo. See [docs/test-agents.md](../../docs/test-agents.md).

| File | What it does |
|---|---|
| `playwright-test-planner.agent.md` | Explores the app from the seed test and writes a Markdown test plan into `specs/` |
| `playwright-test-generator.agent.md` | Turns a plan into Playwright tests, checking each step live in the browser |
| `playwright-test-healer.agent.md` | Runs failing tests, inspects the page and patches locators or waits |
