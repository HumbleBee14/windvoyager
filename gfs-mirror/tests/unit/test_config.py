from __future__ import annotations

import pytest

from gfs_mirror.config import Config


def _base_env(**overrides):
    env = {
        "WBRAW": "/tmp/raw",
        "WBPROC": "/tmp/proc",
    }
    env.update(overrides)
    return env


def test_minimum_viable_config_uses_sane_defaults():
    cfg = Config.from_env(_base_env())
    assert str(cfg.raw_dir) == "/tmp/raw"
    assert str(cfg.proc_dir) == "/tmp/proc"
    assert cfg.grid == "1p00"
    assert cfg.schedule_spec == "0-48:3,48-192:6"
    assert len(cfg.lead_hours) == 41
    assert cfg.download_concurrency == 8
    assert cfg.process_concurrency >= 1
    assert cfg.log_level == "INFO"


def test_missing_wbraw_fails():
    with pytest.raises(ValueError, match="WBRAW"):
        Config.from_env({"WBPROC": "/tmp/proc"})


def test_missing_wbproc_fails():
    with pytest.raises(ValueError, match="WBPROC"):
        Config.from_env({"WBRAW": "/tmp/raw"})


def test_invalid_grid_rejected():
    with pytest.raises(ValueError, match="GFSM_GRID"):
        Config.from_env(_base_env(GFSM_GRID="0p50"))


def test_invalid_schedule_rejected():
    with pytest.raises(ValueError):
        Config.from_env(_base_env(GFSM_SCHEDULE="garbage"))


def test_override_schedule_for_0p25_literal():
    cfg = Config.from_env(
        _base_env(GFSM_GRID="0p25", GFSM_SCHEDULE="0-12:2,12-48:3,48-192:6")
    )
    assert cfg.grid == "0p25"
    assert len(cfg.lead_hours) == 43


def test_non_integer_concurrency_rejected():
    with pytest.raises(ValueError, match="GFSM_DOWNLOAD_CONCURRENCY"):
        Config.from_env(_base_env(GFSM_DOWNLOAD_CONCURRENCY="eight"))


def test_negative_retries_rejected():
    with pytest.raises(ValueError, match="GFSM_MAX_FILE_RETRIES"):
        Config.from_env(_base_env(GFSM_MAX_FILE_RETRIES="0"))


def test_log_level_uppercased():
    cfg = Config.from_env(_base_env(GFSM_LOG_LEVEL="debug"))
    assert cfg.log_level == "DEBUG"


def test_empty_string_treated_as_unset():
    cfg = Config.from_env(_base_env(GFSM_DOWNLOAD_CONCURRENCY=""))
    assert cfg.download_concurrency == 8
