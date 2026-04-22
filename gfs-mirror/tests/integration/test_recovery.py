"""Crash recovery: stop mid-cycle, restart, confirm we resume and don't redo work."""

from __future__ import annotations

import pytest

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.pipeline.runner import run_cycle
from gfs_mirror.storage import manifest as mf
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage.recovery import scan_and_repair

from tests.conftest import FakeS3, always_ok

pytestmark = pytest.mark.asyncio


async def test_resume_from_partial_manifest_skips_done_leads(
    tiny_config, fake_s3: FakeS3, thread_pool_factory
):
    """Pre-populate a partial dir with 1 lead done; runner finishes the other 2."""
    cycle = Cycle(2026, 4, 22, 12)
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)
    layout.ensure_roots()
    layout.proc_cycle_dir(cycle, partial=True).mkdir(parents=True)

    # Seed: lead 0 already done (file + manifest entry).
    proc_file = layout.proc_file(cycle, 0, partial=True)
    proc_file.write_text("pretend this was processed earlier")
    seed = mf.new_manifest(
        cycle.id, tiny_config.schedule_spec, tiny_config.grid, tiny_config.lead_hours
    )
    seed.mark_done(0)
    mf.write(layout.manifest_path(cycle, partial=True), seed)

    # Preload S3 only for remaining leads (3, 6) — the runner should NOT re-download 0.
    fake_s3.preload(cycle.s3_key(3, tiny_config.grid))
    fake_s3.preload(cycle.s3_key(6, tiny_config.grid))

    recovery = scan_and_repair(layout)
    assert recovery.in_progress is not None and recovery.in_progress.id == cycle.id

    result = await run_cycle(
        cycle,
        tiny_config,
        fake_s3,
        layout,
        always_ok,
        pool_factory=thread_pool_factory,
        resume_manifest=recovery.in_progress_manifest,
    )

    assert result.completed
    assert sorted(result.completed_leads) == [0, 3, 6]
    # Lead 0 was NOT re-downloaded.
    assert cycle.s3_key(0, tiny_config.grid) not in fake_s3.download_calls
    # Leads 3 and 6 were.
    assert cycle.s3_key(3, tiny_config.grid) in fake_s3.download_calls
    assert cycle.s3_key(6, tiny_config.grid) in fake_s3.download_calls


async def test_scan_repairs_interrupted_rename(tiny_config):
    """Simulate a crash after .complete was written but before rename. scan_and_repair fixes it."""
    cycle = Cycle(2026, 4, 22, 12)
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)
    layout.ensure_roots()
    partial = layout.proc_cycle_dir(cycle, partial=True)
    partial.mkdir(parents=True)
    (partial / ".complete").touch()
    (partial / "some_ts").write_text("data")

    state = scan_and_repair(layout)
    assert state.current_good is not None and state.current_good.id == cycle.id
    assert not partial.exists()
    assert (layout.proc_cycle_dir(cycle, partial=False) / "some_ts").exists()
