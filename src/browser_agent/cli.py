"""handsagent: run the guarded browser agent.

handsagent bench --runs 50              seeded benchmark (app must be running; see docs/role-3-browser-agent.md)
handsagent run --goal return --order LK-1003 --reason "Too small"
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="handsagent")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bench")
    b.add_argument("--runs", type=int, default=50)
    b.add_argument("--base", default="http://127.0.0.1:8765")
    b.add_argument("--out", default="out/browser-agent")
    b.add_argument("--summary", default="evidence/browser-agent.json")
    b.add_argument("--obey-rate", type=float, default=0.3)
    r = sub.add_parser("run")
    r.add_argument("--goal", choices=["return", "purchase"], default="return")
    r.add_argument("--order", default="LK-1003")
    r.add_argument("--reason", default="Too small")
    r.add_argument("--product", default="Switchback 28L Daypack")
    r.add_argument("--visit-first", default="")
    r.add_argument("--seed", type=int, default=0)
    r.add_argument("--base", default="http://127.0.0.1:8765")
    r.add_argument("--out", default="out/browser-agent/single")
    a = ap.parse_args(argv)
    if a.cmd == "bench":
        from browser_agent.bench import main_bench

        return main_bench(a.runs, a.base, a.out, a.summary, a.obey_rate)
    from browser_agent.agent import run_task
    from browser_agent.model import Task

    task = Task(a.goal, a.base, order=a.order, reason=a.reason, product=a.product, visit_first=a.visit_first)
    res = asyncio.run(run_task(task, a.seed, Path(a.out)))
    print(json.dumps(res.__dict__, indent=2))
    return 0 if res.outcome == "done" else 1
