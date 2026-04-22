"""Async S3 client for the anonymous NOAA public bucket.

This is the ONLY module that imports aioboto3. Every other layer talks to S3
through the GfsS3Client protocol so tests can inject a fake.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import aioboto3
from botocore import UNSIGNED
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

log = logging.getLogger(__name__)

DEFAULT_BUCKET = "noaa-gfs-bdp-pds"


class ObjectNotFound(Exception):
    """Raised when an S3 key returns 404/NoSuchKey — semantically distinct from a real error."""


class GfsS3Client(Protocol):
    """Minimal surface we use from S3. Fakes in tests implement the same three methods."""

    async def list_keys(self, prefix: str) -> list[str]: ...
    async def object_exists(self, key: str) -> bool: ...
    async def download(self, key: str, dest: Path) -> int: ...


@dataclass
class AioBotoS3Client:
    bucket: str = DEFAULT_BUCKET
    region: str = "us-east-1"

    async def list_keys(self, prefix: str) -> list[str]:
        keys: list[str] = []
        async with self._session().client(
            "s3", region_name=self.region, config=_anon_config()
        ) as s3:
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    keys.append(obj["Key"])
        return keys

    async def object_exists(self, key: str) -> bool:
        async with self._session().client(
            "s3", region_name=self.region, config=_anon_config()
        ) as s3:
            try:
                await s3.head_object(Bucket=self.bucket, Key=key)
                return True
            except ClientError as e:
                code = e.response.get("Error", {}).get("Code", "")
                if code in ("404", "NoSuchKey", "NotFound"):
                    return False
                raise

    async def download(self, key: str, dest: Path) -> int:
        """Download key to dest (atomically via temp + rename). Returns bytes written."""
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".downloading")
        async with self._session().client(
            "s3", region_name=self.region, config=_anon_config()
        ) as s3:
            try:
                await s3.download_file(self.bucket, key, str(tmp))
            except ClientError as e:
                tmp.unlink(missing_ok=True)
                code = e.response.get("Error", {}).get("Code", "")
                if code in ("404", "NoSuchKey", "NotFound"):
                    raise ObjectNotFound(key) from e
                raise
        size = tmp.stat().st_size
        tmp.replace(dest)
        return size

    def _session(self) -> aioboto3.Session:
        return aioboto3.Session()


def _anon_config() -> BotoConfig:
    return BotoConfig(signature_version=UNSIGNED, retries={"max_attempts": 3, "mode": "adaptive"})
