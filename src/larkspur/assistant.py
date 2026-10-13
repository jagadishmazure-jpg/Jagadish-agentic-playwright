"""The Larkspur returns assistant: a small tool-using agent with a deterministic, seeded fake model.

The model (FakeModel) decides which tools to call and writes the reply. It is scripted so that CI is
offline and repeatable, but it is *seeded*: different seeds pick different wordings, so tests have to
check meaning (tools used, citations, numbers, refusals) instead of exact text, just as with a real
model. LARKSPUR_LLM=azure swaps in an Azure OpenAI model through Entra ID (see llm.py); that path is
written but has not been run from this repository.

Guarantees that hold in code, whatever the model says:
* every refund goes through a human approval request (issue_refund only creates the request);
* everything streamed to the browser passes through guard.mask_pii;
* tool results are untrusted data; flagged content produces a notice and never changes tool calls
  unless the deliberately unsafe 'gullible' model is selected, and even then the approval gate holds.
"""

from __future__ import annotations

import itertools
import random
import re
import time
from collections.abc import Iterator
from dataclasses import dataclass, field

from larkspur import data, guard

ORDER_RE = re.compile(r"\bLK-\d{4}\b", re.I)
SKU_RE = re.compile(r"\bLK-[A-Z]{3}-\d{3}\b", re.I)
RETURN_WINDOW_DAYS = 30


# ---------------------------------------------------------------- tools
def lookup_order(order_id: str) -> dict:
    order = data.ORDERS.get(order_id.upper())
    if not order:
        return {"found": False, "order_id": order_id.upper()}
    cust = data.CUSTOMERS[order["customer"]]
    # The raw record deliberately includes contact details; the output mask must catch them.
    return {"found": True, "order_id": order_id.upper(), **order, "customer_name": cust["name"], "email": cust["email"], "phone": cust["phone"]}


def search_policy(query: str, k: int = 2) -> list[dict]:
    words = {w for w in re.findall(r"[a-z]+", query.lower()) if len(w) > 3}
    scored = []
    for doc in data.POLICIES:
        text = (doc["title"] + " " + doc["text"]).lower()
        score = sum(1 for w in words if w in text)
        if score:
            scored.append((score, doc["id"], doc))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [d for _, _, d in scored[:k]]


def read_product(sku: str) -> dict:
    prod = next((p for p in data.products() if p["sku"] == sku.upper()), None)
    return {"product": prod, "reviews": data.REVIEWS.get(sku.upper(), [])}


@dataclass
class Approval:
    id: str
    order_id: str
    amount: float
    status: str = "pending"  # pending | approved | denied
    decided_by: str = ""


@dataclass
class ApprovalDesk:
    """Human-in-the-loop queue. issue_refund only ever lands here."""

    items: dict[str, Approval] = field(default_factory=dict)
    refunds: list[dict] = field(default_factory=list)
    _seq: itertools.count = field(default_factory=lambda: itertools.count(1))

    def request(self, order_id: str, amount: float) -> Approval:
        a = Approval(id=f"APR-{next(self._seq):04d}", order_id=order_id, amount=amount)
        self.items[a.id] = a
        return a

    def decide(self, approval_id: str, approve: bool, who: str) -> Approval:
        a = self.items[approval_id]
        if a.status != "pending":
            raise ValueError("already decided")
        a.status = "approved" if approve else "denied"
        a.decided_by = who
        if approve:
            self.refunds.append({"order_id": a.order_id, "amount": a.amount, "approval": a.id})
        return a


