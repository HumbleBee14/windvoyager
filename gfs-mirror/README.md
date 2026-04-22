# gfs-mirror

Resilient local mirror of NOAA GFS forecast cycles, for downstream balloon flight planning.

## What it does

- Watches NOAA's public S3 bucket (`noaa-gfs-bdp-pds`) for new GFS cycles (4×/day at 00/06/12/18 UTC).
- Downloads a configurable subset of forecast-hour GRIB2 files per cycle.
- Runs `process_file` on each; writes outputs atomically to `$WBPROC/<cycle>/`.
- Keeps exactly one complete cycle visible at all times; never-empty invariant across rollover.
- Recovers from crashes, retries on NOAA's "partial upload visible at URL" quirk, skips permanently-broken cycles.

See [`../PLAN.md`](../PLAN.md) for the full design, and [`DESIGN_NOTES.md`](DESIGN_NOTES.md) for implementation tradeoffs.

## Running

```bash
cp .env.example .env     # edit WBRAW / WBPROC paths
make install             # uv sync --all-extras
make run                 # python -m gfs_mirror
```

## Testing

```bash
make test                # all tiers
make test-unit           # fast: pure functions
make test-integration    # fake S3, real pipeline wiring
make test-invariant      # rollover + atomicity under crashes
```

## Layout

```
src/gfs_mirror/
├── domain/       # pure data (cycle, schedule) — no I/O, no async
├── s3/           # only module that talks to AWS
├── storage/      # only module that writes filesystem
└── pipeline/     # orchestration: watcher, runner, download, process
```

Dependency arrows: `pipeline → {s3, storage} → domain`. No cycles.
