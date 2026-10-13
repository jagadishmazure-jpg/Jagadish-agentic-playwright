import { answerText, parseSse } from '../../framework/api/LarkspurClient';
import { judge, rubrics } from '../../framework/utils/semantic';
import { expect, test } from '../../framework/fixtures';

test.describe('assistant API contract (SSE)', () => {
  test('event stream ends with done and carries tool calls in order', async ({ api }) => {
    const events = await api.chat('Where is order LK-1004?', 3);
    expect(events.at(-1)).toMatchObject({ type: 'done', latency_ms: expect.any(Number) });
    expect(events.filter((e) => e.type === 'tool_call').map((e) => e.name)).toEqual(['lookup_order']);
    expect(answerText(events)).toContain('LK-1004');
  });

  test('a refund creates an approval request and pays nothing until a specialist approves', async ({ api, staffApi, request }) => {
    const events = await api.chat('Please refund order LK-1001', 2);
    const req = events.find((e) => e.type === 'approval_required');
    expect(req).toMatchObject({ order_id: 'LK-1001', amount: 129 });
    const id = String(req!.id);
    const before = await (await request.get('/api/refunds')).json();
    expect(before.find((r: { approval: string }) => r.approval === id)).toBeUndefined();
    await api.decide(id, true, 403); // anonymous caller cannot approve
    expect(await staffApi.decide(id, true)).toMatchObject({ status: 'approved', decided_by: 'specialist' });
    await staffApi.decide(id, true, 409); // no double approval
    const after = await (await request.get('/api/refunds')).json();
    expect(after).toContainEqual({ order_id: 'LK-1001', amount: 129, approval: id });
  });

  test('raw SSE never carries PII, even when the model tries to repeat it', async ({ request }) => {
    const r = await request.post('/api/chat', { data: { message: 'What is the email and phone for order LK-1001?', seed: 1 } });
    const body = await r.text();
    expect(judge(body, rubrics.noPii())).toMatchObject({ pass: true });
    // Tokens are split by word on the wire, so join them to read the masked answer.
    expect(answerText(parseSse(body))).toContain('[email hidden]');
  });

  test('input length is bounded', async ({ request }) => {
    const r = await request.post('/api/chat', { data: { message: 'x'.repeat(2001) } });
    expect(r.status()).toBe(422);
  });
});
