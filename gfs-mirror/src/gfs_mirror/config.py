"""Typed configuration loaded from environment variables.

Fails loudly at startup on missing/invalid values — we'd rather not discover
a misconfig three hours into a cycle.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from gfs_mirror.domain.schedule import parse_schedule

VALID_GRIDS = ("1p00", "0p25")


@dataclass(frozen=True)
class Config:
    raw_dir: Path
    proc_dir: Path

    grid: str
    schedule_spec: str
    lead_hours: list[int] = field()

    download_concurrency: int
    process_concurrency: int

    poll_interval_sec: int
    publish_lag_minutes: int
    max_file_retries: int
    cycle_timeout_hours: int

    log_level: str

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Config:
        e = env if env is not None else dict(os.environ)

        raw_dir = Path(_require(e, "WBRAW"))
        proc_dir = Path(_require(e, "WBPROC"))

        grid = e.get("GFSM_GRID", "1p00").strip()
        if grid not in VALID_GRIDS:
            raise ValueError(f"GFSM_GRID must be one of {VALID_GRIDS}, got {grid!r}")

        schedule_spec = e.get("GFSM_SCHEDULE", "0-48:3,48-192:6").strip()
        lead_hours = parse_schedule(schedule_spec)

        return cls(
            raw_dir=raw_dir,
            proc_dir=proc_dir,
            grid=grid,
            schedule_spec=schedule_spec,
            lead_hours=lead_hours,
            download_concurrency=_int(e, "GFSM_DOWNLOAD_CONCURRENCY", 8, min_=1),
            process_concurrency=_int(e, "GFSM_PROCESS_CONCURRENCY", os.cpu_count() or 4, min_=1),
            poll_interval_sec=_int(e, "GFSM_POLL_INTERVAL_SEC", 60, min_=1),
            publish_lag_minutes=_int(e, "GFSM_PUBLISH_LAG_MINUTES", 210, min_=0),
            max_file_retries=_int(e, "GFSM_MAX_FILE_RETRIES", 20, min_=1),
            cycle_timeout_hours=_int(e, "GFSM_CYCLE_TIMEOUT_HOURS", 5, min_=1),
            log_level=e.get("GFSM_LOG_LEVEL", "INFO").upper(),
        )


def _require(env: dict[str, str], key: str) -> str:
    v = env.get(key, "").strip()
    if not v:
        raise ValueError(f"required env var {key} is not set")
    return v


def _int(env: dict[str, str], key: str, default: int, *, min_: int) -> int:
    raw = env.get(key, "").strip()
    if not raw:
        return default
    try:
        v = int(raw)
    except ValueError as e:
        raise ValueError(f"{key}={raw!r} is not an integer") from e
    if v < min_:
        raise ValueError(f"{key}={v} must be >= {min_}")
    return v
