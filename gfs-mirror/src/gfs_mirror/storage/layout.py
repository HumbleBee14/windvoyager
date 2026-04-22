"""On-disk path conventions for raw and processed data.

Directory shapes:

  WBRAW/<cycle>/f<NNN>.grib2              raw downloads, deleted after publish
  WBPROC/<cycle>.partial/<ts>             in-progress processed files
  WBPROC/<cycle>.partial/.manifest.json   resume state for crashed runs
  WBPROC/<cycle>.partial/.complete        sentinel written before rename
  WBPROC/<cycle>/...                      current good cycle (post-rename)

This is the *only* module that knows these names. Nothing else in the codebase
should hardcode "partial" or ".complete" — go through StorageLayout.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from gfs_mirror.domain.cycle import Cycle

PARTIAL_SUFFIX = ".partial"
COMPLETE_MARKER = ".complete"
MANIFEST_NAME = ".manifest.json"


@dataclass(frozen=True)
class StorageLayout:
    raw_root: Path
    proc_root: Path

    def ensure_roots(self) -> None:
        self.raw_root.mkdir(parents=True, exist_ok=True)
        self.proc_root.mkdir(parents=True, exist_ok=True)

    # ---- raw side ----

    def raw_cycle_dir(self, cycle: Cycle) -> Path:
        return self.raw_root / cycle.id

    def raw_file(self, cycle: Cycle, lead_hour: int) -> Path:
        return self.raw_cycle_dir(cycle) / f"f{lead_hour:03d}.grib2"

    # ---- processed side ----

    def proc_cycle_dir(self, cycle: Cycle, *, partial: bool) -> Path:
        name = f"{cycle.id}{PARTIAL_SUFFIX}" if partial else cycle.id
        return self.proc_root / name

    def proc_file(self, cycle: Cycle, lead_hour: int, *, partial: bool = True) -> Path:
        """Filename is the Unix timestamp of the forecast moment, per spec."""
        ts = cycle.forecast_timestamp(lead_hour)
        return self.proc_cycle_dir(cycle, partial=partial) / str(ts)

    def complete_marker(self, cycle: Cycle, *, partial: bool = True) -> Path:
        return self.proc_cycle_dir(cycle, partial=partial) / COMPLETE_MARKER

    def manifest_path(self, cycle: Cycle, *, partial: bool = True) -> Path:
        return self.proc_cycle_dir(cycle, partial=partial) / MANIFEST_NAME

    # ---- discovery ----

    def iter_raw_cycle_ids(self) -> list[str]:
        if not self.raw_root.exists():
            return []
        return sorted(p.name for p in self.raw_root.iterdir() if p.is_dir())

    def iter_proc_entries(self) -> list[tuple[str, bool]]:
        """List (cycle_id, is_partial) pairs found under proc_root."""
        if not self.proc_root.exists():
            return []
        out: list[tuple[str, bool]] = []
        for p in self.proc_root.iterdir():
            if not p.is_dir():
                continue
            if p.name.endswith(PARTIAL_SUFFIX):
                out.append((p.name[: -len(PARTIAL_SUFFIX)], True))
            else:
                out.append((p.name, False))
        out.sort()
        return out
