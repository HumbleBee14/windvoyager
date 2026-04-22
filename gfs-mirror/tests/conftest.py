"""Shared fixtures for integration + invariant tests.

Provides:
  - FakeS3: an in-memory implementation of GfsS3Client with injectable failure modes.
  - tiny_config: a Config with minimal lead hours, so tests run in ms not minutes.
  - fast_backoff: monkeypatches backoff_seconds() to 1ms so retries don't slow tests.
  - thread_pool_factory: makes the runner use ThreadPoolExecutor (no pickling).
"""

from __future__ import annotations

import asyncio
from concurrent.futures import Executor, ThreadPoolExecutor
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterator

import pytest

from gfs_mirror.config import Config
from gfs_mirror.s3.client import ObjectNotFound


@dataclass
class FakeS3:
    """In-memory S3 that returns bytes per-key. Counters track calls.

    Behavior controls:
      - preload(key, data): set content
      - set_missing(key): make the key return 404
      - corrupt_first_n(key, n, data): first n downloads return b"" (bad);
        downloads after that return `data`.
    """

    objects: dict[str, bytes] = field(default_factory=dict)
    missing: set[str] = field(default_factory=set)
    corrupt_counters: dict[str, int] = field(default_factory=dict)  # key -> remaining corrupt
    download_calls: list[str] = field(default_factory=list)
    head_calls: list[str] = field(default_factory=list)

    # ----- setup helpers -----
    def preload(self, key: str, data: bytes = b"GRIB2-fake") -> None:
        self.objects[key] = data
        self.missing.discard(key)

    def preload_cycle(self, cycle, lead_hours, grid) -> None:
        for h in lead_hours:
            self.preload(cycle.s3_key(h, grid))

    def set_missing(self, key: str) -> None:
        self.missing.add(key)
        self.objects.pop(key, None)

    def corrupt_first_n(self, key: str, n: int, data: bytes = b"GRIB2-fake") -> None:
        self.corrupt_counters[key] = n
        self.objects[key] = data

    # ----- GfsS3Client protocol -----
    async def list_keys(self, prefix: str) -> list[str]:
        return sorted(k for k in self.objects if k.startswith(prefix))

    async def object_exists(self, key: str) -> bool:
        self.head_calls.append(key)
        return key in self.objects and key not in self.missing

    async def download(self, key: str, dest: Path) -> int:
        self.download_calls.append(key)
        if key in self.missing or key not in self.objects:
            raise ObjectNotFound(key)
        remaining_corrupt = self.corrupt_counters.get(key, 0)
        if remaining_corrupt > 0:
            self.corrupt_counters[key] = remaining_corrupt - 1
            data = b""  # empty = will make process_fn return False if it checks size
        else:
            data = self.objects[key]
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return len(data)


@pytest.fixture
def fake_s3() -> FakeS3:
    return FakeS3()


@pytest.fixture
def tiny_config(tmp_path: Path) -> Config:
    """Config with a tiny schedule (3 leads) so tests are fast."""
    env = {
        "WBRAW": str(tmp_path / "raw"),
        "WBPROC": str(tmp_path / "proc"),
        "GFSM_GRID": "1p00",
        "GFSM_SCHEDULE": "0-6:3",  # -> [0, 3, 6], three leads
        "GFSM_DOWNLOAD_CONCURRENCY": "3",
        "GFSM_PROCESS_CONCURRENCY": "3",
        "GFSM_POLL_INTERVAL_SEC": "1",
        "GFSM_PUBLISH_LAG_MINUTES": "0",
        "GFSM_MAX_FILE_RETRIES": "5",
        "GFSM_CYCLE_TIMEOUT_HOURS": "1",
        "GFSM_LOG_LEVEL": "DEBUG",
    }
    return Config.from_env(env)


@pytest.fixture(autouse=True)
def fast_backoff(monkeypatch):
    """Make retries effectively instant in tests."""
    from gfs_mirror.pipeline import download as dl_mod

    monkeypatch.setattr(dl_mod, "backoff_seconds", lambda attempt: 0.001)


@pytest.fixture
def thread_pool_factory() -> Callable[[int], object]:
    """pool_factory for run_cycle that uses threads (closure-friendly)."""

    @contextmanager
    def factory(workers: int) -> Iterator[Executor]:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            yield pool

    return factory


# ---------- canned process_fns ----------


def always_ok(input_grib: str, output_proc: str) -> bool:
    Path(output_proc).write_text(f"processed {input_grib}")
    return True


def always_fail(input_grib: str, output_proc: str) -> bool:
    return False


def make_flaky_process_fn(corrupt_per_lead: dict[int, int]):
    """Return a process_fn that returns False the first N times for a given lead.

    `corrupt_per_lead` is keyed by the TRAILING integer in the raw filename
    (i.e. the FFF lead hour parsed out of fNNN.grib2). We decrement per call.
    """
    counters = dict(corrupt_per_lead)

    def fn(input_grib: str, output_proc: str) -> bool:
        # Parse lead hour from "...fNNN.grib2" — robust enough for tests.
        name = Path(input_grib).stem  # "fNNN"
        lead = int(name.lstrip("f"))
        left = counters.get(lead, 0)
        if left > 0:
            counters[lead] = left - 1
            return False
        Path(output_proc).write_text(f"processed {input_grib}")
        return True

    return fn


@pytest.fixture
def use_asyncio_default_loop():
    """pytest-asyncio uses a fresh loop per test; nothing to do here but some
    tests may want to tweak. Placeholder for future use."""

    def _noop():
        pass

    return _noop
