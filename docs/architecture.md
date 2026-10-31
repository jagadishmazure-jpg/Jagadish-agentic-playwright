# Architecture

```mermaid
flowchart LR
  subgraph Tests["Playwright test runner (TypeScript)"]
    F[framework/: pages, fixtures, API client, semantic judge, healer]
    R1[tests/framework + tests/api<br/>Role 1]
    R2[tests/agent-app<br/>Role 2]
    G[tests/generated<br/>from agent runs]
    H[tests/healing]
  end
  subgraph App["Larkspur Outfitters (FastAPI, synthetic data)"]
    UI[Pages: catalog, checkout + payment iframe, returns, assistant, console]
    API[JSON API + SSE chat]
    AS[Assistant: FakeModel, tools, PII mask, injection screen]
    AP[(Approvals)]
  end
  subgraph Agent["Browser agent (Python), Role 3"]
    M[ScriptedBrowserModel]
    AF[Agent Framework agent]
    GU[BrowserGuard]
    MCP[Playwright MCP<br/>isolated Chrome]
  end
  R1 & R2 & G --> UI
  R1 & R2 --> API
  API --> AS --> AP
  M --> AF --> GU --> MCP --> UI
  MCP -. replay.spec.ts .-> G
  subgraph CI["GitHub Actions"]
    C1[ci] --- C2[e2e 3 shards → merged HTML + JUnit]
    C3[codeql] --- C4[infra] --- C5[deploy / teardown<br/>gated, OIDC]
  end
  subgraph Azure["Azure (IaC only, never deployed)"]
    PW[Playwright workspace<br/>Entra ID only]
    CA[Container Apps: demo app]
  end
  C5 -. if DEPLOY_ENABLED .-> PW & CA
```

## Flows

- **Role 1** tests drive the app's pages through page objects and call its API for setup and checks.
- **Role 2** tests drive the assistant through the chat page and the raw SSE API, and approve refunds from a second browser context as the specialist.
- **Role 3** runs the agent: the model proposes a tool call, the guard allows, blocks or asks a person, Playwright MCP acts in an isolated browser, and the code MCP reports is saved as a replay spec that can become a regular test.
- **Cloud** (designed, gated): the same suite runs on Azure Playwright cloud browsers through `playwright.service.config.ts`, against the app hosted on Container Apps.

## Key decisions

See [adr/](adr/README.md).

## promptfoo copy evals

A separate Node package in `evals/promptfoo/` checks AI-written product descriptions against 7 named business rules. An offline provider replays fixtures, and `scripts/promptfoo_summary.py` turns the results into `evidence/promptfoo-evals.json`. It does not touch the app or the browser agent. Details: [promptfoo-business-rules.md](promptfoo-business-rules.md).
