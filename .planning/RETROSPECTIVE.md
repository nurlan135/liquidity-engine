# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Live Terminal

**Shipped:** 2026-09-06
**Phases:** 5 (1, 2, 3 + inserted 03.1, 03.2) | **Plans:** 16 | **Commits:** 152 | **Timeline:** 3 days (2026-09-04 → 2026-09-06)

### What Was Built
- Resilient NQ=F Yahoo proxy: query1→query2 failover, jittered backoff honoring Retry-After, serve-stale fallback, 60s CDN TTL — never silent
- Pure-function ICT core (`src/lib/ict`): range/EQ + position, quadrant/OTE levels, bias with rationale, single named DOL, ATR regime, 3×ATR rollover tripwire — closed-only basis throughout
- Full dark terminal: 3-panel shell, live lightweight-charts v5 chart (zones + EQ/DOL + Q1/Q3/OTE lines + rollover banner + stale/closed overlays), 6-section institutional report, sentiment/calendar fixture panels
- Live on Vercel Hobby: edge cache verified, stale-serve drill green, live-URL checklist passed (https://liquidity-engine-nine.vercel.app)
- Retroactive Phase 1 gate 10/10 + ICT-01 claim + ICT-02 render + W1/W2/F2 honesty fixes (closure phases 03.1, 03.2)

### What Worked
- Backend-first phasing (proxy+math → composition → deploy-verify): Phase 2/3 built on trusted numbers, no rework of math after UI
- Truth-row verification style (file:line + test:line + command per row) made the retroactive gate credible instead of ceremonial
- Inserted decimal phases (03.1, 03.2) closed audit gaps surgically without replanning the milestone
- Integration checker re-run at re-audit confirmed all 5 prior gaps resolved in code + found only 1 display-only warning

### What Was Inefficient
- Phase 1 shipped without its VERIFICATION.md — the most expensive gap in the milestone (required a full 4-plan retroactive closure phase)
- Two `human_needed` gates lingered on completed UAT evidence — status fields not flipped at UAT time, flagged scanners at close
- Pre-close audit surfaced a stale scanner hit (02-UAT `[passed]` with 0 pending) requiring an acknowledge cycle

### Patterns Established
- Selector guard: empty/bad input returns null before math (honest degrade, never false-flag)
- Closed-only basis: every close derivation filters through closedOnly; forming candle renders but never computes
- Stale latch discipline: catch sets stale:true + lastError, preserves candles; success restores envelope truth
- Deploy steps assert contracts statically (502 shape, date shape, slot hooks) — never live-kill drills
- Shell stub-prop tests pin selector-to-prop mapping instead of canvas inspection under jsdom

### Key Lessons
1. Write the verification gate in the same phase as the work — a retroactive gate costs a full closure phase.
2. Flip verification status at UAT time — stale `human_needed` fields compound into close-time friction.
3. Small inserted phases beat milestone replanning for audit gaps — decimal numbering kept history legible.

### Cost Observations
- Sessions: milestone spanned ~3 days, 16 plans, 152 commits
- Notable: closure phases (03.1: 1 plan, 03.2: 4 plans) were ~30% of plan count — all attributable to the missing Phase 1 gate

---

## Milestone: v2.0 — Modul 3 (Liquidity Sequencing & SMT)

**Shipped:** 2026-09-08
**Phases:** 4 (6, 7, 8, 9) | **Plans:** 14 | **Tasks:** 32 | **Timeline:** 3 days (2026-09-06 → 2026-09-08)

### What Was Built
- Dual-symbol proxy: parameterized `?symbol=&interval=` (ES=F daily + NQ/ES 1H/15M), per-leg stale envelopes, staggered 4-leg polling, timestamp inner-join with coverage
- SMT comparator: time-anchored swing pairs, BULLISH/BEARISH/NO-SIGNAL, 20-day correlation gate, joint rollover suppression — both deferred review criticals fixed and wired
- FVG map + sweep-then-reject ERL/IRL + §2 delivery sentence; NY-anchored 1H→4H synthesis consumed by `selectRange4H` §2 line (ICT-11 closure)
- Asia Range (20:00–00:00 NY, DST triple-test) + three-gate London Judas (budget ≤25%) + AMD classifier fusing range+Judas+SMT
- Live §3 (Liquidity Path, SMT Status, Session AMD) with verbatim reasons + Asia/Judas/SMT overlays + conviction tiers — drill 6/6 PASS, glance re-verify PASS human-confirmed
- Audit remediation: retroactive 08/09 VERIFICATIONs, 06 re-verification (digest refresh), all 15 requirements Complete — suite 283/283, tsc clean

### What Worked
- Phase-level VERIFICATIONs (06/07) held up at audit — the two missing ones (08/09) were the only formal gaps, substance was green
- Integration checker found the one real gap (orphaned 4H aggregate) that phase verifications each missed — cross-phase wiring checks earn their keep
- covered_digest fingerprint caught a genuinely stale report (post-closure store.ts edit) — content-grounded staleness works, and recompute-via-node is the correct refresh path
- Debug session discipline (es-poll-lifecycle): Bohrbug→Mandelbug reclassification with falsified suspect documented, not silently closed

### What Was Inefficient
- 06-VERIFICATION digest refresh took two attempts (PowerShell SHA256 reimplementation mismatched; node canonical recompute matched) — always recompute with the tool's own runtime
- CLI `milestone.complete` misparsed completed phases (`--force` needed); MILESTONES.md got a duplicate empty entry requiring manual cleanup
- 08/09 VERIFICATIONs missing at phase time repeated the v1.0 lesson (lesson 1, unverified) — the pattern is known, adherence is the gap

### Patterns Established
- Refuse-with-reason envelope for every selector: stale/empty/thin → null, reason rides in owning leg `lastError`, render reads verbatim
- Slot-contract probing for live drills: assert presence paths, never live signal visibility (session-state dependent)
- Fail-closed drill scripts (exit 1 on first failure, exit 2 on missing URL) — no partial PASS masquerades

### Key Lessons
1. Cross-phase handoff promises ("ready for Phase 8 selectors") need a consumer check at the producing phase's verification — otherwise orphans hide until audit.
2. Fingerprint digests must be refreshed with the same runtime that verifies them — hand-rolled reimplementations drift.
3. Retroactive verification is cheap when UAT + review-fix + security records exist — the expensive case is missing evidence, not missing files.

### Cost Observations
- Sessions: milestone spanned ~3 days, 14 plans, 32 tasks
- Notable: audit remediation (ICT-11 closure + 2 VERIFICATIONs + re-verify) was ~1 session — far cheaper than v1.0's 5-plan retroactive gate, because evidence existed

---

## Milestone: v2.1 — Cleanup & Polish

**Shipped:** 2026-09-09
**Phases:** 4 (10, 11, 12, 13) | **Plans:** 7 | **Tasks:** 12 | **Commits:** 67 | **Timeline:** 2 days (2026-09-08 → 2026-09-09)

### What Was Built
- Zero-error TypeScript via one-line LayoutProps fix — clean-checkout `tsc --noEmit` green, prod build green, pixel-identical runtime
- Crisp HiDPI chart: library-native autosize + view-lock + no-RO fallback gate, overlays/chrome byte-identical — UAT 6/6
- Vercel hygiene: drill token deleted 2026-09-09, Standard Protection intentional + documented in PROJECT.md, drill-preview branch gone, prod 200/200, kept scripts green — UAT 6/6
- Honest thin history: thin-tier truth module + persistent thin-first banner + uniform 0.5 zone/level dimming, Asia at accent/stale tone — 17/17 verified, UAT 2/2, 298/298 tests
- Asia killzone 20:00–23:45 + last-completed-session fallback (en passant fix, edbc70a)

### What Worked
- Every phase wrote its VERIFICATION.md at phase time — zero retroactive gates for the third milestone running (v1.0's lesson 1 finally holding)
- Milestone audit's 3-source cross-reference (VERIFICATION × SUMMARY frontmatter × REQUIREMENTS) caught genuinely stale checkboxes (CHRT-01/02) and flipped them with evidence cited
- Integration checker confirmed Phase 13's chart edits coexist with Phase 11's autosize (zero viewport calls added, single-branch dimming) — ordered-after-11 sequencing paid off

### What Was Inefficient
- UAT scanner flags `status: passed` as gap while accepting `status: complete` — same false positive as v1.0's 02-UAT, requiring another acknowledge cycle (third occurrence; scanner convention still undocumented)
- init.manager read phases 10–12 "stale" at close because the audit's own checkbox flips post-dated their digests — self-inflicted staleness from auditing before closing
- 13-VALIDATION.md never reconciled (status=draft) — validate-phase skipped for the milestone's largest phase; coverage TODO carried as debt

### Patterns Established
- Order shared-component phases explicitly (polish first, dependent path after) — Phase 13 depended on 11 and merge friction was zero
- Dashboard-verified states get a one-row PROJECT.md intentional-state record (Phase 12's D2) — settings outside the repo stay auditable
- En passant fixes (Asia killzone edbc70a) ride with a named commit + audit note, not a new phase — proportionate to blast radius

### Key Lessons
1. Audit-then-close ordering creates digest staleness by construction — either freeze REQUIREMENTS.md before phase verifications or accept override_closeout as the normal path for audited milestones.
2. The UAT `passed` vs `complete` status convention needs a single documented meaning — three milestones of false-positive acknowledges is a process bug, not bad luck.
3. Small cleanup milestones (7 plans, 2 days) close with near-zero remediation when verification is written at phase time — the v1.0 tax is fully amortized.

### Cost Observations
- Sessions: milestone spanned 2 days, 7 plans, 67 commits, 61 files +6984/−95
- Notable: close-time friction was two benign acknowledges (~15 min) vs v1.0's 5-plan retroactive gate — verification-at-phase-time is the whole difference

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 days | 5 | Baseline: backend-first + truth-row gates + decimal insertions |
| v2.0 | ~3 days | 4 | + integration checker catches cross-phase orphans; + fingerprint staleness; + fail-closed drills |
| v2.1 | 2 days | 4 | + verification-at-phase-time holds (zero retroactive gates); + 3-source audit cross-ref; + shared-component phase ordering |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 133/133 green, lint clean | 20/20 reqs, 5/5 flows | 0 new deps (chart-mapper helper only) |
| v2.0 | 283/283 green, tsc clean | 15/15 reqs, 8/8 flows | 0 new deps |
| v2.1 | 298/298 green, tsc clean | 7/7 reqs, 3/3 flows | 0 new deps |

### Top Lessons (Verified Across Milestones)

1. Write the verification gate in the same phase as the work — v1.0 paid 5 plans, v2.0 paid ~1 session (evidence existed both times; missing files are cheap, missing evidence is expensive).
2. Flip verification status at UAT time — stale fields compounded into close-time friction in both milestones.
