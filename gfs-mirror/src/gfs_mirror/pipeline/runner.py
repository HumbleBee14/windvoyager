"""CycleRunner: orchestrate downloading + processing every lead for one cycle.

Shape:

    [leads to fetch] ──▶ download_queue ──▶ [N download workers]
                                                   │
                                                   ▼
                                           process_queue
                                                   │
                                                   ▼
                                         [M process workers via ProcessPool]
                                                   │
                                                   ▼
                                        update manifest, on corruption
                                        re-enqueue back to download_queue

Terminates when every lead has either reached DONE (processed file written +
manifest updated) or STUCK (exceeded max retries). If everything DONE, we
publish via retainer and return True. If anything STUCK, we return False so
the caller (Watcher) can move on to the next cycle.
"""

from __future__ import annotations

import asyncio
import logging
import time
from concurrent.futures import Executor, ProcessPoolExecutor
from contextlib import AbstractContextManager, contextmanager
from dataclasses import dataclass
from typing import Callable, Iterator

from gfs_mirror.config import Config
from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.pipeline.download import (
    DownloadNotYetAvailable,
    backoff_seconds,
    download_one,
)
from gfs_mirror.pipeline.process import run_process_file
from gfs_mirror.s3.client import GfsS3Client
from gfs_mirror.storage import manifest as mf
from gfs_mirror.storage import retainer
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage.manifest import Manifest

log = logging.getLogger(__name__)

# Sentinel used to signal "no more work" on the queues.
_STOP = object()


@dataclass
class CycleResult:
    cycle: Cycle
    completed: bool
    completed_leads: list[int]
    stuck_leads: list[int]


@contextmanager
def _default_pool(workers: int) -> Iterator[Executor]:
    with ProcessPoolExecutor(max_workers=workers) as pool:
        yield pool


async def run_cycle(
    cycle: Cycle,
    config: Config,
    s3: GfsS3Client,
    layout: StorageLayout,
    process_fn: Callable[[str, str], bool],
    *,
    resume_manifest: Manifest | None = None,
    pool_factory: Callable[[int], AbstractContextManager[Executor]] | None = None,
) -> CycleResult:
    """Drive one cycle to completion (or stuck). Idempotent; safe to re-run on resume."""
    layout.ensure_roots()
    layout.proc_cycle_dir(cycle, partial=True).mkdir(parents=True, exist_ok=True)
    layout.raw_cycle_dir(cycle).mkdir(parents=True, exist_ok=True)

    manifest = resume_manifest or mf.new_manifest(
        cycle.id, config.schedule_spec, config.grid, config.lead_hours
    )
    _persist(layout, cycle, manifest)

    remaining = manifest.remaining_leads()
    if not remaining:
        log.info("cycle %s: no remaining leads, publishing", cycle.id)
        return _finalize(cycle, layout, manifest)

    stuck: set[int] = set()
    lock = asyncio.Lock()  # guards manifest + stuck mutations

    # Bounded queues for backpressure.
    dl_q: asyncio.Queue = asyncio.Queue(maxsize=config.download_concurrency * 2)
    pr_q: asyncio.Queue = asyncio.Queue(maxsize=config.process_concurrency * 2)
    for h in remaining:
        dl_q.put_nowait(h)

    deadline = time.monotonic() + config.cycle_timeout_hours * 3600
    pool_cm = (pool_factory or _default_pool)(config.process_concurrency)

    with pool_cm as pool:
        download_tasks = [
            asyncio.create_task(
                _download_worker(i, dl_q, pr_q, s3, layout, cycle, config, manifest, stuck, lock)
            )
            for i in range(config.download_concurrency)
        ]
        process_tasks = [
            asyncio.create_task(
                _process_worker(
                    i, pr_q, dl_q, pool, process_fn, layout, cycle, config, manifest, stuck, lock
                )
            )
            for i in range(config.process_concurrency)
        ]

        # Wait until every lead is either done or stuck, or we hit the deadline.
        try:
            while True:
                async with lock:
                    done_count = len(manifest.completed_leads)
                    stuck_count = len(stuck)
                if done_count + stuck_count >= len(config.lead_hours):
                    break
                if time.monotonic() > deadline:
                    log.warning("cycle %s: timeout; marking remaining leads stuck", cycle.id)
                    async with lock:
                        done = set(manifest.completed_leads)
                        for h in config.lead_hours:
                            if h not in done:
                                stuck.add(h)
                    break
                await asyncio.sleep(0.5)
        finally:
            # Cancel all workers; they'll raise CancelledError on next await.
            # Simpler and deadlock-free vs. sentinel-via-put on potentially-full queues.
            for t in (*download_tasks, *process_tasks):
                t.cancel()
            await asyncio.gather(*download_tasks, *process_tasks, return_exceptions=True)

    async with lock:
        _persist(layout, cycle, manifest)
        snapshot = (list(manifest.completed_leads), sorted(stuck))

    completed_leads, stuck_leads = snapshot
    if stuck_leads:
        log.warning("cycle %s stuck on leads %s; not publishing", cycle.id, stuck_leads)
        return CycleResult(cycle, False, completed_leads, stuck_leads)

    return _finalize(cycle, layout, manifest)


