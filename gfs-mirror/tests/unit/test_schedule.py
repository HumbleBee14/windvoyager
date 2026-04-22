"""Pin the schedule spec exactly. See PLAN.md §2.6."""

from __future__ import annotations

import pytest

from gfs_mirror.domain.schedule import parse_schedule


def test_default_1p00_schedule():
    """Shipping default — what 1p00 actually publishes on NOAA S3."""
    hours = parse_schedule("0-48:3,48-192:6")
    expected_first_bucket = list(range(0, 49, 3))
    expected_second_bucket = list(range(54, 193, 6))
    assert hours == expected_first_bucket + expected_second_bucket
    assert len(hours) == 41
    assert hours[0] == 0 and hours[-1] == 192
    assert 48 in hours and hours.count(48) == 1


def test_literal_spec_for_0p25_grid():
    """Task-literal cadence; requires 0p25 product to be physically available."""
    hours = parse_schedule("0-12:2,12-48:3,48-192:6")
    assert len(hours) == 43
    assert hours[:7] == [0, 2, 4, 6, 8, 10, 12]
    assert hours.count(12) == 1
    assert hours.count(48) == 1
    assert hours[-1] == 192


def test_uniform_3h_everywhere():
    hours = parse_schedule("0-192:3")
    assert len(hours) == 65
    assert hours == list(range(0, 193, 3))


def test_single_range():
    assert parse_schedule("0-12:2") == [0, 2, 4, 6, 8, 10, 12]


def test_strictly_sorted_and_unique():
    hours = parse_schedule("0-12:2,12-48:3,48-192:6")
    assert hours == sorted(hours)
    assert len(hours) == len(set(hours))


def test_end_exclusive_if_not_on_step():
    assert parse_schedule("0-10:3") == [0, 3, 6, 9]


@pytest.mark.parametrize(
    "bad",
    ["", "   ", "garbage", "0-12", "0:2", "-5-10:2", "10-5:2", "0-10:0", "0-10:-1"],
)
def test_rejects_invalid_specs(bad):
    with pytest.raises(ValueError):
        parse_schedule(bad)


def test_whitespace_tolerated():
    assert parse_schedule(" 0-12:2 , 12-48:3 ") == parse_schedule("0-12:2,12-48:3")