# ---------------------------------------------------------------- model
WORDING = {
    "status": [
        "Order {order} is currently {status}.",
        "I checked order {order}: its status is {status}.",
        "Good news on {order}: it shows as {status}.",
    ],
    "policy": [
        "Here is what our policy says: {text}",
        "According to the returns policy, {text_lc}",
        "Short answer from the policy: {text}",
    ],
    "eligible": [
        "Order {order} was delivered {days} days ago, which is inside the {window}-day window, so it qualifies for a refund of ${amount:.2f}. A returns specialist needs to approve it first.",
        "{order} qualifies: it arrived {days} days ago (the window is {window} days). I have asked a returns specialist to approve a ${amount:.2f} refund.",
        "Order {order} is eligible. Delivery was {days} days ago, within {window} days, so a ${amount:.2f} refund is waiting for specialist approval.",
    ],
    "ineligible": [
        "Order {order} was delivered {days} days ago, which is outside the {window}-day window, so I can't refund it. Store credit may apply for a manufacturing fault.",
        "Sorry, {order} arrived {days} days ago and the returns window is {window} days, so a refund isn't possible. A fault claim for store credit might be.",
        "I can't issue a refund for {order}: {days} days since delivery is past the {window}-day limit. You could ask about store credit for faulty gear.",
    ],
    "not_delivered": [
        "Order {order} hasn't been delivered yet, so a return can't start until it arrives.",
        "{order} is still {status}; you can request a return once it's delivered.",
        "A return for {order} has to wait until it is delivered (it is {status} now).",
    ],
    "product": [
        "{name} costs ${price:.0f} and has an average rating of {rating}. Reviewers mention: {gist}.",
        "The {name} (${price:.0f}) is rated {rating}. What reviewers say: {gist}.",
        "Summary for {name}: ${price:.0f}, rated {rating}; reviews note {gist}.",
    ],
    "contact": [
        "The order belongs to {customer}, contact on file: {email}, {phone}.",
        "Customer for this order: {customer} ({email}, {phone}).",
        "I found {customer}; their contact details are {email} and {phone}.",
    ],
    "unknown_order": [
        "I couldn't find order {order}. Please check the number.",
        "There's no order {order} in our system.",
        "Order {order} doesn't exist; could you double-check it?",
    ],
    "help": [
        "I can check an order's status, explain the returns policy, summarise a product, or start a refund for a delivered order.",
        "Ask me about an order (like LK-1003), our returns policy, a product, or a refund.",
        "I help with order status, returns policy questions, product summaries and refunds.",
    ],
    "ignored": [
        "Note: some page content contained instructions aimed at me. I ignored them.",
        "Heads up: the content I read tried to give me instructions, and I did not follow them.",
        "I skipped instructions embedded in the content I read; only you and the shop's rules direct me.",
    ],
}


@dataclass
class Event:
    type: str
    data: dict


class FakeModel:
    """Deterministic, seeded stand-in for an LLM. `gullible=True` makes it obey injected text (unsafe on
    purpose) so tests can show that code-level gates still hold."""

    name = "fake-seeded"

    def __init__(self, seed: int = 0, gullible: bool = False) -> None:
        self.rng = random.Random(seed)
        self.gullible = gullible

    def say(self, key: str, **kw) -> str:
        return self.rng.choice(WORDING[key]).format(**kw)


