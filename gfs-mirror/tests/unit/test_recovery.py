from __future__ import annotations

from pathlib import Path

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage import manifest as mf
from gfs_mirror.storage.recovery import scan_and_repair


def _layout(tmp_path: Path) -> StorageLayout:
    return StorageLayout(raw_root=tmp_path / "raw", proc_root=tmp_path / "proc")


def test_fresh_filesystem(tmp_path):
    lay = _layout(tmp_path)
    state = scan_and_repair(lay)
    assert state.current_good is None
    assert state.in_progress is None
    assert state.in_progress_manifest is None
    # roots now exist
    assert lay.raw_root.is_dir()
    assert lay.proc_root.is_dir()


def test_detects_current_good_and_in_progress(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()

    # current good: 06Z (complete)
    good = lay.proc_root / "2026042206"
    good.mkdir()
    (good / ".complete").touch()

    # in progress: 12Z partial with a manifest
    c_partial = Cycle(2026, 4, 22, 12)
    partial = lay.proc_cycle_dir(c_partial, partial=True)
    partial.mkdir()
    m = mf.new_manifest(c_partial.id, "0-48:3,48-192:6", "1p00", [0, 3])
    m.mark_done(0)
    mf.write(lay.manifest_path(c_partial, partial=True), m)

    state = scan_and_repair(lay)
    assert state.current_good is not None and state.current_good.id == "2026042206"
    assert state.in_progress is not None and state.in_progress.id == "2026042212"
    assert state.in_progress_manifest is not None
    assert state.in_progress_manifest.completed_leads == [0]


def test_finishes_interrupted_rename(tmp_path):
    """If .partial has .complete inside and final dir is absent, we rename it."""
    lay = _layout(tmp_path)
    lay.ensure_roots()
    c = Cycle(2026, 4, 22, 12)
    partial = lay.proc_cycle_dir(c, partial=True)
    partial.mkdir()
    (partial / ".complete").touch()
    (partial / "some_ts").write_text("data")

    state = scan_and_repair(lay)
    assert state.current_good is not None and state.current_good.id == "2026042212"
    assert state.in_progress is None
    assert not partial.exists()
    final = lay.proc_cycle_dir(c, partial=False)
    assert final.is_dir()
    assert (final / ".complete").exists()
    assert (final / "some_ts").exists()


def test_final_dir_without_marker_is_pruned(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    bogus = lay.proc_root / "2026042206"
    bogus.mkdir()
    (bogus / "some_ts").write_text("x")
    # no .complete marker!

    state = scan_and_repair(lay)
    assert state.current_good is None
    assert not bogus.exists()


def test_keeps_newest_partial_deletes_older_ones(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    older = lay.proc_root / "2026042206.partial"
    newer = lay.proc_root / "2026042212.partial"
    older.mkdir()
    newer.mkdir()

    state = scan_and_repair(lay)
    assert state.in_progress is not None and state.in_progress.id == "2026042212"
    assert not older.exists()
    assert newer.exists()


def test_prunes_orphan_raw_dirs(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    # good cycle exists in proc
    (lay.proc_root / "2026042212").mkdir()
    (lay.proc_root / "2026042212" / ".complete").touch()
    # raw dirs: matching keep, plus an orphan
    (lay.raw_root / "2026042212").mkdir()
    (lay.raw_root / "2026042100").mkdir()

    scan_and_repair(lay)
    assert (lay.raw_root / "2026042212").exists()
    assert not (lay.raw_root / "2026042100").exists()
