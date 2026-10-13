# ADR 0003: A guard in front of Playwright MCP

**Decision.** The agent never calls MCP tools directly. Every call goes through `BrowserGuard.check`.
**Why.** MCP's own `--allowed-origins` is documented as not a security boundary, and MCP has no idea which fields may receive which secrets or which clicks are irreversible.
**Trade-off.** Some legitimate actions need a human click. Accepted for anything that spends money.
