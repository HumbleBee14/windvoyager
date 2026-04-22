"""Startup scan — reconstructs "where are we?" from disk alone.

Philosophy: the filesystem is the source of truth. We never persist
"I was working on cycle X" anywhere else. At boot we look around and:

  - If a <cycle>.partial dir has .complete inside, someone crashed between
    marker-write and rename. Finish the rename.
  - If multiple .partial dirs exist (shouldn't, but defensive), keep the
    newest and delete the rest.
  - Orphan raw dirs (no matching proc dir) get cleaned up.
"""

from __future__ import annotations

import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.storage.layout import COMPLETE_MARKER, PARTIAL_SUFFIX, StorageLayout
from gfs_mirror.storage.manifest import Manifest, read as read_manifest

log = logging.getLogger(__name__)


@dataclass
class RecoveryState:
    current_good: Cycle | None
    in_progress: Cycle | None
    in_progress_manifest: Manifest | None


def scan_and_repair(layout: StorageLayout) -> RecoveryState:
    """Scan disk, finish any interrupted rename, prune obviously-stale dirs.

    Returns a summary the runner can use to decide what to do next:
      - current_good: the complete cycle on disk, if any (most recent wins)
      - in_progress:  the partial cycle to resume (newest with no .complete sibling)
      - in_progress_manifest: its manifest, if present and readable
    """
    layout.ensure_roots()
    _finish_interrupted_renames(layout)

    entries = layout.iter_proc_entries()
    complete_ids = sorted(
        cid
        for cid, is_partial in entries
        if not is_partial and (layout.proc_root / cid / COMPLETE_MARKER).exists()
    )
    current_good = Cycle.from_string(complete_ids[-1]) if complete_ids else None

    # If there's a "complete" dir without the marker, it's corrupt — delete it.
    for cid, is_partial in entries:
        if is_partial:
            continue
        if not (layout.proc_root / cid / COMPLETE_MARKER).exists():
            stale = layout.proc_root / cid
            log.warning("final dir %s has no .complete marker; pruning", stale)
            shutil.rmtree(stale, ignore_errors=True)

    # Keep only the newest partial; wipe the rest.
    partials = sorted(cid for cid, is_partial in entries if is_partial)
    in_progress: Cycle | None = None
    in_progress_manifest: Manifest | None = None
    if partials:
        keep_id = partials[-1]
        for cid in partials[:-1]:
            stale = layout.proc_root / f"{cid}{PARTIAL_SUFFIX}"
            log.warning("extra partial dir %s; pruning", stale)
            shutil.rmtree(stale, ignore_errors=True)
        in_progress = Cycle.from_string(keep_id)
        in_progress_manifest = read_manifest(layout.manifest_path(in_progress, partial=True))

    _prune_orphan_raw(layout, current_good, in_progress)
    return RecoveryState(
        current_good=current_good,
        in_progress=in_progress,
        in_progress_manifest=in_progress_manifest,
    )


def _finish_interrupted_renames(layout: StorageLayout) -> None:
    """If <cycle>.partial has .complete inside and <cycle>/ doesn't exist, finish the rename."""
    for cid, is_partial in layout.iter_proc_entries():
        if not is_partial:
            continue
        partial_dir = layout.proc_root / f"{cid}{PARTIAL_SUFFIX}"
        final_dir = layout.proc_root / cid
        marker_in_partial = partial_dir / COMPLETE_MARKER
        if marker_in_partial.exists() and not final_dir.exists():
            log.warning("finishing interrupted rename: %s -> %s", partial_dir, final_dir)
            os.rename(partial_dir, final_dir)


def _prune_orphan_raw(
    layout: StorageLayout, current_good: Cycle | None, in_progress: Cycle | None
) -> None:
    """Delete raw cycle dirs that aren't tied to current_good or in_progress."""
    allowed = {c.id for c in (current_good, in_progress) if c is not None}
    for cid in layout.iter_raw_cycle_ids():
        if cid not in allowed:
            stale = layout.raw_root / cid
            log.info("pruning orphan raw dir %s", stale)
            shutil.rmtree(stale, ignore_errors=True)


def atomic_write(path: Path, data: bytes) -> None:
    """Utility: atomic file write (temp + rename). Used by download workers."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)
