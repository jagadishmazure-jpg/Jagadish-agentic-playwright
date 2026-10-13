"""Output and input guards for the returns assistant.

* mask_pii: removes emails, phone numbers and card numbers from anything the assistant streams.
* screen: flags text that tries to give the assistant instructions (prompt injection). Tool results
  (product pages, reviews, policy documents) are always treated as untrusted data, never as instructions;
  the screen only decides whether to tell the user that something was ignored."""

from __future__ import annotations

import re
from dataclasses import dataclass

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
PHONE = re.compile(r"\b(?:\+?1[ -]?)?(?:\(\d{3}\)[ -]?|\d{3}[ -])?\d{3}-\d{4}\b")

INJECTION_PATTERNS = [
    r"ignore (?:all |your )?(?:previous|prior) instructions",
    r"disregard (?:the|your|all) .{0,40}(?:rule|instruction|policy)",
    r"system notice to ai",
    r"\bassistant\s*:",
    r"send .{0,40}(?:customer|password|token|list)",
    r"https?://[^\s]+\.invalid",
    r"refund (?:immediately|everything|every order)",
    r"note for ai",
    r"type the saved (?:card|password)",
]
_INJ = [re.compile(p, re.I) for p in INJECTION_PATTERNS]


def mask_pii(text: str) -> str:
    text = EMAIL.sub("[email hidden]", text)
    text = CARD.sub("[card hidden]", text)
    return PHONE.sub("[phone hidden]", text)


def has_pii(text: str) -> bool:
    return bool(EMAIL.search(text) or CARD.search(text) or PHONE.search(text))


@dataclass(frozen=True)
class Screen:
    flagged: bool
    matches: tuple[str, ...]


def screen(text: str) -> Screen:
    hits = tuple(p.pattern for p in _INJ if p.search(text))
    return Screen(bool(hits), hits)
