"""Model selection. Default: the seeded FakeModel (offline, deterministic per seed).

LARKSPUR_LLM=azure is the reserved switch for a real model on Azure OpenAI / Microsoft Foundry with
Microsoft Entra ID (DefaultAzureCredential: a managed identity in Azure, `az login` locally, no API key).
It is PLANNED, not built: selecting it raises with a pointer to docs/azure.md, which describes the wiring."""

from __future__ import annotations

import os

from larkspur.assistant import FakeModel


def model_from_env(seed: int) -> FakeModel:
    choice = os.environ.get("LARKSPUR_LLM", "fake")
    if choice == "fake":
        return FakeModel(seed=seed, gullible=os.environ.get("LARKSPUR_GULLIBLE") == "1")
    if choice == "azure":  # pragma: no cover - needs Azure and the `azure` extra
        raise NotImplementedError(
            "Azure mode: install the 'azure' extra and wire agent_framework's Azure OpenAI chat client with "
            "DefaultAzureCredential; see docs/azure.md. Not run from this repository."
        )
    raise ValueError(f"unknown LARKSPUR_LLM={choice!r}")
