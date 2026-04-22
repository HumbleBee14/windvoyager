# BUILD

## Install

```bash
cd gfs-mirror
make install      # uv sync --all-extras   (creates .venv/)
```

## Run

```bash
export WBRAW=/path/to/raw            # required — scratch dir for .grib2 files
export WBPROC=/path/to/proc          # required — processed output root
make run                              # python -m gfs_mirror
```

Or for a one-shot live smoke (downloads 2 real files from NOAA, ~3s):

```bash
.venv/bin/python scripts/smoke.py
```

## Where data goes

Nested by cycle date, then cycle hour — mirrors NOAA's own S3 layout
(`gfs.YYYYMMDD/HH/atmos/`) and makes the spec's "subfolder for the cycle date"
a literal match.

```
$WBRAW/
  20260422/                            # cycle date (YYYYMMDD)
    12/                                # cycle hour (HH ∈ {00,06,12,18})
      f000.grib2                       # raw download, pruned post-publish
      f003.grib2
      ...

$WBPROC/
  20260422/
    12/                                # current good cycle (post-publish)
      1776859200                       # filename = unix ts of forecast moment
      1776870000
      .complete                        # sentinel: cycle fully processed
      .manifest.json                   # per-lead progress (for crash recovery)
    12.partial/                        # (only while a cycle is in progress)
```

- Filename = `int((cycle_start + lead_hours * 3600).timestamp())`.
  E.g. cycle `20260422/12` with `f006` → filename `1776880800` (= 18:00 UTC Apr 22, 2026).
- The `.partial` suffix lives on the **hour** dir, so the atomic publish is
  a single `os.rename("20260422/12.partial" → "20260422/12")`.

## Testing

```bash
make test                             # all 87 tests, ~8s
make test-unit                        # 77 tests, <0.1s
make test-integration                 # 7 tests against fake S3
make test-invariant                   # 3 tests: never-empty + skip-broken-cycle
```

## Config knobs (env vars)

| Var | Default | Purpose |
|---|---|---|
| `WBRAW` | *required* | raw `.grib2` scratch dir |
| `WBPROC` | *required* | processed output root |
| `GFSM_GRID` | `1p00` | `1p00` or `0p25` |
| `GFSM_SCHEDULE` | `0-48:3,48-192:6` | lead-hour sampling; format `start-end:step,...` |
| `GFSM_DOWNLOAD_CONCURRENCY` | 8 | parallel S3 downloads |
| `GFSM_PROCESS_CONCURRENCY` | `os.cpu_count()` | parallel `process_file` workers |
| `GFSM_MAX_FILE_RETRIES` | 20 | per-file retry cap on 404/corruption |
| `GFSM_CYCLE_TIMEOUT_HOURS` | 5 | abandon a cycle after this |
| `GFSM_PUBLISH_LAG_MINUTES` | 210 | expected NOAA publish lag from cycle start |
| `GFSM_POLL_INTERVAL_SEC` | 60 | S3 polling cadence for new cycles |

Full default file in [`.env.example`](.env.example).

## Notes

- **Source:** public NOAA bucket `noaa-gfs-bdp-pds` (anonymous S3, no credentials).
- **Cadence:** 1° grid is natively 3-hourly. Task's literal "2-hourly first 12h" requires 0.25° (`GFSM_GRID=0p25`, `GFSM_SCHEDULE=0-12:2,12-48:3,48-192:6`) — see [DESIGN_NOTES.md](DESIGN_NOTES.md#2-the-spec-vs-reality-gap-we-hit).
- **Cycle dir name:** nested `YYYYMMDD/HH/`. Literal match for spec's "subfolder for the cycle date" (outer dir is the date) and matches NOAA's own S3 layout.
- **Invariant:** after the first successful cycle, exactly one `WBPROC/<cycle>/` with `.complete` exists at all times. Verified by `tests/invariant/`.
