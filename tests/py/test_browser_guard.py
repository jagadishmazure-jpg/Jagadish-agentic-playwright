import re

from browser_agent.agent import DEMO_SECRETS, task_approver
from browser_agent.guard import BrowserGuard, Secret
from browser_agent.mcp_browser import page_url, ran_code
from browser_agent.model import Task, find

SNAP = """
- textbox "Order number" [ref=e15]
- combobox "Reason" [ref=e17]
- button "Submit return" [ref=e21] [cursor=pointer]
- textbox "Card number" [ref=f1e3]
- textbox "Password" [ref=e40]
- link "Catalog" [ref=e5]
"""
BASE = "http://127.0.0.1:8765"


def guard(approve=True, budget=20):
    g = BrowserGuard([BASE], DEMO_SECRETS, lambda req: approve, budget)
    g.learn_snapshot(SNAP)
    return g


def test_allowlist_blocks_other_origins():
    g = guard()
    assert g.check("browser_navigate", {"url": BASE + "/returns"}).allowed
    d = g.check("browser_navigate", {"url": "http://collector.invalid/upload"})
    assert not d.allowed and d.rule == "origin_allowlist"
    assert not g.check("browser_navigate", {"url": "http://127.0.0.1:9999/"}).allowed  # same host, other port


def test_origin_escape_stops_the_run():
    g = guard()
    g.after("", "https://elsewhere.example/landing")
    assert g.stopped == "origin_escape"
    assert not g.check("browser_snapshot", {}).allowed


def test_secrets_only_into_their_field():
    g = guard()
    assert not g.check("fill_secret", {"target": "e15", "secret": "card"}).allowed
    assert g.check("fill_secret", {"target": "f1e3", "secret": "card"}).allowed
    assert g.check("fill_secret", {"target": "e40", "secret": "admin_password"}).allowed
    assert g.check("fill_secret", {"target": "e40", "secret": "nope"}).rule == "unknown_secret"


def test_plain_typing_of_secret_or_card_is_blocked():
    g = guard()
    assert g.check("browser_type", {"target": "e15", "text": "4242 4242 4242 4242"}).rule == "secret_in_text"
    assert g.check("browser_type", {"target": "e15", "text": "larkspur-admin-demo"}).rule == "secret_in_text"
    assert g.check("browser_type", {"target": "e15", "text": "LK-1003"}).allowed


def test_unknown_ref_and_denied_tools():
    g = guard()
    assert g.check("browser_click", {"target": "e999"}).rule == "unknown_ref"
    assert g.check("browser_run_code_unsafe", {"code": "1"}).rule == "denied_tool"
    assert g.check("browser_evaluate", {"function": "() => document.cookie"}).rule == "denied_tool"


def test_submit_needs_approval_and_denial_stops():
    g = guard(approve=False)
    d = g.check("browser_click", {"target": "e21"})
    assert not d.allowed and d.rule == "approval_denied" and g.stopped
    g2 = guard(approve=True)
    assert g2.check("browser_click", {"target": "e21"}).allowed
    assert g2.approvals == {"requested": 1, "granted": 1, "denied": 0}
    assert g2.check("browser_click", {"target": "e5"}).allowed  # a plain link needs no approval
    assert g2.approvals["requested"] == 1


def test_step_budget():
    g = guard(budget=3)
    for _ in range(3):
        assert g.check("browser_snapshot", {}).allowed
    assert g.check("browser_snapshot", {}).rule == "step_budget"


def test_redaction_and_audit_never_hold_secrets(tmp_path):
    g = BrowserGuard([BASE], {"card": Secret("4242 4242 4242 4242", re.compile("Card"))}, lambda r: True, 10, tmp_path / "a.jsonl")
    assert "4242" not in g.redact('textbox "Card number": 4242 4242 4242 4242')
    g.learn_snapshot(SNAP)
    g.check("browser_type", {"target": "e15", "text": "card 4242 4242 4242 4242"})
    assert "4242" not in (tmp_path / "a.jsonl").read_text()


def test_task_approver_checks_the_form_matches_the_task():
    from browser_agent.guard import ApprovalRequest

    t = Task("return", BASE, order="LK-1003", reason="Too small")
    ok = task_approver(t)
    assert ok(ApprovalRequest("click", "Submit return", BASE, {"Order number": "LK-1003"}, 5))
    assert not ok(ApprovalRequest("click", "Submit return", BASE, {"Order number": "LK-1001"}, 5))
    assert not task_approver(t, deny=True)(ApprovalRequest("click", "Submit return", BASE, {"Order number": "LK-1003"}, 5))


def test_snapshot_and_result_parsers():
    assert find(SNAP, "button", re.compile("Submit")) == "e21"
    assert find(SNAP, "textbox", "Nope") is None
    res = "### Ran Playwright code\n```js\nawait page.goto('x');\n```\n### Page\n- Page URL: http://127.0.0.1:8765/returns\n"
    assert ran_code(res) == "await page.goto('x');"
    assert page_url(res) == "http://127.0.0.1:8765/returns"


def test_task_parse_roundtrip():
    t = Task.parse('Task: {"goal": "purchase", "base": "http://x", "product": "P"}')
    assert t.goal == "purchase" and t.product == "P"
