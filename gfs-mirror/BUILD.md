# BUILD

## Install

```bash
cd gfs-mirror
make install      # uv sync --all-extras   (creates .venv/)
```

## Run the service (long-running daemon)

```bash
make run          # python -m gfs_mirror — runs forever until Ctrl-C / SIGTERM
```

This is the actual service. It:

1. Recovers any interrupted state from disk on startup.
2. Computes the latest GFS cycle NOAA should have published.
3. Polls S3 until that cycle's `f000` appears.
4. Downloads and processes every lead-hour (with retry/corruption handling).
5. Atomically publishes the cycle and prunes previous data.
6. Waits for the next cycle (6h later), repeats. Forever.

Stop with Ctrl-C; it handles SIGINT/SIGTERM cleanly.

## Config via `.env` (recommended)

Create `.env` in the `gfs-mirror/` folder (or any parent dir). It's auto-loaded on startup — no `export` needed:

```bash
cp .env.example .env     # then edit to taste
make run
```

Defaults are sensible — you can run **with no `.env` at all** and data will land under `~/.gfs-mirror/`.

## Where data goes

Nested by cycle date (YYYYMMDD), then cycle hour (00/06/12/18) — mirrors
NOAA's own S3 layout (`gfs.YYYYMMDD/HH/atmos/…`) and matches the task spec's
"subfolder for the cycle date."

- `WBRAW` defaults to `~/.gfs-mirror/raw`
- `WBPROC` defaults to `~/.gfs-mirror/proc`
- Both directories are created automatically. Override with env vars.

### During an active cycle (mid-processing)

Say the service is currently processing the **12Z cycle on Apr 22, 2026**, having already published the **06Z cycle** earlier that morning. Under the default schedule (`0-48:3,48-192:6` → 41 files per cycle):

```
$WBRAW/
  20260422/
    12/                              # raw GRIB2s for the active cycle
      f000.grib2      (~42 MB)       # downloading in parallel (N=8);
      f003.grib2      (~45 MB)       # each file is unlinked the instant
      f006.grib2      (~45 MB)       # process_file succeeds on it,
      f009.grib2      (~45 MB)       # so this dir's contents shrink
      ... (3h bucket) ...            # as the cycle progresses.
      f048.grib2      (~45 MB)       # after publish, the whole dir is
      f054.grib2      (~45 MB)       # wiped (spec: "delete all files
      f060.grib2      (~45 MB)       # after the cycle is complete").
      ... (6h bucket) ...
      f192.grib2      (~45 MB)

$WBPROC/
  20260422/
    06/                              # PREVIOUS GOOD CYCLE — still live
      .complete                      # sentinel: this cycle is readable
      .manifest.json                 # cycle metadata + per-lead state
      1776837600                     # 2026-04-22 06:00Z  (f000)
      1776848400                     # 2026-04-22 09:00Z  (f003)
      1776859200                     # 2026-04-22 12:00Z  (f006)
      1776870000                     # 2026-04-22 15:00Z  (f009)
      1776880800                     # 2026-04-22 18:00Z  (f012)
      ...                            # — 3h bucket (17 files total) —
      1777010400                     # 2026-04-24 06:00Z  (f048)
      1777032000                     # 2026-04-24 12:00Z  (f054)
      ...                            # — 6h bucket (24 files total) —
      1777528800                     # 2026-04-30 06:00Z  (f192)

    12.partial/                      # CURRENT CYCLE — still filling
      .manifest.json                 # tracks which leads are done
      1776880800                     # 2026-04-22 18:00Z  (f000) ✓ done
      1776891600                     # 2026-04-22 21:00Z  (f003) ✓ done
      ...                            # (leads still being fetched appear
                                     #  here one by one as they land)
```

**Consumers always read from `$WBPROC/20260422/06/`** — the one with
`.complete`. The `12.partial/` dir is invisible to them until it's renamed.

### After the 12Z cycle finishes publishing

One atomic `os.rename` promotes the partial; then pruning sweeps everything else:

```
$WBRAW/
  (empty — 20260422/ was pruned)

$WBPROC/
  20260422/
    12/                              # NEW current good cycle
      .complete
      .manifest.json
      1776880800                     # 2026-04-22 18:00Z  (f000)
      1776891600                     # 2026-04-22 21:00Z  (f003)
      ...                            # all 41 files
      1777550400                     # 2026-04-30 12:00Z  (f192)
    # 06/ — GONE (the older cycle is pruned on publish of its successor)
```

