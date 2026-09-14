# Phase 18: Verification + Calibration Harness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-14
**Phase:** 18-verification-calibration-harness
**Areas discussed:** Replay fixture shape, Parity check surface, Stale drill form, Calibration output

---

## Replay fixture shape

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-built rows | Hand-write ~20 sessions of 15M rows exercising gates; full control, readable | ✓ |
| Seeded generator | Seeded generator producing Asia/Judas/SMT scenarios; compact but adds generator code | |
| Extend Phase 8 seed | Extend Phase 8 seeded 60-session Judas run pattern to cover trigger+flaw verdicts | |

**User's choice:** Hand-built rows
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Every 15M close | Feed every 15M close through trigger+flaw in order; strictest no-flicker proof | ✓ |
| Session snapshots only | One verdict per session; cheaper but misses intra-session flicker | |
| Gate-relevant bars | Assert only on killzone entries, sweep bars, displacement bars | |

**User's choice:** Every 15M close
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Transition table | Forward-only legal edges (FIRING→ARMED only via SOFT downgrade); table pinned in test | ✓ |
| Sticky per session | Once FIRING, stays FIRING/INVALIDATED for the session | |
| Flaw-only regression | No backward moves except flaw-driven downgrades | |

**User's choice:** Transition table
**Notes:** None

---

## Parity check surface

| Option | Description | Selected |
|--------|-------------|----------|
| Test assertion only | Cross-assert AMD/SMT vs trigger gates in vitest; no new UI | ✓ |
| Visible parity line | Consistency line in report §3/§4 showing agreement state | |
| Contradiction chip only | Warning chip only when contradiction detected | |

**User's choice:** Test assertion only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Exact rules pinned | Pin exact contradiction rules (e.g. FIRE_SHORT vs SMT=BULLISH = fail) | ✓ |
| Reason-key level only | Looser prose-level check on reasonKey naming | |
| Warn, don't fail | Flag as warnings without failing | |

**User's choice:** Exact rules pinned
**Notes:** None

---

## Stale drill form

| Option | Description | Selected |
|--------|-------------|----------|
| Automated vitest injection | Frozen Yahoo legs + thin-tier fixtures in vitest; deterministic, CI-green | ✓ |
| Live drill doc | Human-run drill doc against live Vercel URL like v2.1 drill 6/6 | |
| Both automated + live | Automated regression in CI plus short live checklist on prod | |

**User's choice:** Automated vitest injection
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Full leg matrix | Every leg stale individually plus all-stale plus thin-tier | ✓ |
| Representative case | One representative stale case plus thin-tier; minimal | |
| Stale + rollover combo | Stale legs plus rollover-week overlap asserting HARD kill | |

**User's choice:** Full leg matrix
**Notes:** None

---

## Calibration output

| Option | Description | Selected |
|--------|-------------|----------|
| Replay summary output | Replay emits fires/week + kill-rate as JSON/CLI output vs 1–4 band; no UI | ✓ |
| Extend firing log | Extend Phase 15 firing-log calibration-JSON export with rate fields | |
| Calibration report file | Checked-in calibration report file per replay run | |

**User's choice:** Replay summary output
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Both required | Assert ≥1 FIRING and ≥1 INVALIDATED plus report band verdict | ✓ |
| Report only, no minimum | Count whatever the fixture yields honestly | |
| Firing required only | Require ≥1 FIRING, INVALIDATED optional | |

**User's choice:** Both required
**Notes:** None

---

## Claude's Discretion

None — user decided every area explicitly.

## Deferred Ideas

None — discussion stayed within phase scope.
