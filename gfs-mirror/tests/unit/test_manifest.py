from __future__ import annotations

from pathlib import Path

from gfs_mirror.storage import manifest as mf


def test_new_manifest_initial_state():
    m = mf.new_manifest("2026042212", "0-48:3,48-192:6", "1p00", [0, 3, 6])
    assert m.cycle_id == "2026042212"
    assert m.schedule_spec == "0-48:3,48-192:6"
    assert m.grid == "1p00"
    assert m.all_leads == [0, 3, 6]
    assert m.completed_leads == []
    assert m.attempts == {}
    assert m.started_at != ""
    assert not m.is_complete()
    assert m.remaining_leads() == [0, 3, 6]


def test_mark_done_and_is_complete():
    m = mf.new_manifest("c", "s", "1p00", [0, 3, 6])
    m.mark_done(3)
    m.mark_done(0)
    m.mark_done(3)  # idempotent
    assert m.completed_leads == [0, 3]
    assert m.remaining_leads() == [6]
    assert not m.is_complete()
    m.mark_done(6)
    assert m.is_complete()


def test_bump_attempt_is_monotonic():
    m = mf.new_manifest("c", "s", "1p00", [0])
    assert m.bump_attempt(0) == 1
    assert m.bump_attempt(0) == 2
    assert m.bump_attempt(0) == 3
    assert m.attempts[0] == 3


def test_roundtrip_write_read(tmp_path: Path):
    m = mf.new_manifest("2026042212", "0-48:3,48-192:6", "1p00", [0, 3, 6])
    m.mark_done(0)
    m.bump_attempt(3)
    m.bump_attempt(3)

    path = tmp_path / ".manifest.json"
    mf.write(path, m)
    loaded = mf.read(path)

    assert loaded is not None
    assert loaded.cycle_id == m.cycle_id
    assert loaded.all_leads == m.all_leads
    assert loaded.completed_leads == [0]
    assert loaded.attempts == {3: 2}


def test_read_missing_returns_none(tmp_path: Path):
    assert mf.read(tmp_path / "nope.json") is None


def test_read_corrupt_returns_none(tmp_path: Path):
    path = tmp_path / "bad.json"
    path.write_text("{not valid json")
    assert mf.read(path) is None


def test_write_is_atomic_no_partial_on_crash(tmp_path: Path, monkeypatch):
    """If os.replace fails, no partial file should be left at the target path."""
    import os

    m = mf.new_manifest("c", "s", "1p00", [0])
    path = tmp_path / ".manifest.json"

    # First, successful write.
    mf.write(path, m)
    assert path.exists()

    original = os.replace

    def boom(src, dst):
        raise OSError("disk full")

    monkeypatch.setattr(os, "replace", boom)

    m.mark_done(0)
    try:
        mf.write(path, m)
    except OSError:
        pass

    # Original file should still be intact; no .tmp leftovers.
    monkeypatch.setattr(os, "replace", original)
    leftovers = list(tmp_path.glob(".manifest-*.tmp"))
    assert leftovers == []
    loaded = mf.read(path)
    assert loaded is not None
    assert loaded.completed_leads == []  # the failed write didn't overwrite
