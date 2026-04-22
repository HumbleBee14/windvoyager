"""Per-cycle manifest: tracks per-lead progress so we can resume after a crash.

Written atomically (temp + rename). Read-tolerant: if the file is missing or
unreadable, callers treat it as "nothing done yet" — we'll re-run any leads
not represented.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

log = logging.getLogger(__name__)

SCHEMA_VERSION = 1


@dataclass
class Manifest:
    cycle_id: str
    schedule_spec: str
    grid: str
    all_leads: list[int]
    completed_leads: list[int] = field(default_factory=list)
    attempts: dict[int, int] = field(default_factory=dict)
    started_at: str = ""
    updated_at: str = ""
    schema_version: int = SCHEMA_VERSION

    def is_complete(self) -> bool:
        return set(self.completed_leads) >= set(self.all_leads)

    def remaining_leads(self) -> list[int]:
        done = set(self.completed_leads)
        return [h for h in self.all_leads if h not in done]

    def mark_done(self, lead: int) -> None:
        if lead not in self.completed_leads:
            self.completed_leads.append(lead)
            self.completed_leads.sort()
        self.updated_at = _now()

    def bump_attempt(self, lead: int) -> int:
        n = self.attempts.get(lead, 0) + 1
        self.attempts[lead] = n
        self.updated_at = _now()
        return n


def new_manifest(cycle_id: str, schedule_spec: str, grid: str, all_leads: list[int]) -> Manifest:
    now = _now()
    return Manifest(
        cycle_id=cycle_id,
        schedule_spec=schedule_spec,
        grid=grid,
        all_leads=list(all_leads),
        started_at=now,
        updated_at=now,
    )


def read(path: Path) -> Manifest | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        # attempts dict keys come back as strings from JSON; coerce.
        attempts = {int(k): int(v) for k, v in (data.get("attempts") or {}).items()}
        return Manifest(
            cycle_id=data["cycle_id"],
            schedule_spec=data["schedule_spec"],
            grid=data["grid"],
            all_leads=list(data["all_leads"]),
            completed_leads=list(data.get("completed_leads", [])),
            attempts=attempts,
            started_at=data.get("started_at", ""),
            updated_at=data.get("updated_at", ""),
            schema_version=int(data.get("schema_version", 1)),
        )
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        log.warning("manifest %s unreadable (%s); treating as missing", path, e)
        return None


def write(path: Path, manifest: Manifest) -> None:
    """Atomic write: temp file in same dir + os.replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(asdict(manifest), indent=2, sort_keys=True)
    # NamedTemporaryFile in the target dir ensures rename is atomic on same fs.
    fd, tmp_path = tempfile.mkstemp(prefix=".manifest-", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as f:
            f.write(payload)
        os.replace(tmp_path, path)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def _now() -> str:
    return datetime.now(UTC).isoformat()
