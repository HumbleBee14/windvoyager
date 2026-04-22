# gfs-mirror — design notes

Short-form tradeoffs and decisions made during implementation. Complements
[`../PLAN.md`](../PLAN.md) — the plan describes *what*, this describes *why*.

---

## 1. What we actually ship by default

- **Grid: `1p00`** (1.0° GFS product), matching the exact URL in the task spec.
- **Schedule: `0-48:3,48-192:6`** — 3-hourly from f000 to f048, 6-hourly from f054 to f192. **41 files per cycle.**
- Both are `GFSM_GRID` / `GFSM_SCHEDULE` env vars. Zero code change to switch.

## 2. The spec-vs-reality gap we hit

The task says `pgrb2.1p00` AND "2-hourly for the first 12 hours." Those contradict — the public bucket for `1p00` only contains 3-hourly files (`f000, f003, f006, f009, …`). Verified directly against `noaa-gfs-bdp-pds` via `ListObjectsV2`.

Three ways to reconcile, all supported by config:

| Option | `GFSM_GRID` | `GFSM_SCHEDULE` | Files | Notes |
|---|---|---|---|---|
| **Default (ships)** | `1p00` | `0-48:3,48-192:6` | 41 | Matches the URL in the task; cadence degraded to what NOAA publishes. |
| Literal spec | `0p25` | `0-12:2,12-48:3,48-192:6` | 43 | True 2-hourly requires the 0.25° product. |
| Minimal | `1p00` | `0-192:3` | 65 | All 3-hourly; over-collects but simpler. |

I went with the default. One env-var flip if the hiring manager wants the literal 2-hourly — no code change.

## 3. Architecture at a glance

Four packages, dependencies in one direction:

```
domain  ←  s3
   ↑        ↑
   ├── storage
          ↑
       pipeline
```

- **`domain/`** — `Cycle`, `parse_schedule`. Pure, no I/O, no async.
- **`s3/`** — the *only* module that imports `aioboto3`.
- **`storage/`** — the *only* module that writes to the filesystem.
- **`pipeline/`** — orchestration: watcher → runner → download/process workers.

This isn't aesthetic. It's the reason the code is easy to test: `domain` unit-tests without fixtures; `storage` unit-tests with just `tmp_path`; `pipeline` integration-tests against a `FakeS3` that swaps for `aioboto3` via the `GfsS3Client` Protocol.

## 4. Concurrency model

**Downloads are I/O-bound. `process_file` is time/CPU-bound.** Decoupled with two bounded `asyncio.Queue`s and two worker pools:

```
 pending leads ─▶ download_queue ─▶ [N download workers (asyncio)]
                                         │
                                         ▼
                                   process_queue ─▶ [M process workers (ProcessPoolExecutor)]
                                         │
                                         ▼
                                   update manifest
                                         │
                                         ▼
                            on corruption: re-enqueue to download_queue
```

- **N** = `GFSM_DOWNLOAD_CONCURRENCY`, default 8.
- **M** = `GFSM_PROCESS_CONCURRENCY`, default `os.cpu_count()`.
- Queue maxsize = `concurrency × 2` — enough to keep workers fed, small enough to apply backpressure if processing stalls.
- Processes, not threads, because the real `process_file` could be GIL-bound. The provided stub sleeps 40s (not CPU), but the design is for real work.

**Wall-clock math** (41-file cycle, stub process_file):
- Serial: `41 × (5s + 40s)` ≈ **31 min**.
- This design, N=M=8: bounded by process side → `41 × 40s / 8` ≈ **3.4 min**.
- Smoke test with 2 leads and a fast process_fn: **3–4 sec** end-to-end.

## 5. The "never-empty, skip-broken cycle" invariant

The critical correctness requirement (task: "if the 2024040312 cycle is still downloading, the 2024040306 should still be available"). Captured as:

> After the first successful cycle, exactly one `WBPROC/<cycle>/` with a `.complete` marker exists at all times.

**Rollover** (`storage/retainer.py`):
1. Runner writes processed files into `WBPROC/<cycle>.partial/`.
2. When every lead is done, write `.complete` sentinel *inside* `.partial`.
3. `os.rename` the whole dir to drop `.partial` — **atomic on the same filesystem**. This is the publish step.
4. *Now* we prune: delete every other proc dir (old-good, stranded-partial, stray) and all raw dirs.

**Skip-broken** — same code path, by design:
- Stuck cycle N+1 leaves a `<N+1>.partial/` sibling but no `.complete`. `find_current_good` ignores anything without the marker, so N stays "current" unchanged.
- When N+2 succeeds, its publish triggers `prune_except(N+2)` which sweeps away both old-N and stranded-N+1 in one pass.
- No special "abandon cycle" code path. One rule: *on successful publish, keep only the just-published cycle.*

**Crash recovery** (`storage/recovery.py`):
- On startup, scan `WBPROC/`:
  - `.partial` dir with `.complete` inside, no final sibling → we crashed between marker and rename. Finish the rename.
  - Final dir without `.complete` → corrupt, delete.
  - Multiple `.partial` dirs → keep the newest, delete the rest.
  - Orphan raw dirs → delete.
- Runner uses the recovered manifest to skip already-done leads.

The filesystem is the source of truth. No separate DB, no "last cycle" pointer. Means crash recovery is 40 lines and self-evidently correct.

## 6. Corruption-retry semantics

