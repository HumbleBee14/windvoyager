"""Rollover and pruning — enforces the "never empty + skip broken cycle" invariant.

Rules (PLAN §7):
  1. Complete cycles live at WBPROC/<cycle>/ with a .complete marker.
  2. In-progress cycles live at WBPROC/<cycle>.partial/.
  3. Publishing a cycle means: write .complete into its .partial dir,
     then os.rename the dir to drop the suffix.
  4. Only AFTER a successful publish do we delete anything else.
"""

from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.storage.layout import COMPLETE_MARKER, StorageLayout

log = logging.getLogger(__name__)


def publish(layout: StorageLayout, cycle: Cycle) -> None:
    """Promote a .partial cycle dir to final. Writes .complete marker then renames.

    After returning, the cycle is the new "current good" and safe to consume.
    Caller is responsible for calling prune_except() afterwards to reclaim space.
    """
    partial_dir = layout.proc_cycle_dir(cycle, partial=True)
    final_dir = layout.proc_cycle_dir(cycle, partial=False)

    if not partial_dir.exists():
        raise FileNotFoundError(f"cannot publish {cycle.id}: {partial_dir} missing")
    if final_dir.exists():
        # Idempotent: this can happen if we crashed right after the rename. Caller
        # handles recovery; here we just refuse to double-publish.
        raise FileExistsError(f"{final_dir} already exists; already published?")

    marker = layout.complete_marker(cycle, partial=True)
    marker.touch()
    # fsync the marker's parent so the marker is durable before rename.
    _fsync_dir(partial_dir)
    os.rename(partial_dir, final_dir)
    _fsync_dir(layout.proc_root)
    log.info("published cycle %s -> %s", cycle.id, final_dir)


def prune_except(layout: StorageLayout, keep: Cycle) -> None:
    """Post-publish cleanup: keep only the newly-published cycle's proc dir.

    Deletes every other proc hour-dir (old-good, abandoned-partial, stray) and
    ALL raw dirs — including `keep`'s own raw, since after publish its raw
    files have already served their purpose (task spec: "delete all files
    after the cycle is complete"). The next cycle's runner recreates its
    raw dir fresh.

    Empty date-level parent dirs are also removed so the tree doesn't grow.
    """
    keep_proc = layout.proc_cycle_dir(keep, partial=False)
    for cid, is_partial in layout.iter_proc_entries():
        cycle_path_partial = is_partial
        # Reconstruct the hour-dir path from the entry info.
        date_str, hour_str = cid[:8], cid[8:]
        hour_name = f"{hour_str}{'.partial' if cycle_path_partial else ''}"
        entry_path = layout.proc_root / date_str / hour_name
        if entry_path == keep_proc:
            continue
        log.info("pruning proc dir %s", entry_path)
        shutil.rmtree(entry_path, ignore_errors=True)
    # Remove empty date-level dirs left behind (except the one we're keeping in).
    for date_dir in layout.iter_date_dirs():
        try:
            if not any(date_dir.iterdir()):
                date_dir.rmdir()
        except OSError:
            pass

    # Wipe ALL raw dirs (date-level and their contents).
    for date_dir in layout.iter_raw_date_dirs():
        log.info("pruning raw date dir %s", date_dir)
        shutil.rmtree(date_dir, ignore_errors=True)


def find_current_good(layout: StorageLayout) -> str | None:
    """Return the cycle_id of the most recent complete cycle, or None."""
    candidates: list[str] = []
    for cid, is_partial in layout.iter_proc_entries():
        if is_partial:
            continue
        from gfs_mirror.domain.cycle import Cycle

        c = Cycle.from_string(cid)
        if layout.complete_marker(c, partial=False).exists():
            candidates.append(cid)
    return max(candidates) if candidates else None


def _fsync_dir(path: Path) -> None:
    """Best-effort fsync of a directory; swallow errors on platforms that don't support it."""
    try:
        fd = os.open(path, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
    except OSError:
        pass
