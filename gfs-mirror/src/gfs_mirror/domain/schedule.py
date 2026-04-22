"""Parse the sampling schedule spec into a list of forecast lead hours.

Format: comma-separated "start-end:step" ranges.

  "0-12:2,12-48:3,48-192:6"
    -> [0, 2, 4, 6, 8, 10, 12, 15, 18, ..., 48, 54, 60, ..., 192]

Boundary rule: a range's start is skipped if the previous range already emitted it.
That way hour 12 appears exactly once (in the 2h bucket) and hour 48 appears exactly
once (in the 3h bucket). Within a range, `end` is inclusive if it lands on a step.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScheduleRange:
    start: int
    end: int
    step: int

    def __post_init__(self) -> None:
        if self.start < 0 or self.end < 0 or self.step <= 0:
            raise ValueError(f"invalid range {self!r}: start/end >= 0, step > 0")
        if self.end < self.start:
            raise ValueError(f"invalid range {self!r}: end < start")


def parse_schedule(spec: str) -> list[int]:
    """Parse a schedule spec string into a sorted, deduplicated list of lead hours."""
    ranges = [_parse_range(chunk) for chunk in spec.split(",") if chunk.strip()]
    if not ranges:
        raise ValueError(f"empty schedule spec: {spec!r}")

    hours: list[int] = []
    seen: set[int] = set()
    for r in ranges:
        for h in range(r.start, r.end + 1, r.step):
            if h not in seen:
                hours.append(h)
                seen.add(h)
    hours.sort()
    return hours


def _parse_range(chunk: str) -> ScheduleRange:
    chunk = chunk.strip()
    try:
        span, step_str = chunk.split(":")
        start_str, end_str = span.split("-")
        return ScheduleRange(int(start_str), int(end_str), int(step_str))
    except ValueError as e:
        raise ValueError(f"bad schedule chunk {chunk!r}: expected 'start-end:step'") from e
