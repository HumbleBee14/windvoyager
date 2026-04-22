"""Process-pool wrapper for the blocking process_file() call.

process_file is CPU-time-bound (40s sleep in the stub; real GRIB processing
would be CPU-bound). We run it in a ProcessPoolExecutor and await from asyncio
via run_in_executor — that way many files can process in parallel without
blocking the event loop that's managing downloads.

process_file returning False signals "GRIB corrupt" per task spec. Callers must
delete the raw file and re-download; this module just forwards the boolean.
"""

from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Callable

log = logging.getLogger(__name__)


async def run_process_file(
    pool: ProcessPoolExecutor,
    process_fn: Callable[[str, str], bool],
    raw_path: Path,
    out_path: Path,
) -> bool:
    """Await process_fn(raw, out) in the given pool. Returns its bool verdict."""
    loop = asyncio.get_running_loop()
    try:
        return await loop.run_in_executor(
            pool, process_fn, str(raw_path), str(out_path)
        )
    except Exception as e:
        log.warning("process_file crashed on %s: %s", raw_path, e)
        return False
