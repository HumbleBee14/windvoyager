"""Cycle: the identity of a single GFS model run, plus URL/timestamp derivations.

A cycle is (date, hour) where hour ∈ {0, 6, 12, 18} UTC. We represent it as an
immutable dataclass and expose pure helpers for:
  - stringification (YYYYMMDDHH) and parsing
  - generating the S3 key for a given forecast lead hour
  - mapping lead hour → Unix timestamp (the processed-file naming convention)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

VALID_HOURS: tuple[int, ...] = (0, 6, 12, 18)


@dataclass(frozen=True, order=True)
class Cycle:
    """A single GFS model run, identified by its UTC start moment."""

    year: int
    month: int
    day: int
    hour: int

    def __post_init__(self) -> None:
        if self.hour not in VALID_HOURS:
            raise ValueError(f"cycle hour must be one of {VALID_HOURS}, got {self.hour}")
        # Validate via datetime — raises on bad month/day combos.
        datetime(self.year, self.month, self.day, self.hour, tzinfo=UTC)

    @classmethod
    def from_string(cls, s: str) -> Cycle:
        """Parse 'YYYYMMDDHH'."""
        if len(s) != 10 or not s.isdigit():
            raise ValueError(f"cycle id must be 10 digits YYYYMMDDHH, got {s!r}")
        return cls(int(s[0:4]), int(s[4:6]), int(s[6:8]), int(s[8:10]))

    @classmethod
    def from_datetime(cls, dt: datetime) -> Cycle:
        """Round a UTC datetime DOWN to the most recent cycle start."""
        if dt.tzinfo is None:
            raise ValueError("datetime must be tz-aware (UTC)")
        dt_utc = dt.astimezone(UTC)
        floored_hour = (dt_utc.hour // 6) * 6
        return cls(dt_utc.year, dt_utc.month, dt_utc.day, floored_hour)

    @property
    def id(self) -> str:
        return f"{self.year:04d}{self.month:02d}{self.day:02d}{self.hour:02d}"

    @property
    def start(self) -> datetime:
        return datetime(self.year, self.month, self.day, self.hour, tzinfo=UTC)

    @property
    def date_str(self) -> str:
        return f"{self.year:04d}{self.month:02d}{self.day:02d}"

    @property
    def hour_str(self) -> str:
        return f"{self.hour:02d}"

    def next(self) -> Cycle:
        return Cycle.from_datetime(self.start + timedelta(hours=6))

    def previous(self) -> Cycle:
        return Cycle.from_datetime(self.start - timedelta(hours=6))

    def s3_prefix(self) -> str:
        return f"gfs.{self.date_str}/{self.hour_str}/atmos/"

    def s3_key(self, lead_hour: int, grid: str) -> str:
        """S3 object key for a specific forecast lead hour."""
        if lead_hour < 0:
            raise ValueError(f"lead_hour must be >= 0, got {lead_hour}")
        return f"{self.s3_prefix()}gfs.t{self.hour_str}z.pgrb2.{grid}.f{lead_hour:03d}"

    def forecast_timestamp(self, lead_hour: int) -> int:
        """Unix timestamp (seconds) for the moment this lead hour predicts."""
        return int((self.start + timedelta(hours=lead_hour)).timestamp())

    def __str__(self) -> str:
        return self.id
