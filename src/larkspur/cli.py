"""`larkspur serve` starts the demo app."""

from __future__ import annotations

import argparse


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="larkspur")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve", help="run the demo shop and assistant")
    s.add_argument("--host", default="127.0.0.1")
    s.add_argument("--port", type=int, default=8765)
    a = ap.parse_args(argv)
    if a.cmd == "serve":
        import uvicorn

        uvicorn.run("larkspur.server:app", host=a.host, port=a.port, log_level="warning")
    return 0
