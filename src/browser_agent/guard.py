"""Guardrails between the model and the browser. Every tool call the model makes passes through
BrowserGuard.check(); the guard, not the model, decides what reaches Playwright MCP.

Rules
* Origin allowlist: navigation is allowed only to allowlisted origins; if any action lands on another
  origin the run is stopped (redirect or link escape).
* Secrets: the model never sees secret values. It may ask fill_secret(name) to type a vault secret, and
  only into a field whose accessible name matches that secret's allowed field. Plain typing of any text
  that contains a vault value or a card-like number is refused. Tool output is redacted before the
  model reads it.
* Approval: clicking a control whose accessible name looks like a submit, purchase or payment needs a
  human decision (an approver callback). Denied means the run stops.
* Step budget: a hard cap on tool calls per run.
* Tool denylist: arbitrary code and network inspection tools are never exposed.
Every decision is written to the audit log."""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path
from urllib.parse import urlsplit

CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
SNAP_ITEM = re.compile(r'-\s+([a-z]+)\s+"([^"]*)"[^\n]*?\[ref=([a-z0-9]+)\]')
APPROVAL_NAMES = re.compile(r"\b(submit|send|place order|pay|purchase|buy|confirm)\b", re.I)
DENIED_TOOLS = frozenset({"browser_run_code_unsafe", "browser_evaluate", "browser_network_request", "browser_file_upload", "browser_install"})


@dataclass(frozen=True)
class Secret:
    value: str
    allowed_field: re.Pattern


@dataclass
class ApprovalRequest:
    action: str
    element: str
    url: str
    form: dict
    step: int


@dataclass
class Decision:
    allowed: bool
    rule: str = ""
    reason: str = ""


@dataclass
class AuditEvent:
    step: int
    tool: str
    args: dict
    decision: str
    rule: str
    reason: str
    url: str
    t: float = field(default_factory=time.time)


class BrowserGuard:
    def __init__(
        self,
        allowed_origins: list[str],
        secrets: dict[str, Secret],
        approver: Callable[[ApprovalRequest], bool],
        step_budget: int = 20,
        audit_path: Path | None = None,
    ) -> None:
        self.allowed = {o.rstrip("/") for o in allowed_origins}
        self.secrets = secrets
        self.approver = approver
        self.step_budget = step_budget
        self.audit_path = audit_path
        self.steps = 0
        self.url = ""
        self.refs: dict[str, tuple[str, str]] = {}
        self.form: dict[str, str] = {}
        self.blocks: dict[str, int] = {}
        self.approvals = {"requested": 0, "granted": 0, "denied": 0}
        self.stopped: str | None = None
        self.events: list[AuditEvent] = []

    # ------------------------------------------------------------ helpers
    def origin_ok(self, url: str) -> bool:
        p = urlsplit(url)
        return f"{p.scheme}://{p.netloc}" in self.allowed

    def redact(self, text: str) -> str:
        for name, s in self.secrets.items():
            text = text.replace(s.value, f"[secret:{name}]")
        return CARD.sub("[card hidden]", text)

    def learn_snapshot(self, snapshot: str) -> None:
        self.refs = {ref: (role, name) for role, name, ref in SNAP_ITEM.findall(snapshot)}

    def _log(self, tool: str, args: dict, d: Decision) -> None:
        ev = AuditEvent(self.steps, tool, {k: self.redact(str(v)) for k, v in args.items()}, "allow" if d.allowed else "block", d.rule, d.reason, self.url)
        self.events.append(ev)
        if self.audit_path:
            with self.audit_path.open("a") as f:
                f.write(json.dumps(asdict(ev)) + "\n")

    def _block(self, tool: str, args: dict, rule: str, reason: str, stop: bool = False) -> Decision:
        d = Decision(False, rule, reason)
        self.blocks[rule] = self.blocks.get(rule, 0) + 1
        if stop:
            self.stopped = rule
        self._log(tool, args, d)
        return d

    # ------------------------------------------------------------ main check
    def check(self, tool: str, args: dict) -> Decision:
        if self.stopped:
            return Decision(False, self.stopped, "run already stopped")
        self.steps += 1
        if self.steps > self.step_budget:
            return self._block(tool, args, "step_budget", f"more than {self.step_budget} tool calls", stop=True)
        if tool in DENIED_TOOLS:
            return self._block(tool, args, "denied_tool", f"{tool} is never exposed to the model")
        if tool == "browser_navigate" and not self.origin_ok(args.get("url", "")):
            return self._block(tool, args, "origin_allowlist", f"{args.get('url')} is not an allowed origin")
        target = args.get("target")
        if tool in ("browser_click", "browser_type", "browser_select_option", "fill_secret"):
            if target not in self.refs:
                return self._block(tool, args, "unknown_ref", "element reference is not in the latest snapshot")
            role, name = self.refs[target]
            if tool == "browser_type":
                text = str(args.get("text", ""))
                if any(s.value in text for s in self.secrets.values()) or CARD.search(text):
                    return self._block(tool, args, "secret_in_text", "typing secret or card-like data as plain text is not allowed")
            if tool == "fill_secret":
                secret = self.secrets.get(str(args.get("secret")))
                if not secret:
                    return self._block(tool, args, "unknown_secret", "no such secret")
                if not secret.allowed_field.search(name):
                    return self._block(tool, args, "secret_wrong_field", f"secret {args.get('secret')} may not be typed into '{name}'")
            if tool in ("browser_type", "browser_select_option"):
                self.form[name] = str(args.get("text") or args.get("values"))
            if tool == "browser_click" and role in ("button", "link") and APPROVAL_NAMES.search(name):
                self.approvals["requested"] += 1
                req = ApprovalRequest("click", name, self.url, dict(self.form), self.steps)
                if not self.approver(req):
                    self.approvals["denied"] += 1
                    return self._block(tool, args, "approval_denied", f"a person declined '{name}'", stop=True)
                self.approvals["granted"] += 1
        d = Decision(True)
        self._log(tool, args, d)
        return d

    def after(self, result: str, url: str | None) -> None:
        """Called with every tool result: tracks the URL and stops the run if it left the allowlist."""
        if url:
            self.url = url
            if not self.origin_ok(url):
                self._block("observe", {"url": url}, "origin_escape", f"page moved to {url}", stop=True)
