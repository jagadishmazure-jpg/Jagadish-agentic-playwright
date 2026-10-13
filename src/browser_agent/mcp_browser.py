"""Thin async client for Microsoft's Playwright MCP server (@playwright/mcp) over stdio.

The server is started per run with an isolated, in-memory browser profile. --allowed-origins limits
what the browser itself may request; the Playwright MCP docs state that this is not a security
boundary, so the agent's own guard (guard.py) is the enforcement point and this is defence in depth."""

from __future__ import annotations

import os
import re
import shutil
from contextlib import AsyncExitStack
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[2]


def mcp_command() -> list[str]:
    local = ROOT / "node_modules" / ".bin" / "playwright-mcp"
    if local.exists():
        return [str(local)]
    npx = shutil.which("npx") or "npx"
    return [npx, "-y", "@playwright/mcp@0.0.83"]


class PlaywrightMCP:
    def __init__(self, output_dir: Path, allowed_origins: list[str], browser: str = "chrome", headless: bool = True) -> None:
        self.output_dir = output_dir
        self.allowed_origins = allowed_origins
        self.browser = browser
        self.headless = headless
        self._stack: AsyncExitStack | None = None
        self.session: ClientSession | None = None
        self.tools: list[str] = []

    async def __aenter__(self) -> PlaywrightMCP:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        cmd = mcp_command()
        args = cmd[1:] + ["--isolated", "--browser", self.browser, "--output-dir", str(self.output_dir), "--caps", "devtools"]
        args += ["--allowed-origins", ";".join(self.allowed_origins)]
        if self.headless:
            args.append("--headless")
        params = StdioServerParameters(command=cmd[0], args=args, cwd=str(self.output_dir), env={**os.environ, "NPM_CONFIG_UPDATE_NOTIFIER": "false"})
        self._stack = AsyncExitStack()
        read, write = await self._stack.enter_async_context(stdio_client(params))
        self.session = await self._stack.enter_async_context(ClientSession(read, write))
        await self.session.initialize()
        self.tools = [t.name for t in (await self.session.list_tools()).tools]
        return self

    async def __aexit__(self, *exc) -> None:
        if self._stack:
            await self._stack.aclose()

    async def call(self, name: str, args: dict | None = None) -> str:
        assert self.session is not None
        res = await self.session.call_tool(name, args or {})
        return "\n".join(getattr(c, "text", "") for c in res.content)


PAGE_URL = re.compile(r"- Page URL: (\S+)")
CODE = re.compile(r"### Ran Playwright code\n```js\n(.*?)\n```", re.S)


def page_url(result: str) -> str | None:
    m = PAGE_URL.search(result)
    return m.group(1) if m else None


def ran_code(result: str) -> str | None:
    m = CODE.search(result)
    return m.group(1).strip() if m else None
