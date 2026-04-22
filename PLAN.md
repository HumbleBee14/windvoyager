# WindVoyager — GFS Downloader

Design plan for the WindBorne SWE take-home: a resilient, always-fresh GFS forecast mirror + processor.

---

## 1. Goal (one paragraph)

Build a long-running service that, for every new GFS cycle NOAA publishes (4× daily at 00/06/12/18 UTC), downloads a defined subset of forecast-hour GRIB files from the public S3 bucket, runs `process_file` on each, and exposes the processed outputs under `WBPROC/<cycle>/` atomically. The service must **always have at least one complete cycle available** after the first successful run, recover from crashes, and tolerate NOAA's "partial upload visible at the URL" quirk.

---

## 2. Domain primer (so the code reads right)

Read this section before touching any code. Every confusion about "how often is data published" or "which cycle does this file belong to" or "do the 2h/3h/6h buckets overlap" traces back to the mental model here.

### 2.1 The vocabulary — dissect a filename

Example filename: `gfs.20260422/12/atmos/gfs.t12z.pgrb2.1p00.f006`

| Part | Meaning |
|---|---|
| `gfs.` | Global Forecast System (NOAA's weather model). Always prefix. |
| `20260422` | Date of the **cycle run**, UTC. |
| `/12/` | Cycle's start hour (UTC). Only 00, 06, 12, 18 exist. |
| `/atmos/` | Product family (atmospheric). NOAA also publishes `/wave/` etc. — we don't care. |
| `gfs.` | Literal. |
| `t12z` | Cycle tag. `t` + `12` (UTC hour) + `z` (Zulu = UTC). Literal `t` and `z`. Redundant with `/12/` but that's the naming standard. |
| `pgrb2` | Format: GRIB2 (the "archaic Colorado format"). |
| `1p00` | Grid resolution: **1.00°** lat-lon grid (360×181 cells, ≈111 km). Also exists as `0p25` = 0.25°. |
| `f006` | **Forecast lead hour.** Literal `f` + 3-digit integer. Prediction for the moment `cycle_start + 6 hours` — i.e. 18Z on Apr 22, 2026. |

So `gfs.t12z.….f006` = "the 12Z run's predicted atmosphere at 18Z same day."

### 2.2 The core mental model — ONE cycle, many lead times

This is the single most important thing to get right, because the task's wording ("2-hourly for first 12h, 3-hourly up to 2 days, 6-hourly after") makes it sound like there are three different cycles running in parallel. **There aren't.**

- NOAA runs GFS **4 times a day**. That's it. Four cycles daily, at 00Z / 06Z / 12Z / 18Z.
- Each cycle run produces **one forecast** that covers many future moments in one shot — starting from "right now" and extending up to 16 days out.
- That forecast is published as **many files**, one per future moment. File names differ only in the `fFFF` suffix.
- The 2h / 3h / 6h "cadence" is how **densely we sample** along the lead-time axis **within that single cycle's output** — dense near the start (we care most about the next few hours), loose far out (forecast skill degrades anyway).

Picture of wall-clock time with cycles and lead-time sampling:

```
Wall-clock UTC:
                                                                         
 Apr 22 00Z ──── 06Z ──── 12Z ──── 18Z ──── Apr 23 00Z ──── 06Z ─── ...  
     │            │        │        │            │             │        
     ▼            ▼        ▼        ▼            ▼             ▼        
   cycle        cycle    cycle    cycle        cycle         cycle      
   t00z         t06z     t12z     t18z         t00z(+1)      t06z(+1)   
                                                                         
   │                                                                    
   ▼ each cycle emits ~41 files over ~1-2h, starting ~3-4h after cycle start:
                                                                         
  t00z cycle's files (all share tHHz = t00z):
                                                                         
     f000   ← predicted state at 00Z (the moment the cycle started)       
     f003   ← predicted state at 03Z    ─┐                                 
     f006   ← predicted state at 06Z     │  bucket A: dense sampling     
     f009   ← predicted state at 09Z     │  (2h spec / 3h reality on 1°) 
     f012   ← predicted state at 12Z    ─┘                                 
     f015   ← predicted state at 15Z    ─┐                                 
     f018   ← predicted state at 18Z     │                                 
     f021   ← predicted state at 21Z     │  bucket B: medium sampling    
      ...                                │  (3h)                        
     f048   ← predicted state at 00Z+2d ─┘                                 
     f054   ← predicted state at 06Z+2d ─┐                                 
     f060   ← predicted state at 12Z+2d  │                                 
      ...                                │  bucket C: sparse sampling    
     f192   ← predicted state at 00Z+8d ─┘  (6h)                        
```

**Takeaways from the picture:**
- One `tHHz` per cycle. All ~41 files in a cycle share it.
- FFF is **not a wall-clock time**, it's an **offset from cycle start**.
- The three cadence buckets are three chunks of the **same** lead-time axis. They partition it. No overlap within a cycle.
- NOAA publishes every ~6 hours (new cycle). Files of a cycle trickle in over ~1–2 hours after the cycle's publication window opens (~3–4h after cycle start).

### 2.3 Do cycles overlap across wall-clock time?

Yes — and that's *why* we re-fetch every cycle. Example:
- `t06z.f006` predicts the atmosphere at 12Z.
- `t12z.f000` also "predicts" 12Z (it's the analysis — cycle start).
- `t00z.f012` also predicts 12Z.

Three different cycles, three different predictions for the same future moment. **The newest one is the most accurate** (it had more recent observations to assimilate). That's exactly why the task says "replace the whole cycle every time a new one lands." Our on-disk data is always the newest cycle's 41-file set; the previous cycle's 41 files get deleted wholesale. No merging, no diffing.

### 2.4 Publication timing (what the watcher needs to know)

- Cycle's nominal start: 00/06/12/18 UTC sharp.
- First file (`f000`) typically appears on S3 **~3–4 hours** after nominal start. Call this the *publish lag* (`WV_PUBLISH_LAG_MINUTES`, default 210).
- Remaining files appear roughly in order (`f003` → `f006` → … → `f192`), over ~1–2 hours.
- A file can appear briefly as a **partial/corrupt object** (task warning) before being silently replaced by the complete version. Our corruption-retry logic handles this.

### 2.5 Verified facts about the real S3 bucket (checked directly)

Ground-truth from `ListObjectsV2` on `noaa-gfs-bdp-pds`, cycle `gfs.20260421/12/atmos/`:

- `pgrb2.1p00` is published **every 3 hours** (f000, f003, f006, f009, f012, …). No f001, f002, f004 exist.
- Each file is accompanied by a `.idx` file (a byte-range index — we ignore it; we download the full GRIB2).
- Files appear on the bucket within the cycle's publish window, roughly in forecast-hour order.

**Implication:** "2-hourly on 1° grid" from the task spec is not physically achievable. See §12.1 for how we handle this (short version: default to 3-hourly first bucket on `1p00`; one env-var flip switches to `0p25` if the hiring manager wants true 2-hourly).

### 2.6 Cadence and the file count (under each config)

| Config | `WV_GRID` | `WV_SCHEDULE` | Files / cycle |
|---|---|---|---|
| **Default (shipping)** | `1p00` | `0-48:3,48-192:6` | **41** (17 + 24) |
| Literal spec (requires 0.25°) | `0p25` | `0-12:2,12-48:3,48-192:6` | 43 (7 + 12 + 24) |
| Minimal (3h everywhere) | `1p00` | `0-192:3` | 65 |

Counting (no double-counted boundaries — second bucket starts at `boundary + its_step`):
- 0-48 step 3 → `0,3,6,9,…,48` = 17 values.
- 48-192 step 6 → `54,60,66,…,192` = 24 values.
- 7 + 12 + 24 = 43 (if there's a 2h first bucket).

Your earlier "54" came from dividing spans by steps — that counts boundary points multiple times. The sampling is stepped, so use `(end-start)/step + 1` per bucket and skip the overlapping boundary in all-but-first bucket. `test_schedule.py` will pin this.

### 2.7 Replacement semantics (summary)

- Each cycle is a self-contained, full forecast snapshot.
- Newer cycle > older cycle for every overlapping wall-clock moment.
- On disk: always exactly one complete cycle available (after bootstrap). Swap atomically. Never merge.

---

## 3. External surface

### Input
- Anonymous public S3 bucket: `noaa-gfs-bdp-pds`
- Key pattern (grid is configurable via `WV_GRID`): `gfs.YYYYMMDD/HH/atmos/gfs.tHHz.pgrb2.<GRID>.fFFF`
  - e.g. `gfs.20260422/12/atmos/gfs.t12z.pgrb2.1p00.f006`
- Use `aioboto3` with `botocore.UNSIGNED` config.

### Environment variables
| Var | Purpose | Default |
|---|---|---|
| `WBRAW` | raw `.grib2` scratch dir | required |
| `WBPROC` | processed-output root | required |
| `WV_GRID` | GFS grid/product: `1p00` or `0p25` | `1p00` |
| `WV_SCHEDULE` | sampling spec (see below) | `0-12:2,12-48:3,48-192:6` |
| `WV_DOWNLOAD_CONCURRENCY` | in-flight downloads per cycle | 8 |
| `WV_PROCESS_CONCURRENCY` | parallel `process_file` workers | `os.cpu_count()` |
| `WV_POLL_INTERVAL_SEC` | cycle-availability poll cadence | 60 |
| `WV_MAX_FILE_RETRIES` | per-file retry cap on corrupt/missing | 20 |
| `WV_CYCLE_TIMEOUT_HOURS` | abandon-cycle timeout | 5 |
| `WV_PUBLISH_LAG_MINUTES` | expected lag from cycle start → first file on S3 | 210 |
| `WV_LOG_LEVEL` | `INFO`/`DEBUG` | `INFO` |

**`WV_SCHEDULE` format:** semicolon-separated ranges `start-end:step`. `0-12:2,12-48:3,48-192:6` means "hour 0 through 12 inclusive step 2, hour 12+step3 through 48 step 3, hour 48+step6 through 192 step 6." Trivial to parse, trivial to change when she clarifies §12.1. Boundary convention: second occurrence of a boundary hour wins (so 12 comes from the 3h bucket, 48 comes from the 6h bucket — matches the "stepped axis, no duplicates" rule).

### Output
- `WBPROC/<YYYYMMDDHH>/<unix_ts>` — one processed file per forecast hour, filename = Unix timestamp of `cycle_start + FFF hours`.
- `WBPROC/<YYYYMMDDHH>/.complete` — sentinel, written only when the cycle is fully processed.
- `WBPROC/<YYYYMMDDHH>/.manifest.json` — list of completed FFFs (for resume).

---

## 4. High-level architecture

```
              ┌─────────────────────┐
              │ CycleWatcher        │   probes S3 for new cycles
              │ (async, singleton)  │
              └──────────┬──────────┘
                         │ emits Cycle objects
                         ▼
              ┌─────────────────────┐
              │ CycleRunner         │   orchestrates one cycle end-to-end
              └──────────┬──────────┘
                         │
      ┌──────────────────┼──────────────────┐
      ▼                  ▼                  ▼
┌──────────┐       ┌──────────┐       ┌───────────┐
│ Download │──────▶│ Process  │──────▶│ Manifest  │
│ Workers  │ queue │ Workers  │ queue │ & Publish │
│ (asyncio)│       │(Process- │       │ (atomic)  │
└──────────┘       │ PoolExec)│       └───────────┘
                   └──────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ Retainer │  atomic swap + prune older cycles
                   └──────────┘
```

**Why this shape:**
- **Download is I/O-bound** → asyncio + `aioboto3`, bounded queue for backpressure.
- **`process_file` is blocking + CPU-time-consuming** → `ProcessPoolExecutor` via `loop.run_in_executor`. Processes, not threads, in case real processing is CPU-bound.
- **Bounded queues** prevent disk/memory blowup if processing stalls while downloads are fast.
- **One active cycle at a time** keeps the "never empty" invariant straightforward. If a newer cycle appears while one is in-flight, we hand off cleanly (see §7).

---

## 5. Module layout

```
windvoyager/
├── __main__.py           # entrypoint: `python -m windvoyager`
├── config.py             # env-var loading, typed config dataclass
├── cycle.py              # Cycle dataclass: YYYYMMDDHH, forecast hours, URL builder
├── schedule.py           # parses WV_SCHEDULE → list of forecast hours
├── s3_client.py          # aioboto3 wrapper: list, head, download (anonymous)
├── watcher.py            # CycleWatcher: finds latest available cycle on S3
├── runner.py             # CycleRunner: orchestrates one cycle's pipeline
├── download.py           # download worker + retry/corruption handling
├── process.py            # process_file wrapper + process-pool glue
├── manifest.py           # per-cycle manifest.json r/w, atomic publish
├── retainer.py           # old-cycle cleanup w/ invariant enforcement
├── state.py              # on-disk state scanner for resume-after-crash
├── logging_.py           # structured logging setup
└── provided.py           # the given `process_file` stub (kept verbatim)

tests/
├── test_schedule.py      # file count per config, boundary behavior
├── test_cycle_rollover.py  # CRITICAL: invariant under crash/skip scenarios
├── test_corruption_retry.py
├── test_resume_after_crash.py
└── conftest.py           # fake S3 with injectable "partial upload" mode

PLAN.md                   # this file
DESIGN_NOTES.md           # short tradeoffs doc (generated last)
pyproject.toml            # uv-managed deps
Makefile                  # `make run`, `make test`, `make lint`
.env.example
```

**Rationale:** modules split by responsibility, ~50–150 LOC each. Readable, testable, no "utils.py" dumping ground. No base classes or interfaces unless we have ≥2 concrete impls.

---

## 6. State machine (per cycle)

```
       ┌────────┐     new cycle detected on S3
       │  NEW   │────────────────────────────┐
       └────────┘                            ▼
                                      ┌─────────────┐
                                      │ DOWNLOADING │
                                      └──────┬──────┘
                                             │ all files downloaded & processed
                                             ▼
                                      ┌─────────────┐
                                      │  COMPLETE   │──▶ write .complete, swap pointer
                                      └──────┬──────┘
                                             │ successor COMPLETE
                                             ▼
                                      ┌─────────────┐
                                      │   PRUNED    │
                                      └─────────────┘
       ┌────────┐
       │ STUCK  │◀── cycle timeout OR successor completed first
       └────────┘
```

Per-file sub-states: `PENDING → DOWNLOADING → DOWNLOADED → PROCESSING → DONE | RETRY`.

---

## 7. The "never-empty + skip-broken-cycle" invariant

**Invariant:** at any time after the first successful cycle, `WBPROC/` contains **exactly one** directory with a `.complete` marker (the "current good" cycle). Partial cycles may exist alongside it in a `<cycle>.partial/` dir; they are invisible until they complete.

**Rollover procedure:**
1. New cycle `N+1` starts. Write files into `WBPROC/<N+1>.partial/`.
2. Previous good cycle `N` stays untouched in `WBPROC/<N>/`.
3. When all N files (per the active schedule) are processed → write `.complete` marker inside `.partial/`.
4. Atomically `os.rename(WBPROC/<N+1>.partial, WBPROC/<N+1>)` (rename across same filesystem is atomic).
5. Delete `WBPROC/<N>/` and `WBRAW/<N>/`.

**Broken-cycle handling:**
- Each file has a retry counter (`WV_MAX_FILE_RETRIES`). Each cycle has a wall-clock deadline (`WV_CYCLE_TIMEOUT_HOURS`).
- If a file exceeds its retry cap OR the cycle exceeds its deadline, the cycle is marked `STUCK` and the runner returns without publishing.
- The watcher continues polling. When cycle `N+2` appears on S3 (6h after `N+1`'s nominal start), a fresh `CycleRunner` starts for `N+2`.
- If `N+2` completes successfully, atomic rename puts it in place, and cleanup deletes **both** `N` (now two-cycles-old good one) AND the `<N+1>.partial/` scratch dir. This is your "delete N-2" case — the code treats it uniformly: *on successful publish of a cycle, delete everything in `WBPROC/` and `WBRAW/` that isn't the newly published cycle*.

**Key property:** the "current good" pointer only ever advances to a `.complete` cycle. No amount of broken cycles in between can violate the invariant.

---

## 8. Handling NOAA's partial-upload quirk

Two distinct failure modes collapsed into one strategy:

| Symptom | Cause | Action |
|---|---|---|
| S3 HEAD → 404 | Cycle published, but this FFF not yet uploaded | Wait, poll (backoff: 30s, 60s, 120s, cap 300s) |
| GET succeeds, `process_file` returns False | Partial/corrupt upload visible at URL | Delete local raw file, wait (backoff as above), re-GET, retry `process_file` |

- `process_file`'s boolean return is the **authoritative** corruption check. Don't use Content-Length (corruption can be mid-record truncation with correct byte count, per the task warning).
- Per-file retry state is persisted to the manifest so crashes don't reset retry counters.
- Retries use **jitter** (± 30%) to avoid thundering-herd if the service ever scales out.

---

## 9. Crash recovery / idempotency

On startup, before starting the watcher:

1. Scan `WBPROC/` for directories.
2. For each: check for `.complete` marker.
   - If present → it's the current good cycle. Keep.
   - If missing (i.e. `<cycle>.partial/`) → read `.manifest.json` if present, determine which FFFs are already done, resume from there.
3. Scan `WBRAW/` for orphan raw dirs of cycles not in `WBPROC/`; wipe them.
4. Keep at most one `.partial` dir (the newest). If multiple exist (shouldn't, but defensive), wipe all but newest.

**Why this works:** every state-changing operation is ordered: write raw → process → write processed atomically (temp + rename) → update manifest → (eventually) write `.complete` → rename dir. At any crash point, the scanner can tell exactly what's safe.

**Atomic processed-file write:** write to `WBPROC/<cycle>.partial/<ts>.tmp`, `os.rename` to `<ts>`. Same filesystem guarantees atomicity.

---

## 10. Concurrency model — the numbers

```
Download side:    asyncio, N = WV_DOWNLOAD_CONCURRENCY (default 8)
                  bounded Queue[DownloadJob](maxsize=16)

Process side:     ProcessPoolExecutor, M = WV_PROCESS_CONCURRENCY (default = cpu_count)
                  bounded Queue[ProcessJob](maxsize=16)

Back-pressure:    when process queue is full, download workers await put() →
                  naturally throttles disk usage.
```

Expected wall-clock per cycle with provided stub (assume ~41 files under default config):
- Serial baseline: 41 × (~5s download + 40s process) = ~31 min.
- With N=8, M=8: bounded by process side → 41 × 40s / 8 ≈ **~3.4 min**.
- Downloads are short enough that the I/O stage rarely bottlenecks; the process stage dominates. `M` is the knob that actually matters.

---

## 11. Testing strategy

Small but targeted. Every test below is worth keeping; none is filler.

1. **`test_schedule.py`** — parametrized over all configs in §2.6 table. Asserts the exact file set for each (default, 0p25 literal, 3h-everywhere). Boundary behavior at hours 12 and 48 pinned. This pins the spec.
2. **`test_corruption_retry.py`** — fake S3 returns corrupt bytes on first N attempts, good on attempt N+1. Verify retry + eventual success + no duplicate processed files. Verify retry cap triggers cycle-stuck on permanently-corrupt.
3. **`test_resume_after_crash.py`** — kill the runner mid-cycle (SIGTERM simulation), restart, verify it resumes from manifest and produces the same final output.
4. **`test_cycle_rollover.py`** — the critical one:
   - (a) Cycle N completes, cycle N+1 completes → WBPROC has only N+1, N is deleted, `.complete` exists.
   - (b) Cycle N completes, cycle N+1 gets stuck, cycle N+2 completes → N+1.partial is gone, N is deleted, N+2 is current. **Invariant held throughout:** at every intermediate tick, at least one `.complete` directory existed.
   - (c) Cycle N completes, runner dies during N+1, restart, N+1 completes → N is only deleted after N+1 published.
5. **`test_atomicity.py`** — kill the runner in the millisecond between writing `.complete` and `os.rename`ing the dir. On restart, verify the rename completes (or the partial is safely re-promoted).

Fake S3 fixture: a local directory + an `aioboto3`-shaped interface. Supports injecting 404s, corrupt bytes, and slow uploads. No network in tests.

---

## 12. Open questions (ask the hiring manager IF we can't resolve from code/bucket)

1. **1° grid cadence mismatch (VERIFIED):** The public bucket `noaa-gfs-bdp-pds` at `pgrb2.1p00` only contains 3-hourly files (f000, f003, f006, …) — no f001/f002/f004. Direct `ListObjectsV2` confirmed. The spec's "2-hourly for first 12 hours" on the 1° product is therefore not physically achievable. Three interpretations, all handled by `WV_SCHEDULE` + `WV_GRID`:
   - (a) Use `pgrb2.0p25` (hourly f000–f120), subsample to 2h. → `WV_GRID=0p25`, `WV_SCHEDULE=0-12:2,12-48:3,48-192:6`.
   - (b) Use `pgrb2.1p00`, degrade to 3h for the first 12h (what the product natively supports). → `WV_GRID=1p00`, `WV_SCHEDULE=0-48:3,48-192:6`.
   - (c) Hybrid: pull 1p00 where it exists, 0p25 for the 2h gaps. Probably overkill for this task.
   - **Default shipping config: (b).** We match the exact URL in the task and degrade the cadence where NOAA doesn't publish. Document this choice in `DESIGN_NOTES.md`. If she confirms she wants 0.25°, one env-var flip.
2. **Boundary convention:** covered by `WV_SCHEDULE` parsing (each range's start is excluded if previous range already emitted it). No email needed.
3. **Retention on permanent corruption:** if a cycle is genuinely unrecoverable, skip forward to the next; keep the previous good cycle until the successor succeeds. Plan in §7 does this uniformly. Worth one sentence in the email only if we end up unsure.

---

## 13. Non-goals (explicit, to avoid scope creep)

- No historical backfill. Service starts from "now" and maintains from there.
- No multi-resolution support. One grid, one cadence.
- No metrics server, no Prometheus, no Grafana. Structured logs only.
- No Docker. `python -m windvoyager` + env vars is the interface.
- No S3 uploads / downstream publishing. Local filesystem is the contract.
- No GRIB parsing ourselves. `process_file` is the black box.

---

## 14. Deliverable checklist

- [ ] `PLAN.md` (this) + `DESIGN_NOTES.md` (short, post-implementation tradeoff notes)
- [ ] `pyproject.toml` with pinned deps: `aioboto3`, `tenacity` (for backoff), `pytest`, `pytest-asyncio`
- [ ] All modules per §5
- [ ] Tests per §11, all passing
- [ ] `Makefile`: `make run`, `make test`, `make lint`
- [ ] `.env.example` with all vars documented
- [ ] README: 15-line "what/how to run"
- [ ] Answers from hiring manager on §12 reflected in code (or assumptions flagged)

---

## 15. Implementation order (when we code)

1. `schedule.py` + `test_schedule.py` — pin the spec, trivial to verify.
2. `s3_client.py` against real bucket — prove auth/download works end-to-end, small smoke test.
3. `cycle.py`, `config.py`, `manifest.py` — data shapes.
4. `download.py` + `process.py` single-file path — prove the retry/corruption handling on one file.
5. `runner.py` — wire up queues and workers for one cycle.
6. `state.py` — resume-after-crash.
7. `watcher.py` — cycle discovery loop.
8. `retainer.py` — rollover + invariant.
9. Full-system tests (§11, items 4–5).
10. `DESIGN_NOTES.md` — write the tradeoff summary *after* the code exists, so it's honest.
