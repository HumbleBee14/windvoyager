"""End-to-end smoke test: real NOAA S3 download + fake-fast process_fn.

Picks a recent published cycle, runs ONE cycle with 2 lead hours through the
real runner (AioBotoS3Client + StorageLayout + ProcessPoolExecutor), and
verifies the on-disk layout at the end.

Proves: S3 anonymous auth, aioboto3 download path, runner orchestration,
manifest persistence, publish + prune, atomicity markers. What it does NOT
prove (by design for a quick smoke): corruption-retry, cycle-stuck skip,
cycle-rollover invariant. Those are covered by the fake-S3 integration tests.

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
    # Name is dot-free so Finder / IDE trees show it.
    workdir = Path(__file__).parent.parent / "smoke-output"
    if workdir.exists():
        shutil.rmtree(workdir)
    raw = workdir / "raw"
    proc = workdir / "proc"
    preserved_raw_dir = workdir / "preserved-raw-sample"
    workdir.mkdir(parents=True)
    preserved_raw_dir.mkdir()
    log.info("smoke test workdir: %s", workdir)

    # Build a Config directly (no env) with a 2-lead schedule and 1p00 grid.
    env = {
        "WBRAW": str(raw),
        "WBPROC": str(proc),
        "GFSM_GRID": "1p00",
        "GFSM_SCHEDULE": "0-3:3",  # 2 leads: 0 and 3
        "GFSM_DOWNLOAD_CONCURRENCY": "2",
        "GFSM_PROCESS_CONCURRENCY": "2",
        "GFSM_MAX_FILE_RETRIES": "3",
        "GFSM_CYCLE_TIMEOUT_HOURS": "1",
        "GFSM_LOG_LEVEL": "INFO",
    }
    cfg = Config.from_env(env)
    layout = StorageLayout(raw_root=cfg.raw_dir, proc_root=cfg.proc_dir)
    s3 = AioBotoS3Client()

    cycle = await pick_recent_cycle(s3, cfg.grid)
    log.info("picked cycle %s (leads=%s)", cycle.id, cfg.lead_hours)

    # Preserve one raw GRIB2 outside the pipeline so the user can see what NOAA
    # actually serves. The pipeline will delete its own copies after publishing.
    sample_key = cycle.s3_key(0, cfg.grid)
    sample_dest = preserved_raw_dir / f"gfs.t{cycle.hour_str}z.pgrb2.{cfg.grid}.f000.grib2"
    log.info("preserving sample raw: %s", sample_key)
    sample_size = await s3.download(sample_key, sample_dest)
    log.info("preserved %s (%d bytes)", sample_dest, sample_size)

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
