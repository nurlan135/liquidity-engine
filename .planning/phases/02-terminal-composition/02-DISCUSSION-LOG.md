# Phase 2: Terminal Composition - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 2-Terminal Composition
**Areas discussed:** Refresh & freshness behavior (cadence, display), Report display language, Fixture depth & interpretation, Unavailable & blocked-side presentation (look, discipline message)

---

## Refresh cadence

| Option | Description | Selected |
|--------|-------------|----------|
| 60s auto-poll + manual refresh | Poll every 60s matching proxy TTL, plus a manual refresh button | ✓ |
| Manual only | No auto-poll — user hits refresh | |
| Faster poll (15-30s) | Snappier feel, but most polls return cached data | |

**User's choice:** 60s auto-poll + manual refresh
**Notes:** Matches proxy 60s TTL exactly; faster polling would only re-read cache.

---

## Freshness display (stale & closed)

| Option | Description | Selected |
|--------|-------------|----------|
| Chart header badges | Compact LIVE/STALE/CLOSED badge + cache age in the chart header | |
| Global status strip | Thin strip under the terminal header, visible across all three panels | ✓ |

**User's choice:** Global status strip
**Notes:** Staleness must be unmissable; covers DATA-03 (never silent staleness) plus the honest weekend-closed state.

---

## Report display language

| Option | Description | Selected |
|--------|-------------|----------|
| Azerbaijani UI, English code | Report/labels/rationale in Azerbaijani; identifiers/comments English | ✓ |
| English throughout | Terminal reads English; spec terms in comments/docs only | |

**User's choice:** Azerbaijani UI, English code
**Notes:** Authentic to the operating language and the Azerbaijani spec; continues Phase 1 D-17 (English identifiers).

---

## Fixture depth

| Option | Description | Selected |
|--------|-------------|----------|
| One frozen scenario | Single realistic snapshot; static trap-vs-genuine prose | |
| Small rotating set | 2-3 snapshots (crowded-long, crowded-short, balanced), selectable/rotating | ✓ |

**User's choice:** Small rotating set
**Notes:** Shows the 60% crowded flag and pre-news flag actually responding; shapes mirror Myfxbook/ForexFactory.

---

## Unavailable look

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed in place | Panels/sections render dimmed with explicit UNAVAILABLE marker | ✓ |
| Collapsed placeholders | Unavailable areas collapse to slim placeholder bars | |

**User's choice:** Dimmed in place
**Notes:** Full 3-panel terminal shape visible from day one per design.html.

---

## Blocked side message

| Option | Description | Selected |
|--------|-------------|----------|
| Strike + terse label | Struck-through with short tag like 'BLOCKED — premium' | ✓ |
| Strike + one-line why | Strike-through plus one line explaining why | |

**User's choice:** Strike + terse label
**Notes:** Teaches at a glance, minimal text (UI-04).

---

## Claude's Discretion

Fixture snapshot contents, status-strip wording, UNAVAILABLE marker styling, poll jitter/singleflight details, component file breakdown.

## Deferred Ideas

None — discussion stayed within phase scope.
