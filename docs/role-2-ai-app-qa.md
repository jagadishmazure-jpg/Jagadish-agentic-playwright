# Role 2: QA for an AI agent app

Larkspur has a support assistant (`/assistant`). It answers questions about orders and policies, calls tools (`lookup_order`, `search_policy`, `read_product`, `issue_refund`), streams its answer over server-sent events, cites the policy documents it used and asks a human specialist to approve every refund. The model behind it is a seeded fake (`FakeModel`) so tests are reproducible and free; the Azure OpenAI switch in `src/larkspur/llm.py` is **planned** and raises if selected.

The fake model is not a pushover. It varies its wording by seed, it has a "gullible" mode that follows instructions planted in content, and it sometimes tries to repeat customer contact details. The tests have to catch that.

## What is tested and why

| Risk | Test | How |
|---|---|---|
| Answers arrive slowly or all at once | `streaming.spec.ts` | First token visible before the done marker; budgets for first token and full answer; send button disabled while streaming |
| Wrong tool, wrong order, invented data | `tools-citations.spec.ts`, `assistant.api.spec.ts` | Tool chips in the UI and tool events in the SSE stream are checked in order; unknown orders are reported, not invented |
| Unsupported claims | `tools-citations.spec.ts` | Citations must point to real policy ids and never to the tampered one |
| Money moves without a human | `approval.spec.ts`, `assistant.api.spec.ts` | Refund creates a pending approval and pays nothing; a specialist approves in a second browser context; a customer cannot approve their own |
| Personal data leaks | `pii.spec.ts`, `assistant.api.spec.ts` | Emails and phones are masked in the UI and in the raw SSE stream across seeds; typed PII is not echoed |
| Prompt injection | `injection.spec.ts` | A poisoned review and a tampered policy are dropped with a visible notice; instructions typed by the user cannot skip approval |
| Wording changes break tests | `semantic.spec.ts` | Meaning-based assertions with a negative control |
| Accessibility | `agent-app/a11y.spec.ts` | axe on the chat and the approval dialog |

## Lessons from building it

- **Assert on the stream, not only the screen.** The masking test first passed in the UI while a raw SSE token still carried part of an email address split across two events. The API test now joins tokens with `answerText(parseSse(...))` before checking.
- **Count only your own side effects.** An injection test counted all pending approvals. Parallel tests also create approvals, so it failed 6 times in 440 runs. It now filters by its own order id; 0 in 440 since.
- **Rubrics need negative controls.** The judge first missed "isn't possible" as a refusal, and one canned wording left out the order id. Both were found because each rubric has a test that must fail.

See [testing-ai-output.md](testing-ai-output.md) for the semantic-assertion approach.
