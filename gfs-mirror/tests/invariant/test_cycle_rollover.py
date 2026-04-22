"""PLAN §7 invariant tests.

The contract: after the first successful cycle, WBPROC always has exactly ONE
complete-marked directory, even across rollovers, stuck cycles, and crashes.
"""

from __future__ import annotations

import pytest

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.pipeline.runner import run_cycle
from gfs_mirror.storage import retainer
from gfs_mirror.storage.layout import COMPLETE_MARKER, StorageLayout

from tests.conftest import FakeS3, always_ok, make_flaky_process_fn

pytestmark = pytest.mark.asyncio


def _count_complete(layout: StorageLayout) -> int:
    return sum(
        1
        for p in layout.proc_root.iterdir()
        if p.is_dir() and not p.name.endswith(".partial") and (p / COMPLETE_MARKER).exists()
    )


async def test_n_then_n_plus_1_swaps_cleanly(tiny_config, fake_s3: FakeS3, thread_pool_factory):
    """Cycle N completes, cycle N+1 completes — final state: only N+1 remains."""
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)

    n = Cycle(2026, 4, 22, 6)
    n_plus_1 = n.next()

    fake_s3.preload_cycle(n, tiny_config.lead_hours, tiny_config.grid)
    fake_s3.preload_cycle(n_plus_1, tiny_config.lead_hours, tiny_config.grid)

    r_n = await run_cycle(
        n, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory
    )
    assert r_n.completed
    assert _count_complete(layout) == 1
    assert retainer.find_current_good(layout) == n.id

    r_next = await run_cycle(
        n_plus_1, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory
    )
    assert r_next.completed
    # Invariant: exactly one complete cycle on disk.
    assert _count_complete(layout) == 1
    assert retainer.find_current_good(layout) == n_plus_1.id
    # Old cycle pruned.
    assert not layout.proc_cycle_dir(n, partial=False).exists()


async def test_skip_broken_n_plus_1_preserves_n_until_n_plus_2_wins(
    tiny_config, fake_s3: FakeS3, thread_pool_factory
):
    """N completes; N+1 gets stuck; N+2 completes.

    Invariant checks at every step:
      - After N:                         N is current, count == 1
      - After N+1 stuck:                 N is still current, count == 1 (N+1.partial may linger)
      - After N+2:                       N+2 is current, count == 1; N and N+1.partial both gone.
    """
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)

    n = Cycle(2026, 4, 22, 6)
    n_plus_1 = n.next()
    n_plus_2 = n_plus_1.next()

    for c in (n, n_plus_1, n_plus_2):
        fake_s3.preload_cycle(c, tiny_config.lead_hours, tiny_config.grid)

    r_n = await run_cycle(
        n, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory
    )
    assert r_n.completed
    assert retainer.find_current_good(layout) == n.id
    assert _count_complete(layout) == 1

    # N+1: process_fn permanently corrupts lead 3 -> cycle stuck.
    flaky = make_flaky_process_fn({3: 1000})
    r_stuck = await run_cycle(
        n_plus_1, tiny_config, fake_s3, layout, flaky, pool_factory=thread_pool_factory
    )
    assert not r_stuck.completed
    # INVARIANT: N is still the current good; exactly one complete cycle.
    assert retainer.find_current_good(layout) == n.id
    assert _count_complete(layout) == 1
    # N+1's partial dir still there, but it's not "complete" so it doesn't count.
    assert layout.proc_cycle_dir(n_plus_1, partial=True).exists()

    # N+2 succeeds cleanly.
    r_win = await run_cycle(
        n_plus_2, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory
    )
    assert r_win.completed
    # INVARIANT: still exactly one complete cycle; it's N+2 now.
    assert _count_complete(layout) == 1
    assert retainer.find_current_good(layout) == n_plus_2.id
    # Old N is gone AND N+1's stuck partial was pruned in the post-publish sweep.
    assert not layout.proc_cycle_dir(n, partial=False).exists()
    assert not layout.proc_cycle_dir(n_plus_1, partial=True).exists()


async def test_never_empty_across_full_sequence(
    tiny_config, fake_s3: FakeS3, thread_pool_factory
):
    """After the first successful cycle, the 'current good' pointer never goes back to None,
    even if later cycles fail."""
    layout = StorageLayout(raw_root=tiny_config.raw_dir, proc_root=tiny_config.proc_dir)

    c0 = Cycle(2026, 4, 22, 0)
    c1 = c0.next()
    c2 = c1.next()
    c3 = c2.next()

    for c in (c0, c1, c2, c3):
        fake_s3.preload_cycle(c, tiny_config.lead_hours, tiny_config.grid)

    # c0 good
    await run_cycle(c0, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory)
    assert retainer.find_current_good(layout) == c0.id

    # c1 good
    await run_cycle(c1, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory)
    assert retainer.find_current_good(layout) == c1.id

    # c2 stuck
    await run_cycle(
        c2,
        tiny_config,
        fake_s3,
        layout,
        make_flaky_process_fn({3: 1000}),
        pool_factory=thread_pool_factory,
    )
    # c1 still holds the line
    assert retainer.find_current_good(layout) == c1.id

    # c3 good — jumps forward
    await run_cycle(c3, tiny_config, fake_s3, layout, always_ok, pool_factory=thread_pool_factory)
    assert retainer.find_current_good(layout) == c3.id
    assert _count_complete(layout) == 1
