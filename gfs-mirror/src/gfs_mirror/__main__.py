"""Entrypoint: `python -m gfs_mirror`. Wires config, logging, recovery, watcher."""

from __future__ import annotations

import asyncio
import logging
import signal
import sys

from gfs_mirror.config import Config
from gfs_mirror.dotenv import load_dotenv
from gfs_mirror.logging_ import setup_logging
from gfs_mirror.pipeline.watcher import CycleWatcher
from gfs_mirror.provided import process_file
from gfs_mirror.s3.client import AioBotoS3Client
from gfs_mirror.storage.layout import StorageLayout
from gfs_mirror.storage.recovery import scan_and_repair


async def _amain() -> int:
    dotenv_path = load_dotenv()
    cfg = Config.from_env()
    setup_logging(cfg.log_level)
    log = logging.getLogger("gfs_mirror")
    if dotenv_path is not None:
        log.info("loaded config from %s", dotenv_path)
    log.info(
        "starting gfs-mirror service: grid=%s schedule=%s (%d leads) raw=%s proc=%s",
        cfg.grid,
        cfg.schedule_spec,
        len(cfg.lead_hours),
        cfg.raw_dir,
        cfg.proc_dir,
    )

    layout = StorageLayout(raw_root=cfg.raw_dir, proc_root=cfg.proc_dir)
    # Check Previous Session for Recovery
    recovery = scan_and_repair(layout)
    if recovery.current_good is not None:
        log.info("recovery: current good cycle = %s", recovery.current_good.id)
    if recovery.in_progress is not None:
        log.info(
            "recovery: resuming in-progress cycle = %s (%d leads done)",
            recovery.in_progress.id,
            len(recovery.in_progress_manifest.completed_leads)
            if recovery.in_progress_manifest
            else 0,
        )

    s3 = AioBotoS3Client()
    watcher = CycleWatcher(cfg, s3, layout, process_file)

    stop = asyncio.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        asyncio.get_running_loop().add_signal_handler(sig, stop.set)

    watcher_task = asyncio.create_task(
        watcher.run_forever(
            in_progress=recovery.in_progress,
            in_progress_manifest=recovery.in_progress_manifest,
        )
    )
    stop_task = asyncio.create_task(stop.wait())

    done, _ = await asyncio.wait(
        {watcher_task, stop_task}, return_when=asyncio.FIRST_COMPLETED
    )

    if stop_task in done:
        log.info("shutdown requested")
        watcher_task.cancel()
        try:
            await watcher_task
        except asyncio.CancelledError:
            pass

    return 0


def main() -> int:
    try:
        return asyncio.run(_amain())
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
