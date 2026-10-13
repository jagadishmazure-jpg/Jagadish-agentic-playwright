"""FastAPI app: shop pages, REST API, returns assistant (SSE) and approval console.

Run:  uvicorn larkspur.server:app --port 8765
State is in memory and resets on restart (or POST /api/test/reset in test mode)."""

from __future__ import annotations

import asyncio
import csv
import io
import json
import os
import secrets
import time
from pathlib import Path

from fastapi import Cookie, FastAPI, File, Header, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from larkspur import assistant as asst
from larkspur import data
from larkspur.llm import model_from_env

STATIC = Path(__file__).parent / "static"
TEST_MODE = os.environ.get("LARKSPUR_TEST_MODE", "1") == "1"
TOKEN_DELAY_S = float(os.environ.get("LARKSPUR_TOKEN_DELAY_MS", "12")) / 1000

# Demo-only accounts for a fictional shop. These are not secrets: they exist only in this local app.
USERS = {
    "riley": {"password": "trail-demo-1", "customer": "C-1001", "role": "customer", "display": "Riley"},
    "morgan": {"password": "trail-demo-2", "customer": "C-1002", "role": "customer", "display": "Morgan"},
    "specialist": {"password": "trail-demo-3", "customer": None, "role": "specialist", "display": "Returns specialist"},
}

