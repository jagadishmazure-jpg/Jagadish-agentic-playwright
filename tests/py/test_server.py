from conftest import sse


def test_health(client):
    assert client.get("/healthz").json()["ok"] is True


def test_pages_render(client):
    for p in ["/", "/login", "/catalog", "/product", "/cart", "/checkout", "/returns", "/orders", "/assistant", "/console", "/account"]:
        r = client.get(p)
        assert r.status_code == 200 and "<main>" in r.text, p


def test_security_headers(client):
    r = client.get("/")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'self'" in r.headers["content-security-policy"]


def test_login_otp_flow_sets_httponly_cookie(client):
    ch = client.post("/api/auth/login", json={"username": "riley", "password": "trail-demo-1"}).json()["challenge"]
    code = client.get(f"/api/test/otp?challenge={ch}").json()["code"]
    assert client.post("/api/auth/otp", json={"challenge": ch, "code": "999999" if code != "999999" else "000000"}).status_code == 401
    ch = client.post("/api/auth/login", json={"username": "riley", "password": "trail-demo-1"}).json()["challenge"]
    code = client.get(f"/api/test/otp?challenge={ch}").json()["code"]
    r = client.post("/api/auth/otp", json={"challenge": ch, "code": code})
    assert r.status_code == 200
    assert "httponly" in r.headers["set-cookie"].lower()
    assert client.get("/api/me").json()["display"] == "Riley"


def test_bad_password(client):
    assert client.post("/api/auth/login", json={"username": "riley", "password": "x"}).status_code == 401


def test_product_crud_requires_staff(client):
    p = {"sku": "LK-TST-900", "name": "Gaiter", "category": "packs", "price": 10}
    assert client.post("/api/products", json=p).status_code == 401
    tok = client.post("/api/auth/token", json={"username": "riley", "password": "trail-demo-1"}).json()["access_token"]
    assert client.post("/api/products", json=p, headers={"Authorization": f"Bearer {tok}"}).status_code == 403
    st = client.post("/api/auth/token", json={"username": "specialist", "password": "trail-demo-3"}).json()["access_token"]
    h = {"Authorization": f"Bearer {st}"}
    created = client.post("/api/products", json=p, headers=h)
    assert created.status_code == 201
    patched = client.patch("/api/products/LK-TST-900", json={"price": 12}, headers=h)
    assert patched.json()["price"] == 12
    deleted = client.delete("/api/products/LK-TST-900", headers=h)
    assert deleted.status_code == 204


def test_catalog_pagination(client):
    pages = []
    n = 1
    while True:
        r = client.get(f"/api/catalog?page={n}&size=12").json()
        pages.append(len(r["items"]))
        if not r["has_more"]:
            break
        n += 1
    assert sum(pages) == 60


def test_checkout_requires_test_token(client):
    body = {"name": "Riley", "address": "12 Example Lane", "items": ["LK-PCK-001"], "payment_token": "real"}
    assert client.post("/api/checkout", json=body).status_code == 402
    tok = client.post("/api/payment/tokenize", json={"card": "4242 4242 4242 4242"}).json()["token"]
    assert client.post("/api/checkout", json={**body, "payment_token": tok}).json()["total"] == 89.0


def test_returns_and_label(client):
    r = client.post("/api/returns", json={"order_id": "LK-1003", "reason": "too-small"}).json()
    csv = client.get(f"/api/returns/{r['return_id']}/label.csv")
    assert csv.headers["content-type"].startswith("text/csv")
    assert "LK-1003" in csv.text


def test_upload(client):
    r = client.post("/api/upload", files={"file": ("a.txt", b"hello", "text/plain")}).json()
    assert r == {"filename": "a.txt", "size": 5, "content_type": "text/plain"}


def test_chat_stream_and_approval_permissions(client):
    events = sse(client.post("/api/chat", json={"message": "refund LK-1003", "seed": 0}).text)
    aid = next(e["id"] for e in events if e["type"] == "approval_required")
    assert client.post(f"/api/approvals/{aid}", json={"approve": True}).status_code == 403
    st = client.post("/api/auth/token", json={"username": "specialist", "password": "trail-demo-3"}).json()["access_token"]
    r = client.post(f"/api/approvals/{aid}", json={"approve": True}, headers={"Authorization": f"Bearer {st}"})
    assert r.json()["status"] == "approved"
    assert client.get("/api/refunds").json()[0]["approval"] == aid


def test_customer_may_cancel_own_request(client):
    events = sse(client.post("/api/chat", json={"message": "refund LK-1003"}).text)
    aid = next(e["id"] for e in events if e["type"] == "approval_required")
    assert client.post(f"/api/approvals/{aid}", json={"approve": False}).json()["status"] == "denied"


def test_test_endpoints_hidden_outside_test_mode(client, monkeypatch):
    from larkspur import server

    monkeypatch.setattr(server, "TEST_MODE", False)
    assert client.post("/api/test/reset").status_code == 404
    assert client.get("/api/test/otp?challenge=x").status_code == 404
