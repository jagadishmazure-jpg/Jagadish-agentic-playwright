import pytest
from fastapi.testclient import TestClient

from larkspur import server


@pytest.fixture()
def client():
    server.S.reset()
    with TestClient(server.app) as c:
        yield c


def sse(text: str) -> list[dict]:
    import json

    return [json.loads(chunk[6:]) for chunk in text.split("\n\n") if chunk.startswith("data: ")]
