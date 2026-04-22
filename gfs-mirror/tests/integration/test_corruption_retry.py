"""Corruption retry: process_file returns False first N times, then succeeds."""

from __future__ import annotations

import pytest

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.pipeline.runner import run_cycle
from gfs_mirror.storage.layout import StorageLayout

from tests.conftest import FakeS3, always_ok, make_flaky_process_fn

pytestmark = pytest.mark.asyncio


async def test_cycle_completes_after_transient_corruption(
    tiny_config, fake_s3: FakeS3, thread_pool_factory
):
    """First 2 process attempts for f003 fail; 3rd succeeds. Cycle still publishes."""
    cycle = Cycle(2026, 4, 22, 12)
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)
    fake_s3.preload_cycle(cycle, tiny_config.lead_hours, tiny_config.grid)

    flaky = make_flaky_process_fn({3: 2})  # 2 fails on lead 3, then ok
    result = await run_cycle(
        cycle, tiny_config, fake_s3, layout, flaky, pool_factory=thread_pool_factory
    )

    assert result.completed
    assert result.stuck_leads == []
    # Lead 3 was downloaded multiple times (each retry)
    f003_key = cycle.s3_key(3, tiny_config.grid)
    assert fake_s3.download_calls.count(f003_key) >= 3


async def test_cycle_stuck_when_lead_exceeds_retry_cap(
    tiny_config, fake_s3: FakeS3, thread_pool_factory
):
    """Lead 6 corrupts forever; runner eventually gives up, cycle is stuck."""
    cycle = Cycle(2026, 4, 22, 12)
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)
    fake_s3.preload_cycle(cycle, tiny_config.lead_hours, tiny_config.grid)

    # tiny_config has max_file_retries=5; make lead 6 fail > 5 times.
    flaky = make_flaky_process_fn({6: 100})
    result = await run_cycle(
        cycle, tiny_config, fake_s3, layout, flaky, pool_factory=thread_pool_factory
    )

    assert not result.completed
    assert 6 in result.stuck_leads
    # Other leads still got through.
    assert 0 in result.completed_leads
    assert 3 in result.completed_leads
    # Published dir does NOT exist (we didn't publish a broken cycle).
    assert not layout.proc_cycle_dir(cycle, partial=False).exists()
    # Partial dir still exists (we didn't clean up on stuck).
    assert layout.proc_cycle_dir(cycle, partial=True).exists()


async def test_404_becomes_available_then_succeeds(
    tiny_config, fake_s3: FakeS3, thread_pool_factory, monkeypatch
):
    """Lead 3's key is 404 for the first 2 downloads, then becomes available."""
    cycle = Cycle(2026, 4, 22, 12)
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)

    for h in (0, 6):
        fake_s3.preload(cycle.s3_key(h, tiny_config.grid))
    # Lead 3 starts missing; flip it available after 2 download attempts.
    key3 = cycle.s3_key(3, tiny_config.grid)

    orig_download = fake_s3.download

    async def patched_download(key, dest):
        if key == key3 and fake_s3.download_calls.count(key) < 2:
            fake_s3.download_calls.append(key)
            from gfs_mirror.s3.client import ObjectNotFound
            raise ObjectNotFound(key)
        if key == key3 and not fake_s3.objects.get(key):
            fake_s3.preload(key)
        return await orig_download(key, dest)

    monkeypatch.setattr(fake_s3, "download", patched_download)

    result = await run_cycle(
        cycle, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory
    )
    assert result.completed
    assert result.stuck_leads == []
