# Phase 1: Data Foundation & ICT Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 1-Data Foundation & ICT Core
**Areas discussed:** Proxy contract & failure behavior, Range anchor & re-anchor rules, Bias / DOL / Regime thresholds, Code shape & verification

---

## Proxy contract & failure behavior

| Option | Description | Selected |
|--------|-------------|----------|
| NQ=F D1 fixed | Simplest proxy, matches DATA-01 exactly. Multi-symbol (PROD-01) is a v2 concern. | ✓ |
| Parameterized + allowlist | Accept ?symbol=&range= but validate against an allowlist (NQ=F, D1 only for now) — future-ready contract. | |
| 502 structured error | HTTP 502 with {error, retryAfter}. Never fake candles; Phase 2 renders an honest closed/error state. | ✓ |
| 200 empty + stale flag | HTTP 200 with {candles: [], stale: true}. Chart shows empty with a stale badge instead of an error. | |
| Include, flagged forming | Last row carries forming:true. Live feel; ICT math uses closed candles for anchors. | ✓ |
| Closed candles only | Strictest correctness — bias never sees an incomplete candle, chart lags intraday. | |

**User's choice:** Fixed NQ=F D1; 502 on cold failure; forming candle included with forming:true.
**Notes:** All three questions took the recommended option. Envelope shape {candles, lastUpdatedISO, stale, source} carried forward from roadmap/research — not re-asked.

---

## Range anchor & re-anchor rules

| Option | Description | Selected |
|--------|-------------|----------|
| N-candle extremes | Range = highest high / lowest low over explicit window (e.g. 20D). Simple, deterministic, testable; window + asOf passed in explicitly. | ✓ |
| Structural swings | Anchors on confirmed swing points (fractal/pivot logic). More ICT-authentic, but needs swing-confirmation rules defined. | |
| Close beyond extreme | Only a D1 close beyond high/low re-anchors. Wick piercings are liquidity raids, not breaks — matches roadmap ICT-03. | ✓ |
| Wick touch counts | Any high/low piercing the extreme retires the range immediately. More reactive, more churn. | |
| Flag + keep range | Set rolloverSuspect:true with contractHint + warning, but keep computing off current anchors until a real close-break confirms. | ✓ |
| Flag + freeze bias | Keep zones but degrade bias to COMPRESSION with a rollover rationale until the range re-anchors. | |

**User's choice:** N-candle extremes; close-break re-anchor; rollover flag-and-continue.
**Notes:** Core-value area (wrong anchors = wrong everything). Window length N, ATR multiplier left to researcher discretion.

---

## Bias / DOL / Regime thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Buffer band ±2% | Position 0.48–0.52 reads COMPRESSION/equilibrium-fair. Avoids bias flicker when price hugs EQ. | ✓ |
| Exact 0.5 split | Above = premium-leaning, below = discount-leaning. Simplest rule, but bias flips on noise near EQ. | |
| Opposite extreme | Bullish → range high / PDH side; bearish → range low / PDL side. Draw toward the opposing liquidity. | ✓ |
| Nearest HTF level | DOL = nearest external liquidity (BSL/SSL, prior high/low) in the bias direction's path. | |
| ATR-based | Current ATR vs its own N-period average — elevated = Expansion, contracted = Compression. Standard, smooth. | ✓ |
| Daily-range average | Mean of last N daily ranges vs prior N — no ATR smoothing, fewer moving parts. | |

**User's choice:** ±2% EQ buffer; opposite-extreme DOL; ATR-based regime.
**Notes:** All recommended options. Exact ATR periods at researcher discretion.

---

## Code shape & verification

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest | Native Vite/Next-friendly, fastest for TS pure-function suites. Adds one devDependency. | ✓ |
| Node built-in test runner | Zero new dependencies (node:test + assert). Leanest, slightly less DX. | |
| One concept per file | range.ts, levels.ts (EQ/quadrants/OTE), bias.ts, dol.ts, regime.ts, rollover.ts + types.ts. Each independently testable. | ✓ |
| Fewer bundled modules | E.g. dealing-range.ts (range+levels) + market-state.ts (bias+DOL+regime). Fewer files, larger reviews. | |
| Strict purity | Pure math only — no fetch, Date.now, Intl, or store imports. Formatting lives at the display edge. | ✓ |
| Loose purity | Intl formatting allowed inside ict for convenience; only fetch/Date.now banned. | |

**User's choice:** Vitest; one-concept-per-file; strict purity (no I/O, time, Intl).
**Notes:** No test runner installed today — vitest is a new devDependency. `src/lib/ict` migration + `@/*` alias update baked into Phase 1.

---

## Final check

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write CONTEXT.md now; leave window lengths/ATR periods/multipliers to researcher discretion. | ✓ |
| Explore more gray areas | Discuss numeric parameters (N-candle window, ATR periods, rollover multiplier, rationale language) now. | |

**User's choice:** Ready for context — numerics to researcher discretion.

## Claude's Discretion

Numeric parameters (N-candle window, ATR periods, rollover multiplier, backoff schedule, rationale-string language) — user explicitly deferred to researcher/planner.

## Deferred Ideas

None — discussion stayed within phase scope.