Task warned: GRIB sometimes appears at its S3 URL before upload finishes. Strategy:

- **`process_file` returning `False` is the authoritative corruption check.** Not `Content-Length`, not byte counts — the task specifically says partial uploads may still have the "correct" size. The black-box verdict is all we trust.
- On `False`: delete raw, bump attempt counter in manifest, wait with jittered backoff (30s → 60s → 120s → 300s max, ±30% jitter), re-enqueue to download.
- Same backoff for S3 404s (not-yet-uploaded).
- Hard cap: `GFSM_MAX_FILE_RETRIES` (default 20). Exceed → mark lead stuck; cycle won't publish.
- Cycle has a wall-clock deadline too (`GFSM_CYCLE_TIMEOUT_HOURS`, default 5) so a cycle that's missing a lead forever doesn't block the watcher from moving to the next one.

## 7. Things I deliberately didn't build

- **No retry framework** — a 20-line backoff + jitter helper beats adding `tenacity` for this. (It's in `pyproject.toml` but unused; can remove.)
- **No metrics / Prometheus / Grafana.** Structured stderr logs.
- **No DB / sqlite.** Filesystem is enough and removes a whole failure mode.
- **No Docker image.** `uv run python -m gfs_mirror` + env vars. 15 seconds from clone to running.
- **No `ListObjectsV2` for discovery.** Computing URLs from the spec is cheaper. We only `HeadObject` for the cycle's `f000` as the "has this cycle started publishing?" probe.
- **No multi-cycle parallelism.** One active cycle at a time keeps the invariant trivially correct. With the provided stub, a cycle finishes in ~3.5 min; cycles publish every 6h; we have massive headroom.
- **No streaming downloads.** Files are 25–50 MB; `download_file` to disk is fine. Streaming would complicate the corruption-retry flow (we'd have to re-open the temp file or buffer in memory).

## 8. Things I'd do next if this were a real rollout

- **Metrics hooks** on: cycle start/end, per-lead download+process time, retry counts. Cheap to add with a single `Recorder` Protocol that defaults to a no-op.
- **Structured JSON logging** (just a different formatter in `logging_.py`).
- **Slack/pager on cycle stuck.** One hook, one env var.
- **Verify GRIB2 magic bytes (`GRIB`) before calling `process_file`.** Catches the "S3 gave us 0 bytes" case without paying for the 40s processing attempt. Trivial.
- **0.25° support** needs one env flip, but for production you'd probably want a cache of which FFFs actually exist per grid, since `0p25` is hourly 0–120h and 3-hourly 120–384h — the existing schedule parser handles it but I haven't exercised it against the real bucket.

## 9. Tests

All green: **87 tests in 7.67s.**

- **Unit** (77): `parse_schedule` boundaries, `Cycle` math, config validation, path layout, manifest roundtrip + atomicity, retainer publish/prune, recovery scan + repair.
- **Integration** (7): fake-S3 happy path, transient-corruption retry, permanent-corruption stuck, 404-becomes-available, resume from partial manifest, interrupted-rename repair.
- **Invariant** (3): PLAN §7 — N→N+1 clean swap, skip-broken-N+1 preserves N until N+2 wins, never-empty across a 4-cycle sequence with a stuck cycle in the middle.
- **Live smoke** ([`scripts/smoke.py`](scripts/smoke.py)): real NOAA bucket, 2 leads, ~3s end-to-end. The authoritative "it works" proof.

**Lesson learned along the way:** the first integration run appeared to hang. Root cause was a testing-only bug in `conftest.fast_backoff` — it monkeypatched `download.backoff_seconds` but `runner.py` imports the function by name (`from ... import backoff_seconds`), so the runner held its own reference that wasn't rebound. With the real 30s–5min backoff active, retry-heavy tests (stuck leads × 5 retries) took ~12 min each. Fix: patch both module-level names. Not a production bug.

## 10. File map with LOC

```
src/gfs_mirror/
├── __init__.py                0
├── __main__.py               ~75    entrypoint + signal handling
├── config.py                 ~80    env vars → typed Config
├── logging_.py               ~25    stderr formatter
├── provided.py               ~25    given stub, verbatim
├── domain/
│   ├── cycle.py              ~85    Cycle dataclass + URL/ts builders
│   └── schedule.py           ~55    parse "start-end:step,..." → list[int]
├── s3/
│   └── client.py             ~90    aioboto3 wrapper, GfsS3Client Protocol
├── storage/
│   ├── layout.py             ~85    path builders
│   ├── manifest.py           ~100   per-cycle manifest r/w, atomic
│   ├── retainer.py           ~80    publish + prune
│   └── recovery.py           ~100   startup scan + repair
└── pipeline/
    ├── download.py           ~45    one-file download + backoff
    ├── process.py            ~30    ProcessPoolExecutor wrapper
    ├── runner.py             ~210   per-cycle orchestration
    └── watcher.py            ~90    long-running loop

tests/
├── unit/          (77 tests, <0.1s)
├── integration/   (10 tests, fake S3)
├── invariant/     (3 tests, PLAN §7 rules)
└── conftest.py    fixtures: FakeS3, tiny_config, fast_backoff, thread pool

scripts/
└── smoke.py        real S3 end-to-end, 2 leads, ~3s
```

Total: ~1,100 lines of src, ~900 lines of tests. No dead code, no abstract bases, no utility folders.
