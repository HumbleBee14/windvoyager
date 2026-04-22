from __future__ import annotations

from datetime import UTC, datetime

import pytest

from gfs_mirror.domain.cycle import VALID_HOURS, Cycle


def test_from_string_roundtrip():
    c = Cycle.from_string("2026042212")
    assert c.year == 2026
    assert c.month == 4
    assert c.day == 22
    assert c.hour == 12
    assert c.id == "2026042212"
    assert str(c) == "2026042212"


@pytest.mark.parametrize("bad", ["", "abc", "20260422", "202604221200", "2026042299"])
def test_from_string_rejects_garbage(bad):
    with pytest.raises(ValueError):
        Cycle.from_string(bad)


@pytest.mark.parametrize("bad_hour", [1, 3, 5, 7, 11, 24])
def test_invalid_hour_rejected(bad_hour):
    with pytest.raises(ValueError):
        Cycle(2026, 4, 22, bad_hour)


@pytest.mark.parametrize("h", VALID_HOURS)
def test_valid_hours_accepted(h):
    Cycle(2026, 4, 22, h)


def test_from_datetime_floors_to_cycle_boundary():
    # 13:47Z should floor to 12Z cycle
    c = Cycle.from_datetime(datetime(2026, 4, 22, 13, 47, tzinfo=UTC))
    assert c.hour == 12
    # 05:59Z should floor to 00Z cycle
    c2 = Cycle.from_datetime(datetime(2026, 4, 22, 5, 59, tzinfo=UTC))
    assert c2.hour == 0
    # 18:00Z sharp stays at 18Z
    c3 = Cycle.from_datetime(datetime(2026, 4, 22, 18, 0, tzinfo=UTC))
    assert c3.hour == 18


def test_from_datetime_requires_tz():
    with pytest.raises(ValueError):
        Cycle.from_datetime(datetime(2026, 4, 22, 12, 0))


def test_next_wraps_across_midnight():
    c = Cycle(2026, 4, 22, 18).next()
    assert c.id == "2026042300"


def test_previous_wraps_backwards():
    c = Cycle(2026, 4, 22, 0).previous()
    assert c.id == "2026042118"


def test_s3_prefix_and_key():
    c = Cycle(2026, 4, 22, 12)
    assert c.s3_prefix() == "gfs.20260422/12/atmos/"
    assert c.s3_key(6, "1p00") == "gfs.20260422/12/atmos/gfs.t12z.pgrb2.1p00.f006"
    assert c.s3_key(192, "0p25") == "gfs.20260422/12/atmos/gfs.t12z.pgrb2.0p25.f192"


def test_s3_key_rejects_negative_lead():
    c = Cycle(2026, 4, 22, 12)
    with pytest.raises(ValueError):
        c.s3_key(-1, "1p00")


def test_forecast_timestamp_matches_wall_clock():
    c = Cycle(2026, 4, 22, 12)
    # t12z cycle, f006 predicts 18Z same day
    expected = int(datetime(2026, 4, 22, 18, tzinfo=UTC).timestamp())
    assert c.forecast_timestamp(6) == expected
    # f000 is cycle start itself
    assert c.forecast_timestamp(0) == int(c.start.timestamp())


def test_ordering():
    a = Cycle(2026, 4, 22, 0)
    b = Cycle(2026, 4, 22, 6)
    c = Cycle(2026, 4, 23, 0)
    assert a < b < c
    assert sorted([c, a, b]) == [a, b, c]
