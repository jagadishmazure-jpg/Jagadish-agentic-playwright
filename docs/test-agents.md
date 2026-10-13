# Playwright test agents and self-healing

## The official agents

Playwright 1.56 added three agent definitions, written by `npx playwright init-agents --loop=<vscode|claude|codex|copilot|opencode>`:

- **planner**: opens the app from a seed test, explores and writes a Markdown plan in `specs/`;
- **generator**: turns a plan into tests, checking each locator and assertion live;
- **healer**: runs a failing test, inspects the page and edits the test until it passes or marks it as skipped.

They run inside an LLM loop (an IDE assistant) and use the Playwright test MCP server registered in `.vscode/mcp.json`. This repo contains the generated definitions (`.github/agents/`) with the seed pointed at `tests/seed/seed.spec.ts`. **They were not run here**: that needs an interactive LLM session. The generated `copilot-setup-steps.yml` was dropped because it used unpinned actions.

## What was built instead, and measured

**Offline healer** (`framework/healing/healer.ts`). When a locator fails, it reads the accessibility tree, scores every candidate by role match, name similarity and nearby text, and heals only if the best score clears 0.45 **and** beats the runner-up by 0.08. Otherwise it refuses. `tests/healing/heal.spec.ts` breaks locators in 20 ways (renamed buttons, typos, label changes, and 4 elements that were removed) and records what the healer did.

Result (from `evidence/healing.json`): 12 correct heals, 4 missed heals, 1 false heal and 3 correct refusals. The false heal is the important finding: a removed "Add … to cart" button was "healed" onto a different product's button, which would make a test pass while doing the wrong thing. It is kept as a `test.fail` case so that a future fix shows up.

**Generated tests**. Replay specs from successful browser-agent runs become `tests/generated/` (see [role-3-browser-agent.md](role-3-browser-agent.md)).

## Rules for any healer, human or AI

1. Heal in a branch and open a review; never patch silently in CI.
2. Refuse when unsure. A missed heal costs a minute; a false heal hides a bug.
3. A missing element is often the bug. Healing must not paper over removed features.
4. Keep the diff small: change the locator, not the assertion.