# ---------- workers ----------


async def _download_worker(
    wid: int,
    dl_q: asyncio.Queue,
    pr_q: asyncio.Queue,
    s3: GfsS3Client,
    layout: StorageLayout,
    cycle: Cycle,
    config: Config,
    manifest: Manifest,
    stuck: set[int],
    lock: asyncio.Lock,
) -> None:
    while True:
        item = await dl_q.get()
        if item is _STOP:
            return
        lead: int = item
        try:
            async with lock:
                if lead in stuck or lead in manifest.completed_leads:
                    continue
            try:
                await download_one(s3, layout, cycle, lead, config.grid)
            except DownloadNotYetAvailable:
                async with lock:
                    attempts = manifest.bump_attempt(lead)
                    _maybe_stuck(lead, attempts, config, stuck, manifest)
                if lead not in stuck:
                    await asyncio.sleep(backoff_seconds(attempts))
                    await dl_q.put(lead)
                continue
            except Exception as e:
                log.warning("cycle %s f%03d: download error %s", cycle.id, lead, e)
                async with lock:
                    attempts = manifest.bump_attempt(lead)
                    _maybe_stuck(lead, attempts, config, stuck, manifest)
                if lead not in stuck:
                    await asyncio.sleep(backoff_seconds(attempts))
                    await dl_q.put(lead)
                continue
            await pr_q.put(lead)
        finally:
            dl_q.task_done()


async def _process_worker(
    wid: int,
    pr_q: asyncio.Queue,
    dl_q: asyncio.Queue,
    pool: ProcessPoolExecutor,
    process_fn: Callable[[str, str], bool],
    layout: StorageLayout,
    cycle: Cycle,
    config: Config,
    manifest: Manifest,
    stuck: set[int],
    lock: asyncio.Lock,
) -> None:
    while True:
        item = await pr_q.get()
        if item is _STOP:
            return
        lead: int = item
        try:
            raw = layout.raw_file(cycle, lead)
            proc = layout.proc_file(cycle, lead, partial=True)
            ok = await run_process_file(pool, process_fn, raw, proc)
            if ok:
                async with lock:
                    manifest.mark_done(lead)
                    _persist(layout, cycle, manifest)
                raw.unlink(missing_ok=True)
            else:
                # Corrupt: drop raw and requeue for another download attempt.
                log.info("cycle %s f%03d: corrupt, will retry", cycle.id, lead)
                raw.unlink(missing_ok=True)
                proc.unlink(missing_ok=True)
                async with lock:
                    attempts = manifest.bump_attempt(lead)
                    _maybe_stuck(lead, attempts, config, stuck, manifest)
                if lead not in stuck:
                    await asyncio.sleep(backoff_seconds(attempts))
                    await dl_q.put(lead)
        finally:
            pr_q.task_done()


# ---------- helpers ----------


def _maybe_stuck(
    lead: int, attempts: int, config: Config, stuck: set[int], manifest: Manifest
) -> None:
    if attempts > config.max_file_retries:
        log.warning("lead f%03d exceeded %d retries; stuck", lead, config.max_file_retries)
        stuck.add(lead)


def _persist(layout: StorageLayout, cycle: Cycle, manifest: Manifest) -> None:
    mf.write(layout.manifest_path(cycle, partial=True), manifest)


def _finalize(cycle: Cycle, layout: StorageLayout, manifest: Manifest) -> CycleResult:
    retainer.publish(layout, cycle)
    retainer.prune_except(layout, cycle)
    return CycleResult(cycle, True, list(manifest.completed_leads), [])