At any moment, there is **exactly one** `<date>/<hour>/` directory with a
`.complete` marker. That's the rule the `tests/invariant/` tier enforces.

### Across days

When the next UTC day rolls over, a second date folder appears briefly:

```
$WBPROC/
  20260422/
    18/                              # Apr 22 18Z run — current good
      .complete
      ... 41 files ...
  20260423/
    00.partial/                      # Apr 23 00Z run — being built
      .manifest.json
      ...
```

After `20260423/00/` publishes, `20260422/` is pruned entirely (empty date
dirs get removed too).

### File naming — what the timestamps mean

Filenames under `<date>/<hour>/` are **Unix timestamps of the forecast
moment**, per task spec. They are *not* the download time; they are *when*
the atmosphere is being predicted. Formula:

```
filename = int((cycle_start_utc + lead_hour_hours * 3600).timestamp())
```

For the 12Z cycle on 2026-04-22:

| Lead | Forecast moment (UTC) | Filename     |
|------|-----------------------|--------------|
| f000 | 2026-04-22 12:00      | `1776859200` |
| f003 | 2026-04-22 15:00      | `1776870000` |
| f024 | 2026-04-23 12:00      | `1776945600` |
| f096 | 2026-04-26 12:00      | `1777204800` |
| f192 | 2026-04-30 12:00      | `1777550400` |

A downstream consumer can `ls $WBPROC/20260422/12/ | sort -n` and get
chronologically ordered forecasts without parsing anything.

## Verify it works (smoke test — not the service)

```bash
.venv/bin/python scripts/smoke.py
```

**This is a one-shot verification tool, NOT the service.** It picks a recent cycle, runs the full pipeline with 2 lead-hours and a fast process_fn (no 40s sleep), writes output to `gfs-mirror/smoke-output/`, and exits. ~2-3 seconds. Useful for:

- Confirming aioboto3 + the NOAA public bucket works from your network.
- Seeing exactly what a real processed cycle looks like on disk.
- Debugging without waiting 3.5 minutes for a full cycle.

If you want the real thing running, use `make run`.

## Testing

```bash
make test                # all 89 tests, ~8s
make test-unit           # 77 tests, <0.1s
make test-integration    # 7 tests against fake S3
make test-invariant      # 3 tests: never-empty + skip-broken-cycle
```

## All env vars (all optional)

| Var | Default | Purpose |
|---|---|---|
| `WBRAW` | `~/.gfs-mirror/raw` | raw `.grib2` scratch dir |
| `WBPROC` | `~/.gfs-mirror/proc` | processed output root |
| `GFSM_GRID` | `1p00` | `1p00` or `0p25` |
| `GFSM_SCHEDULE` | `0-48:3,48-192:6` | lead-hour sampling; format `start-end:step,...` |
| `GFSM_DOWNLOAD_CONCURRENCY` | 8 | parallel S3 downloads |
| `GFSM_PROCESS_CONCURRENCY` | `os.cpu_count()` | parallel `process_file` workers |
| `GFSM_MAX_FILE_RETRIES` | 20 | per-file retry cap on 404/corruption |
| `GFSM_CYCLE_TIMEOUT_HOURS` | 5 | abandon a cycle after this |
| `GFSM_PUBLISH_LAG_MINUTES` | 210 | expected NOAA publish lag from cycle start |
| `GFSM_POLL_INTERVAL_SEC` | 60 | S3 polling cadence for new cycles |
| `GFSM_LOG_LEVEL` | `INFO` | `DEBUG`/`INFO`/`WARNING`/`ERROR` |

See [`.env.example`](.env.example) for a copyable template.

## Notes

- **Source:** public NOAA bucket `noaa-gfs-bdp-pds` (anonymous S3, no credentials).
- **Cadence:** 1° grid is natively 3-hourly. Task's literal "2-hourly first 12h" requires 0.25° — flip `GFSM_GRID=0p25` and adjust schedule. See [DESIGN_NOTES.md](DESIGN_NOTES.md#2-the-spec-vs-reality-gap-we-hit).
- **Invariant:** after the first successful cycle, exactly one `WBPROC/<date>/<hour>/` with `.complete` exists at all times. Verified by `tests/invariant/`.