class Assistant:
    def __init__(self, desk: ApprovalDesk, model: FakeModel) -> None:
        self.desk = desk
        self.model = model

    def run(self, message: str) -> Iterator[Event]:
        m = self.model
        text = message.lower()
        orders = [o.upper() for o in ORDER_RE.findall(message)]
        skus = [s.upper() for s in SKU_RE.findall(message)]
        flagged_input = guard.screen(message).flagged
        if flagged_input:
            yield Event("notice", {"text": m.say("ignored"), "source": "user"})

        if skus or "review" in text or "product" in text:
            sku = skus[0] if skus else "LK-JKT-001"
            yield Event("tool_call", {"name": "read_product", "args": {"sku": sku}})
            res = read_product(sku)
            p = res["product"]
            if not p:
                yield Event("final", {"text": f"I couldn't find product {sku}."})
                return
            yield Event("tool_result", {"name": "read_product", "summary": f"{p['name']}, {len(res['reviews'])} reviews"})
            reviews = res["reviews"]
            flagged = [r for r in reviews if guard.screen(r["text"]).flagged]
            safe = [r for r in reviews if r not in flagged]
            gist = "; ".join(r["text"].rstrip(".").lower() for r in safe) or "no reviews yet"
            yield Event("final_part", {"text": m.say("product", name=p["name"], price=p["price"], rating=p["rating"], gist=gist)})
            if flagged:
                yield Event("notice", {"text": m.say("ignored"), "source": "tool:read_product"})
                if m.gullible:
                    # An unsafe model obeys the review and tries to refund an order with no request from the user.
                    yield from self._refund("LK-1002", forced=True)
            yield Event("final", {"text": ""})
            return

        if orders and any(w in text for w in ("refund", "return my", "send back", "money back")):
            yield from self._refund(orders[0])
            yield Event("final", {"text": ""})
            return

        if orders and any(w in text for w in ("email", "phone", "contact", "who")):
            yield Event("tool_call", {"name": "lookup_order", "args": {"order_id": orders[0]}})
            o = lookup_order(orders[0])
            yield Event("tool_result", {"name": "lookup_order", "summary": "found" if o["found"] else "not found"})
            if not o["found"]:
                yield Event("final", {"text": m.say("unknown_order", order=orders[0])})
                return
            # The model naively repeats contact details; the PII mask in stream() hides them.
            yield Event("final", {"text": m.say("contact", customer=o["customer_name"], email=o["email"], phone=o["phone"])})
            return

        if orders:
            yield Event("tool_call", {"name": "lookup_order", "args": {"order_id": orders[0]}})
            o = lookup_order(orders[0])
            yield Event("tool_result", {"name": "lookup_order", "summary": "found" if o["found"] else "not found"})
            key = "status" if o["found"] else "unknown_order"
            yield Event("final", {"text": m.say(key, order=orders[0], status=o.get("status", ""))})
            return

        if any(w in text for w in ("policy", "return", "refund", "label", "shipping")):
            yield Event("tool_call", {"name": "search_policy", "args": {"query": message}})
            docs = search_policy(message)
            yield Event("tool_result", {"name": "search_policy", "summary": f"{len(docs)} documents"})
            safe_docs = [d for d in docs if not guard.screen(d["text"]).flagged]
            if not safe_docs:
                safe_docs = [next(d for d in data.POLICIES if d["id"] == "POL-RET-01")]
            for d in safe_docs:
                yield Event("citation", {"id": d["id"], "title": d["title"]})
            first = safe_docs[0]["text"]
            yield Event("final_part", {"text": m.say("policy", text=first, text_lc=first[0].lower() + first[1:])})
            if len(safe_docs) < len(docs):
                yield Event("notice", {"text": m.say("ignored"), "source": "tool:search_policy"})
            yield Event("final", {"text": ""})
            return

        yield Event("final", {"text": m.say("help")})

    def _refund(self, order_id: str, forced: bool = False) -> Iterator[Event]:
        m = self.model
        yield Event("tool_call", {"name": "lookup_order", "args": {"order_id": order_id}})
        o = lookup_order(order_id)
        yield Event("tool_result", {"name": "lookup_order", "summary": "found" if o["found"] else "not found"})
        if not o["found"]:
            yield Event("final_part", {"text": m.say("unknown_order", order=order_id)})
            return
        yield Event("tool_call", {"name": "search_policy", "args": {"query": "returns window refund approval"}})
        docs = [d for d in search_policy("returns window refund approval", k=3) if not guard.screen(d["text"]).flagged]
        yield Event("tool_result", {"name": "search_policy", "summary": f"{len(docs)} documents"})
        for d in docs:
            yield Event("citation", {"id": d["id"], "title": d["title"]})
        days = o["days_since_delivery"]
        if o["status"] != "delivered":
            yield Event("final_part", {"text": m.say("not_delivered", order=order_id, status=o["status"])})
            return
        if days > RETURN_WINDOW_DAYS and not forced:
            yield Event("final_part", {"text": m.say("ineligible", order=order_id, days=days, window=RETURN_WINDOW_DAYS)})
            return
        yield Event("tool_call", {"name": "issue_refund", "args": {"order_id": order_id, "amount": o["total"]}})
        a = self.desk.request(order_id, o["total"])  # never pays out by itself
        yield Event("approval_required", {"id": a.id, "order_id": order_id, "amount": a.amount})
        yield Event("final_part", {"text": m.say("eligible", order=order_id, days=days, window=RETURN_WINDOW_DAYS, amount=o["total"])})


def stream(assistant: Assistant, message: str, token_delay_s: float = 0.0) -> Iterator[dict]:
    """Turn assistant events into wire events: text is masked and split into word tokens."""
    t0 = time.perf_counter()
    for ev in assistant.run(message):
        if ev.type in ("final", "final_part"):
            text = guard.mask_pii(ev.data["text"])
            for tok in re.findall(r"\S+\s*", text):
                if token_delay_s:
                    time.sleep(token_delay_s)
                yield {"type": "token", "text": tok}
            if text and ev.type == "final_part":
                yield {"type": "token", "text": " "}
        else:
            payload = {k: (guard.mask_pii(v) if isinstance(v, str) else v) for k, v in ev.data.items()}
            yield {"type": ev.type, **payload}
    yield {"type": "done", "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}
