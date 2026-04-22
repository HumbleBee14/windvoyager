"""Download worker: fetch one file from S3 to the raw-cycle directory.

Handles "not yet uploaded" as a retryable condition with jittered backoff.
Real S3 errors propagate. Corruption is NOT detected here — that's the
process layer's job (via process_file returning False).
"""

from __future__ import annotations

import logging
import random
from pathlib import Path

from gfs_mirror.domain.cycle import Cycle
from gfs_mirror.s3.client import GfsS3Client, ObjectNotFound
from gfs_mirror.storage.layout import StorageLayout

log = logging.getLogger(__name__)

BACKOFF_BASE_SEC = 30
BACKOFF_MAX_SEC = 300


class DownloadNotYetAvailable(Exception):
    """S3 returned 404 — the publisher hasn't uploaded this object yet."""


async def download_one(
    s3: GfsS3Client,
    layout: StorageLayout,
    cycle: Cycle,
    lead_hour: int,
    grid: str,
) -> Path:
    """Download one lead's GRIB into WBRAW. Raises DownloadNotYetAvailable on 404."""
    key = cycle.s3_key(lead_hour, grid)
    dest = layout.raw_file(cycle, lead_hour)
    try:
        size = await s3.download(key, dest)
    except ObjectNotFound as e:
        raise DownloadNotYetAvailable(key) from e
    log.debug("downloaded %s (%d bytes)", key, size)
    return dest


def backoff_seconds(attempt: int) -> float:
    """Exponential backoff with jitter. attempt is 1-indexed."""
    base = min(BACKOFF_BASE_SEC * (2 ** (attempt - 1)), BACKOFF_MAX_SEC)
    jitter = random.uniform(-0.3, 0.3) * base
    return max(1.0, base + jitter)
