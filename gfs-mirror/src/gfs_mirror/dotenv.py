"""Minimal .env file loader.

Rolling this instead of adding python-dotenv — it's 20 lines and we don't need
interpolation, multi-line values, or other dotenv edge cases.

Usage:
    load_dotenv()          # auto-finds .env in cwd or walks up
    load_dotenv(Path(...)) # explicit path

Semantics:
    - Lines starting with # are comments.
    - KEY=VALUE, KEY='VALUE', KEY="VALUE" all supported.
    - Existing env vars are NOT overwritten (process env wins).
    - Missing file is silently OK — the service works from defaults.
"""

from __future__ import annotations

import os
from pathlib import Path


def load_dotenv(path: Path | None = None) -> Path | None:
    """Load KEY=VALUE pairs from a .env file into os.environ (without overriding).

    Returns the path loaded from, or None if no file was found.
    """
    env_path = path or _find_dotenv()
    if env_path is None or not env_path.exists():
        return None

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value
    return env_path


def _find_dotenv() -> Path | None:
    """Look for .env in cwd, then walk up to root."""
    here = Path.cwd()
    for d in (here, *here.parents):
        candidate = d / ".env"
        if candidate.exists():
            return candidate
    return None
