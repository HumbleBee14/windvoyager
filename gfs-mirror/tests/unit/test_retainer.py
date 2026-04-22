from __future__ import annotations

from pathlib import Path

import pytest

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage import retainer


def _layout(tmp_path: Path) -> StorageLayout:
    lay = StorageLayout(raw_root=tmp_path / "raw", proc_root=tmp_path / "proc")
    lay.ensure_roots()
    return lay


def _make_partial(lay: StorageLayout, cycle: Cycle, *, leads: list[int] = ()) -> None:
    d = lay.proc_cycle_dir(cycle, partial=True)
    d.mkdir(parents=True, exist_ok=True)
    for h in leads:
        lay.proc_file(cycle, h, partial=True).write_text("x")


def test_publish_renames_partial_and_writes_marker(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    _make_partial(lay, c, leads=[0, 3])

    retainer.publish(lay, c)

    final = lay.proc_cycle_dir(c, partial=False)
    assert final.is_dir()
    assert (final / ".complete").exists()
    assert not lay.proc_cycle_dir(c, partial=True).exists()
    # data files survived the rename
    assert (final / str(c.forecast_timestamp(0))).exists()


def test_publish_refuses_if_final_exists(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    _make_partial(lay, c)
    lay.proc_cycle_dir(c, partial=False).mkdir()

    with pytest.raises(FileExistsError):
        retainer.publish(lay, c)


def test_publish_refuses_if_partial_missing(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    with pytest.raises(FileNotFoundError):
        retainer.publish(lay, c)


def test_prune_except_wipes_everything_else(tmp_path):
    lay = _layout(tmp_path)
    keep = Cycle(2026, 4, 22, 12)
    old = Cycle(2026, 4, 22, 6)
    stuck = Cycle(2026, 4, 22, 18)

    # Set up: old complete, keep complete, stuck still partial, all have raw dirs too.
    for c in (old, keep):
        d = lay.proc_cycle_dir(c, partial=False)
        d.mkdir()
        (d / ".complete").touch()
    lay.proc_cycle_dir(stuck, partial=True).mkdir()
    for c in (old, keep, stuck):
        lay.raw_cycle_dir(c).mkdir()

    retainer.prune_except(lay, keep)

    assert lay.proc_cycle_dir(keep, partial=False).exists()
    assert not lay.proc_cycle_dir(old, partial=False).exists()
    assert not lay.proc_cycle_dir(stuck, partial=True).exists()
    # Post-publish cleanup wipes ALL raw dirs — including the kept cycle's own,
    # since processing has already consumed its files (task spec: "delete all
    # files after the cycle is complete").
    assert not lay.raw_cycle_dir(keep).exists()
    assert not lay.raw_cycle_dir(old).exists()
    assert not lay.raw_cycle_dir(stuck).exists()


def test_find_current_good_returns_newest_complete(tmp_path):
    lay = _layout(tmp_path)
    for cid in ("2026042200", "2026042206", "2026042212"):
        d = lay.proc_root / cid
        d.mkdir()
        (d / ".complete").touch()
    # missing marker — should be ignored
    (lay.proc_root / "2026042218").mkdir()
    # partial — ignored
    (lay.proc_root / "2026042300.partial").mkdir()

    assert retainer.find_current_good(lay) == "2026042212"


def test_find_current_good_returns_none_when_empty(tmp_path):
    lay = _layout(tmp_path)
    assert retainer.find_current_good(lay) is None
