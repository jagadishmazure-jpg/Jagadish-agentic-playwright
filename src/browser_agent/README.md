# Browser agent

Role 3: an agent whose hands are Playwright MCP, wrapped in a guard.

| File | What it does |
|---|---|
| `agent.py` | Task loop: model step, guard check, MCP call, audit, replay spec |
| `guard.py` | Origin allowlist, secret handling, approvals, step budget, denied tools, audit redaction |
| `mcp_browser.py` | stdio client for `@playwright/mcp` |
| `model.py` | Seeded scripted model (offline), with a configurable rate of obeying injections |
| `bench.py` | Benchmark runner and summary |
| `cli.py` | `handsagent run` and `handsagent bench` |
| `__init__.py` | Package marker |
