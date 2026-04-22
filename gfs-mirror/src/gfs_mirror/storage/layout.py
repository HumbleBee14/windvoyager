"""On-disk path conventions for raw and processed data.

Directory shapes (nested by cycle date, then cycle hour — matches NOAA's
own S3 layout and makes the spec's "subfolder for the cycle date" literal):

  WBRAW/<YYYYMMDD>/<HH>/f<NNN>.grib2              raw downloads, pruned post-publish
  WBPROC/<YYYYMMDD>/<HH>.partial/<unix_ts>        in-progress processed files
  WBPROC/<YYYYMMDD>/<HH>.partial/.manifest.json   resume state for crashed runs
  WBPROC/<YYYYMMDD>/<HH>.partial/.complete        sentinel written before rename
  WBPROC/<YYYYMMDD>/<HH>/...                      current good cycle (post-rename)

The .partial suffix is on the HOUR dir, not the date dir — so the atomic
rename is still one operation at the leaf level.

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
        return self.raw_root / cycle.date_str / cycle.hour_str

    def raw_file(self, cycle: Cycle, lead_hour: int) -> Path:
        return self.raw_cycle_dir(cycle) / f"f{lead_hour:03d}.grib2"

    # ---- processed side ----

    def proc_cycle_dir(self, cycle: Cycle, *, partial: bool) -> Path:
        hour_name = f"{cycle.hour_str}{PARTIAL_SUFFIX}" if partial else cycle.hour_str
        return self.proc_root / cycle.date_str / hour_name

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
        """Return sorted cycle_ids (YYYYMMDDHH) found under raw_root."""
        if not self.raw_root.exists():
            return []
        out: list[str] = []
        for date_dir in self.raw_root.iterdir():
            if not date_dir.is_dir() or not _is_date(date_dir.name):
                continue
            for hour_dir in date_dir.iterdir():
                if not hour_dir.is_dir() or not _is_hour(hour_dir.name):
                    continue
                out.append(date_dir.name + hour_dir.name)
        out.sort()
        return out

    def iter_proc_entries(self) -> list[tuple[str, bool]]:
        """List (cycle_id, is_partial) pairs found under proc_root.

        A cycle_id is YYYYMMDDHH; is_partial=True if the hour dir ends with
        the .partial suffix.
        """
        if not self.proc_root.exists():
            return []
        out: list[tuple[str, bool]] = []
        for date_dir in self.proc_root.iterdir():
            if not date_dir.is_dir() or not _is_date(date_dir.name):
                continue
            for hour_dir in date_dir.iterdir():
                if not hour_dir.is_dir():
                    continue
                name = hour_dir.name
                if name.endswith(PARTIAL_SUFFIX):
                    hh = name[: -len(PARTIAL_SUFFIX)]
                    is_partial = True
                else:
                    hh = name
                    is_partial = False
                if not _is_hour(hh):
                    continue
                out.append((date_dir.name + hh, is_partial))
        out.sort()
        return out

    def iter_date_dirs(self) -> list[Path]:
        """Top-level date dirs under proc_root (for empty-dir cleanup post-prune)."""
        if not self.proc_root.exists():
            return []
        return [p for p in self.proc_root.iterdir() if p.is_dir() and _is_date(p.name)]

    def iter_raw_date_dirs(self) -> list[Path]:
        if not self.raw_root.exists():
            return []
        return [p for p in self.raw_root.iterdir() if p.is_dir() and _is_date(p.name)]


def _is_date(s: str) -> bool:
    return len(s) == 8 and s.isdigit()


def _is_hour(s: str) -> bool:
    return len(s) == 2 and s.isdigit() and int(s) in (0, 6, 12, 18)
