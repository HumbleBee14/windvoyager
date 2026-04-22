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

Nested by cycle date, then cycle hour — mirrors NOAA's S3 layout and matches the task spec's "subfolder for the cycle date."

```
$WBRAW/
  20260422/                  # cycle date (YYYYMMDD)
    12/                      # cycle hour (00, 06, 12, or 18)
      f000.grib2             # raw download, pruned after publish
      f003.grib2

$WBPROC/
  20260422/
    12/                      # current good cycle (post-publish)
      1776859200             # filename = unix ts of the forecast moment
      1776870000
      .complete              # sentinel: cycle fully processed
      .manifest.json         # resume state (for crash recovery)
    12.partial/              # (only while a cycle is in progress)
```

- `WBRAW` defaults to `~/.gfs-mirror/raw`
- `WBPROC` defaults to `~/.gfs-mirror/proc`
- Both are created automatically if missing.

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
