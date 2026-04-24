"""End-to-end smoke test: real NOAA S3 download + fake-fast process_fn.

Picks a recent published cycle and runs the full pipeline over a 3-lead
representative slice of the default schedule:
    f000   — start of the 3-hourly bucket
    f024   — middle of the 3-hourly bucket
    f096   — middle of the 6-hourly bucket

Before the pipeline runs, each raw GRIB is also downloaded to
`preserved-raw/` so you can inspect what NOAA actually serves — the
pipeline itself prunes its own raw copies after publish (per task spec).

Proves: S3 anonymous auth, aioboto3 download path, runner orchestration
across both cadence buckets, manifest persistence, atomic publish, post-
publish prune. What it does NOT prove (covered by fake-S3 tests):
corruption-retry, cycle-stuck skip, cycle-rollover invariant.

Usage:
    uv run python scripts/smoke.py
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path

# Make `gfs_mirror` importable when run directly from the repo root.
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from gfs_mirror.config import Config
from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.logging_ import setup_logging
from gfs_mirror.pipeline.runner import run_cycle
from gfs_mirror.s3.client import AioBotoS3Client
from gfs_mirror.storage.layout import StorageLayout


def fast_process(input_grib: str, output_proc: str) -> bool:
    """Real file reads; no 40s sleep. Writes a sentinel referencing the input size."""
    p = Path(input_grib)
    size = p.stat().st_size
    Path(output_proc).write_text(f"processed {p.name} ({size} bytes)\n")
    return True


async def pick_recent_cycle(s3: AioBotoS3Client, grid: str) -> Cycle:
    """Walk back from 'now - 4h' in 6h steps until we find a cycle whose f000 exists."""
    candidate = Cycle.from_datetime(datetime.now(UTC) - timedelta(hours=4))
    for _ in range(8):
        key = candidate.s3_key(0, grid)
        if await s3.object_exists(key):
            return candidate
        candidate = candidate.previous()
    raise RuntimeError("could not find a published cycle in the last 48h")


async def main() -> int:
    setup_logging("INFO")
    log = logging.getLogger("smoke")

    # Persistent local workdir so you can inspect the downloaded + processed files.
    workdir = Path(__file__).parent.parent / "smoke-output"
    if workdir.exists():
        shutil.rmtree(workdir)
    raw = workdir / "raw"
    proc = workdir / "proc"
    preserved_raw = workdir / "preserved-raw"
    workdir.mkdir(parents=True)
    preserved_raw.mkdir()
    log.info("smoke test workdir: %s", workdir)

    # 3-lead representative slice: spans both cadence buckets of the default
    # schedule (3h first 48h, 6h to 192h). Custom schedule pins exactly which
    # leads we want — parse_schedule step=1 with those bounds picks 3 points.
    env = {
        "WBRAW": str(raw),
        "WBPROC": str(proc),
        "GFSM_GRID": "1p00",
        "GFSM_SCHEDULE": "0-0:1,24-24:1,96-96:1",  # -> [0, 24, 96]
        "GFSM_DOWNLOAD_CONCURRENCY": "3",
        "GFSM_PROCESS_CONCURRENCY": "3",
        "GFSM_MAX_FILE_RETRIES": "3",
        "GFSM_CYCLE_TIMEOUT_HOURS": "1",
        "GFSM_LOG_LEVEL": "INFO",
    }
    cfg = Config.from_env(env)
    layout = StorageLayout(raw_root=cfg.raw_dir, proc_root=cfg.proc_dir)
    s3 = AioBotoS3Client()

    cycle = await pick_recent_cycle(s3, cfg.grid)
    log.info("picked cycle %s (leads=%s)", cycle.id, cfg.lead_hours)

    # Preserve every raw GRIB outside the pipeline BEFORE running it, so you can
    # inspect what NOAA actually serves. The pipeline prunes its own raw copies
    # after publishing (per task spec: "delete all files after cycle is complete").
    log.info("preserving %d raw files for inspection...", len(cfg.lead_hours))
    for h in cfg.lead_hours:
        key = cycle.s3_key(h, cfg.grid)
        dest = preserved_raw / f"gfs.t{cycle.hour_str}z.pgrb2.{cfg.grid}.f{h:03d}.grib2"
        size = await s3.download(key, dest)
        log.info("  preserved f%03d  %d bytes  -> %s", h, size, dest.name)

    t0 = time.monotonic()
    result = await run_cycle(cycle, cfg, s3, layout, fast_process)
    elapsed = time.monotonic() - t0
    log.info("run_cycle finished in %.1fs: %s", elapsed, result)

    # Verify on-disk state.
    final = layout.proc_cycle_dir(cycle, partial=False)
    marker = final / ".complete"
    assert result.completed, f"cycle did not complete: {result}"
    assert final.is_dir(), f"final dir missing: {final}"
    assert marker.exists(), f".complete marker missing at {marker}"
    for h in cfg.lead_hours:
        f = final / str(cycle.forecast_timestamp(h))
        assert f.exists(), f"expected output {f} missing"
        log.info("OK  %s  (%d bytes)", f, f.stat().st_size)
    assert not layout.proc_cycle_dir(cycle, partial=True).exists(), "partial dir leaked"
    assert not (cfg.raw_dir / cycle.id).exists(), "raw dir not pruned"

    log.info("SMOKE PASS: cycle %s fully downloaded + processed + published", cycle.id)
    log.info("output left at %s — inspect with `ls -la %s`", workdir, workdir)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
