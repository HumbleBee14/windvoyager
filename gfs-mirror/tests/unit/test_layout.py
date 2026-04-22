from __future__ import annotations

from pathlib import Path

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.storage.layout import StorageLayout


def _layout(tmp_path: Path) -> StorageLayout:
    return StorageLayout(raw_root=tmp_path / "raw", proc_root=tmp_path / "proc")


def test_ensure_roots_creates_dirs(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    assert lay.raw_root.is_dir()
    assert lay.proc_root.is_dir()


def test_raw_paths_nested_by_date(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    assert lay.raw_cycle_dir(c) == tmp_path / "raw" / "20260422" / "12"
    assert lay.raw_file(c, 6) == tmp_path / "raw" / "20260422" / "12" / "f006.grib2"
    assert lay.raw_file(c, 192) == tmp_path / "raw" / "20260422" / "12" / "f192.grib2"


def test_proc_paths_partial_and_final(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    assert lay.proc_cycle_dir(c, partial=True) == tmp_path / "proc" / "20260422" / "12.partial"
    assert lay.proc_cycle_dir(c, partial=False) == tmp_path / "proc" / "20260422" / "12"


def test_proc_file_is_forecast_timestamp(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    p = lay.proc_file(c, 6, partial=True)
    assert p.parent.name == "12.partial"
    assert p.parent.parent.name == "20260422"
    assert p.name == str(c.forecast_timestamp(6))


def test_marker_and_manifest_paths(tmp_path):
    lay = _layout(tmp_path)
    c = Cycle(2026, 4, 22, 12)
    assert lay.complete_marker(c, partial=True).name == ".complete"
    assert lay.manifest_path(c, partial=True).name == ".manifest.json"


def test_iter_proc_entries_separates_partial(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    (lay.proc_root / "20260422" / "00").mkdir(parents=True)
    (lay.proc_root / "20260422" / "06.partial").mkdir(parents=True)
    (lay.proc_root / "20260422" / "12").mkdir(parents=True)
    (lay.proc_root / "some-file.txt").write_text("")  # ignored (not a dir)
    (lay.proc_root / "notadatefolder").mkdir()  # ignored (not 8 digits)
    entries = lay.iter_proc_entries()
    assert entries == [
        ("2026042200", False),
        ("2026042206", True),
        ("2026042212", False),
    ]


def test_iter_proc_entries_across_dates(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    (lay.proc_root / "20260422" / "18").mkdir(parents=True)
    (lay.proc_root / "20260423" / "00").mkdir(parents=True)
    entries = lay.iter_proc_entries()
    assert entries == [("2026042218", False), ("2026042300", False)]


def test_iter_proc_entries_empty_when_no_proc_root(tmp_path):
    lay = _layout(tmp_path)
    assert lay.iter_proc_entries() == []


def test_iter_raw_cycle_ids(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    (lay.raw_root / "20260422" / "00").mkdir(parents=True)
    (lay.raw_root / "20260422" / "12").mkdir(parents=True)
    assert lay.iter_raw_cycle_ids() == ["2026042200", "2026042212"]


def test_iter_ignores_invalid_hour_names(tmp_path):
    lay = _layout(tmp_path)
    lay.ensure_roots()
    (lay.proc_root / "20260422" / "13").mkdir(parents=True)  # invalid hour
    (lay.proc_root / "20260422" / "12").mkdir(parents=True)  # valid
    entries = lay.iter_proc_entries()
    assert entries == [("2026042212", False)]
