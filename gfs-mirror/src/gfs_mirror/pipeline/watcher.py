"""CycleWatcher: long-running loop that keeps the mirror up to date.

Responsibilities:
  1. Compute the expected newest cycle from wall-clock time minus publish lag.
  2. Wait (poll f000) until that cycle appears on S3.
  3. Hand off to the runner.
  4. On success → done, wait for the next cycle.
  5. On stuck → log + move on to the next cycle (previous good one stays live).

We ONLY advance to the next cycle when:
  - the current target cycle completes, OR
  - the next cycle becomes available on S3 (i.e., we were too slow / stuck).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Callable

from gfs_mirror.config import Config
from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.pipeline.runner import CycleResult, run_cycle
from gfs_mirror.s3.client import GfsS3Client
from gfs_mirror.storage import retainer
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage.manifest import Manifest

log = logging.getLogger(__name__)


def latest_published_cycle_guess(now: datetime, publish_lag_minutes: int) -> Cycle:
    """Newest cycle we'd expect to be available based on wall-clock + lag."""
    effective = now - timedelta(minutes=publish_lag_minutes)
    return Cycle.from_datetime(effective)


class CycleWatcher:
    def __init__(
        self,
        config: Config,
        s3: GfsS3Client,
        layout: StorageLayout,
        process_fn: Callable[[str, str], bool],
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.config = config
        self.s3 = s3
        self.layout = layout
        self.process_fn = process_fn
        self.clock = clock or (lambda: datetime.now(UTC))

    async def run_forever(
        self,
        in_progress: Cycle | None = None,
        in_progress_manifest: Manifest | None = None,
    ) -> None:
        """Main loop — never returns under normal operation. Cancel to stop."""
        # Resume whatever was in-flight before this process started, if anything.
        if in_progress is not None:
            await self._run_one(in_progress, resume=in_progress_manifest)

        while True:
            target = latest_published_cycle_guess(self.clock(), self.config.publish_lag_minutes)
            current_good = retainer.find_current_good(self.layout)
            if current_good is not None and target.id <= current_good:
                # Nothing newer expected yet; sleep and recheck.
                await asyncio.sleep(self.config.poll_interval_sec)
                continue

            await self._await_cycle_on_s3(target)
            await self._run_one(target)

    async def _await_cycle_on_s3(self, cycle: Cycle) -> None:
        """Block (polling) until this cycle's f000 appears on S3."""
        key = cycle.s3_key(0, self.config.grid)
        while True:
            if await self.s3.object_exists(key):
                log.info("cycle %s is available on S3", cycle.id)
                return
            log.debug("cycle %s f000 not yet on S3; sleeping", cycle.id)
            await asyncio.sleep(self.config.poll_interval_sec)

    async def _run_one(self, cycle: Cycle, resume: Manifest | None = None) -> CycleResult:
        log.info("starting runner for cycle %s", cycle.id)
        result = await run_cycle(
            cycle,
            self.config,
            self.s3,
            self.layout,
            self.process_fn,
            resume_manifest=resume,
        )
        if result.completed:
            log.info("cycle %s published (%d leads)", cycle.id, len(result.completed_leads))
        else:
            log.warning(
                "cycle %s stuck; leaving previous good cycle in place. stuck=%s",
                cycle.id,
                result.stuck_leads,
            )
        return result