app = FastAPI(title="Larkspur Outfitters (demo)", docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


class State:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.products = {p["sku"]: p for p in data.products()}
        self.sessions: dict[str, str] = {}
        self.tokens: dict[str, str] = {}
        self.challenges: dict[str, dict] = {}
        self.returns: dict[str, dict] = {}
        self.placed: list[dict] = []
        self.desk = asst.ApprovalDesk()


S = State()


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    # Frames are allowed only from this origin (the checkout embeds the payment frame).
    resp.headers.setdefault("Content-Security-Policy", "frame-ancestors 'self'")
    return resp


# ------------------------------------------------------------------ pages
PAGES = ["index", "login", "account", "catalog", "product", "cart", "checkout", "returns", "orders", "assistant", "console"]


def _page(name: str) -> HTMLResponse:
    return HTMLResponse((STATIC / f"{name}.html").read_text())


@app.get("/", response_class=HTMLResponse)
def home():
    return _page("index")


for _name in PAGES[1:]:
    app.add_api_route(f"/{_name}", (lambda n: lambda: _page(n))(_name), methods=["GET"], response_class=HTMLResponse)


@app.get("/healthz")
def healthz():
    return {"ok": True, "test_mode": TEST_MODE}


# ------------------------------------------------------------------ auth
class Login(BaseModel):
    username: str
    password: str


class Otp(BaseModel):
    challenge: str
    code: str


def _check(body: Login) -> dict:
    u = USERS.get(body.username)
    if not u or not secrets.compare_digest(u["password"], body.password):
        raise HTTPException(401, "invalid credentials")
    return u


@app.post("/api/auth/login")
def login(body: Login):
    _check(body)
    ch = secrets.token_urlsafe(8)
    S.challenges[ch] = {"user": body.username, "code": f"{secrets.randbelow(10**6):06d}", "t": time.time()}
    return {"otp_required": True, "challenge": ch}


@app.get("/api/test/otp")
def test_otp(challenge: str):
    """Test-only OTP lookup (the pattern a real team would back with a test mailbox or a seeded TOTP secret)."""
    if not TEST_MODE:
        raise HTTPException(404)
    ch = S.challenges.get(challenge)
    if not ch:
        raise HTTPException(404)
    return {"code": ch["code"]}


@app.post("/api/auth/otp")
def verify_otp(body: Otp, response: Response):
    ch = S.challenges.pop(body.challenge, None)
    if not ch or not secrets.compare_digest(ch["code"], body.code):
        raise HTTPException(401, "invalid code")
    sid = secrets.token_urlsafe(16)
    S.sessions[sid] = ch["user"]
    response.set_cookie("lk_session", sid, httponly=True, samesite="strict")
    return {"ok": True, "user": USERS[ch["user"]]["display"]}


@app.post("/api/auth/token")
def token(body: Login):
    """Bearer token for API clients (API tests and the API-based login fixture)."""
    _check(body)
    tok = secrets.token_urlsafe(16)
    S.tokens[tok] = body.username
    sid = secrets.token_urlsafe(16)
    S.sessions[sid] = body.username
    return {"access_token": tok, "token_type": "bearer", "session": sid}


@app.post("/api/auth/logout")
def logout(response: Response, lk_session: str | None = Cookie(default=None)):
    S.sessions.pop(lk_session or "", None)
    response.delete_cookie("lk_session")
    return {"ok": True}


def _user(lk_session: str | None, authorization: str | None) -> str:
    if authorization and authorization.lower().startswith("bearer "):
        u = S.tokens.get(authorization[7:])
        if u:
            return u
    if lk_session and lk_session in S.sessions:
        return S.sessions[lk_session]
    raise HTTPException(401, "sign in required")


@app.get("/api/me")
def me(lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    u = _user(lk_session, authorization)
    return {"username": u, "display": USERS[u]["display"], "role": USERS[u]["role"]}


# ------------------------------------------------------------------ products (CRUD)
class ProductIn(BaseModel):
    sku: str = Field(pattern=r"^LK-[A-Z]{3}-\d{3}$")
    name: str = Field(min_length=2, max_length=80)
    category: str
    price: float = Field(gt=0)
    in_stock: bool = True
    rating: float = Field(default=0, ge=0, le=5)


class ProductPatch(BaseModel):
    name: str | None = None
    price: float | None = Field(default=None, gt=0)
    in_stock: bool | None = None


def _staff(lk_session, authorization):
    u = _user(lk_session, authorization)
    if USERS[u]["role"] != "specialist":
        raise HTTPException(403, "staff only")
    return u


@app.get("/api/products")
def list_products(category: str | None = None, in_stock: bool | None = None, sort: str = "name"):
    items = list(S.products.values())
    if category:
        items = [p for p in items if p["category"] == category]
    if in_stock is not None:
        items = [p for p in items if p["in_stock"] == in_stock]
    key = {"name": lambda p: p["name"], "price": lambda p: p["price"], "rating": lambda p: -p["rating"]}.get(sort)
    if not key:
        raise HTTPException(422, "sort must be name, price or rating")
    return sorted(items, key=key)


@app.get("/api/products/{sku}")
def get_product(sku: str):
    p = S.products.get(sku.upper())
    if not p:
        raise HTTPException(404, "not found")
    return {**p, "reviews": data.REVIEWS.get(p["sku"], [])}


@app.post("/api/products", status_code=201)
def create_product(body: ProductIn, lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    _staff(lk_session, authorization)
    if body.sku in S.products:
        raise HTTPException(409, "exists")
    S.products[body.sku] = body.model_dump()
    return S.products[body.sku]


@app.put("/api/products/{sku}")
def replace_product(sku: str, body: ProductIn, lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    _staff(lk_session, authorization)
    if sku not in S.products or body.sku != sku:
        raise HTTPException(404, "not found")
    S.products[sku] = body.model_dump()
    return S.products[sku]


@app.patch("/api/products/{sku}")
def patch_product(sku: str, body: ProductPatch, lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    _staff(lk_session, authorization)
    if sku not in S.products:
        raise HTTPException(404, "not found")
    S.products[sku].update({k: v for k, v in body.model_dump().items() if v is not None})
    return S.products[sku]


@app.delete("/api/products/{sku}", status_code=204)
def delete_product(sku: str, lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    _staff(lk_session, authorization)
    if S.products.pop(sku, None) is None:
        raise HTTPException(404, "not found")
    return Response(status_code=204)


@app.get("/api/catalog")
def catalog(page: int = 1, size: int = 12):
    items = data.catalogue()
    start = (page - 1) * size
    chunk = items[start : start + size]
    return {"page": page, "items": chunk, "has_more": start + size < len(items), "total": len(items)}


# ------------------------------------------------------------------ orders, checkout, returns
@app.get("/api/orders")
def orders(lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    u = _user(lk_session, authorization)
    cust = USERS[u]["customer"]
    rows = [{"order_id": k, **{f: v[f] for f in ("items", "total", "status")}} for k, v in data.ORDERS.items() if cust is None or v["customer"] == cust]
    return rows


class Checkout(BaseModel):
    name: str = Field(min_length=2)
    address: str = Field(min_length=4)
    items: list[str]
    payment_token: str


@app.post("/api/checkout")
def checkout(body: Checkout):
    if not body.items:
        raise HTTPException(422, "cart is empty")
    if not body.payment_token.startswith("tok_test_"):
        raise HTTPException(402, "payment declined")
    total = sum(S.products[s]["price"] for s in body.items if s in S.products)
    oid = f"LK-{2000 + len(S.placed) + 1}"
    S.placed.append({"order_id": oid, "total": total, "items": body.items})
    return {"order_id": oid, "total": total}


@app.post("/api/payment/tokenize")
def tokenize(body: dict):
    """Fake payment provider used by the embedded payment frame. Accepts only the classic test card."""
    number = str(body.get("card", "")).replace(" ", "")
    if number != "4242424242424242":
        raise HTTPException(402, "card declined")
    return {"token": "tok_test_" + secrets.token_hex(4)}


class ReturnIn(BaseModel):
    order_id: str
    reason: str
    photo: str | None = None


@app.post("/api/returns", status_code=201)
def create_return(body: ReturnIn):
    if body.order_id.upper() not in data.ORDERS:
        raise HTTPException(404, "unknown order")
    rid = f"RMA-{len(S.returns) + 1:04d}"
    S.returns[rid] = {"return_id": rid, "order_id": body.order_id.upper(), "reason": body.reason, "photo": body.photo}
    return S.returns[rid]


@app.get("/api/returns/{rid}/label.csv")
def label(rid: str):
    r = S.returns.get(rid)
    if not r:
        raise HTTPException(404)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["return_id", "order_id", "reason", "carrier", "ship_to"])
    w.writerow([r["return_id"], r["order_id"], r["reason"], "Parcelwise", "Larkspur Returns, 1 Example Way"])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{rid}-label.csv"'})


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    content = await file.read()
    if len(content) > 2_000_000:
        raise HTTPException(413, "too large")
    return {"filename": file.filename, "size": len(content), "content_type": file.content_type}


@app.get("/api/slow")
async def slow(ms: int = 500):
    await asyncio.sleep(min(ms, 5000) / 1000)
    return {"waited_ms": ms}


# ------------------------------------------------------------------ assistant
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    seed: int = 0


@app.post("/api/chat")
def chat(body: ChatIn):
    a = asst.Assistant(S.desk, model_from_env(body.seed))

    def gen():
        for ev in asst.stream(a, body.message, TOKEN_DELAY_S):
            yield f"data: {json.dumps(ev)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-store"})


class Decision(BaseModel):
    approve: bool


@app.get("/api/approvals")
def approvals():
    return [vars(a) for a in S.desk.items.values()]


@app.post("/api/approvals/{aid}")
def decide(aid: str, body: Decision, lk_session: str | None = Cookie(default=None), authorization: str | None = Header(default=None)):
    """A refund approval is a human decision. In the demo the customer-facing page shows the dialog and a
    specialist account is required to approve; the customer can only cancel (deny) their own request."""
    if aid not in S.desk.items:
        raise HTTPException(404)
    who = "anonymous"
    try:
        who = _user(lk_session, authorization)
    except HTTPException:
        pass
    if body.approve and (who == "anonymous" or USERS[who]["role"] != "specialist"):
        raise HTTPException(403, "only a returns specialist can approve a refund")
    try:
        a = S.desk.decide(aid, body.approve, who)
    except ValueError as e:
        raise HTTPException(409, str(e)) from e
    return vars(a)


@app.get("/api/refunds")
def refunds():
    return S.desk.refunds


@app.post("/api/test/reset")
def reset():
    if not TEST_MODE:
        raise HTTPException(404)
    S.reset()
    return {"ok": True}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(STATIC / "favicon.svg", media_type="image/svg+xml")


@app.get("/go/{name}", include_in_schema=False)
def go(name: str):
    return RedirectResponse(f"/{name}" if name in PAGES else "/")
