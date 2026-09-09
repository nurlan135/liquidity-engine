# Milestones

## v2.1 Cleanup & Polish (Shipped: 2026-09-09)

**Phases completed:** 4 phases, 7 plans, 12 tasks

**Key accomplishments:**

- Root layout props swapped to the plain children ReactNode form — clean-checkout tsc exits zero with zero runtime change.
- Crisp HiDPI chart via library-native autosize with view-lock plus overlay; redraws cleanly on resize with zero console errors — UAT 6/6 pass.
- Worktree CLEAN on strict gate, only refs/heads/main on authoritative ls-remote, token-free history outside planning docs, prod page + API 200 unauthenticated — zero files modified
- Drill token deleted 2026-09-09, protection reads Standard Protection plus Vercel Authentication, shell history clean — user-confirmed per blocking-human gates
- Both kept scripts green against live prod after the dashboard change, scripts byte-identical, one intentional-state row in PROJECT.md — DEPL-01/02/03 closed
- Tested pure thin-tier truth module plus the persistent thin-history banner plumbed through the shell into the chart prop
- Live zone opacity plus uniform provisional dimming on thin tiers, with markers, Asia, and candles at full strength
- Asia killzone 20:00–23:45 plus fallback to last completed session (en passant fix, edbc70a)

**Closeout:** override_closeout — Known verification overrides: 2 newly acknowledged (10-UAT.md, 13-UAT.md: both `passed` with 0 pending scenarios, scanner status-label artifacts reviewed clean), 1 carried forward from v1.0 (see STATE.md Deferred Items). Phases 10–12 read "stale" in init.manager only because the milestone audit's own CHRT-01/02 checkbox flips post-dated their recorded digests; all VERIFICATION.md files report passed (5/5, 9/9, 8/8, 17/17). Milestone audit v2.1-MILESTONE-AUDIT.md: 7/7 requirements, 9/9 integration, 3/3 flows; 7 non-blocking tech-debt items recorded.

---

## v2.0 Modul 3 (Liquidity Sequencing & SMT) (Shipped: 2026-09-08)

**Phases completed:** 4 phases, 14 plans, 32 tasks

**Key accomplishments:**

- Route GET branches 1d to fetchSymbol and 1h/15m to fetchIntraday after the allowlist guards, closing the VERIFICATION.md root cause with two pinning route tests
- Tracer plus hardening for the time-anchored SMT comparator: fractal-k swing matching, bps compare with sweeper label, 20-day correlation gate, and joint NQ/ES rollover suppression — 17/17 tests green, full suite 182/182
- NQ D1 FVG inventory with close-through mitigation and a 20-gap bound, sweep-then-reject ERL/IRL flip, and a deterministic §2 delivery-sentence builder — all pure, all pinned by 16 vitest cases
- Pure aggregate.ts synthesizes complete 4-candle 4H blocks on the 18:00 ET grid with per-candle IANA wall-clock resolution, emitting reused Candle shapes for unchanged range/bias math.
- Asia Range 20:00-00:00 NY wick-to-wick tracer on 1H NQ rows with DST triple-test green, plus D-01 conforming edits in both canonical files
- Three-gate London Judas detector (ICT-13) with candidate/confirmed/preRun vocabulary plus a seeded 60-session budget run at 16.7 percent confirmed — full suite 239/239 green
- AMD phase classifier fusing Asia Range plus Judas plus read-only SMT with exact Azerbaijani reasons and an honest NY marker
- Live rule-based report §3 (Engineered Liquidity Path, SMT Divergence Status, Session AMD Timing) with per-block verbatim reasons, Asia overlay + Judas/SMT markers, conviction tier line — drill 6/6 PASS on live Vercel URL, visual glance re-verify PASS human-confirmed
- ICT-11 closure: `selectRange4H` wires the orphaned 4H aggregate into §2 (`s2-range-4h` line); 08/09 VERIFICATION.md written retroactively; all 15 requirements Complete; suite 283/283, tsc clean

---

## v1.0 Live Terminal (Shipped: 2026-09-06)

**Phases completed:** 5 phases, 16 plans, 36 tasks

**Key accomplishments:**

- Complete deterministic Module 2 math core: EQ/quadrant/OTE levels, close-only re-anchor table, rationale-bearing bias, single named Primary DOL, Wilder-ATR regime, and 3xATR rollover tripwire — 43/43 tests green.
- Hardened NQ=F proxy with query1/query2 failover, jittered backoff honoring capped Retry-After, singleflight dedupe, 60s cache with stale-serve and honest 502s, plus the null-row fixture and the full Baku DST suite — 67/67 tests green.
- Baku-aware deriveStatus/formatStripAge with a ticking StatusStrip, plus zoneBands geometry feeding a ZoneFillPrimitive on NqChart with honest STALE/CLOSED overlays
- Three rotating scenario snapshots with a tested shape guard plus resolver, a SentimentPanel with True AVG footer plus crowded chip plus scenario switcher, and a CalendarPanel with Baku countdowns plus pre-news flags plus verbatim trap-vs-genuine prose.
- Six-section report with live section 2 and struck-through blocked side, composed into a fully wired TerminalShell owning the 60s visibility-gated poll loop with coalesced Azerbaijani failure toasts — full suite green at 103 tests.
- Zero-dependency live-URL checklist plus temporary serve-stale kill-switch, both proven — script passes five checks against a local production build, drill flag proven under unit test.
- Default branch renamed master to main end to end — local main tracks origin/main, GitHub default retargeted, origin/master deleted.
- Production live on Vercel with edge cache proven, preview kill-drill executed with loud 502 on cold cache, flag removed via API and preview reverified clean with zero env vars left.
- Drill flag and drill test removed with lint plus 103 tests green, verify script corrected for Vercel edge behavior, production gate fully green with D-10 rendering spot-checks recorded.
- selectLevels orphan wired end to end — mapper helper, shell subscription plus pass-through, and four thin dashed quadrant/OTE price-lines with happy-path plus edge proof
- Closed-only last close shared by position/bias/DOL/levels, immediate STALE with clean recovery, and the dead re-anchor detector replaced by a rolling-recompute rule-table — full suite 108/108 green.
- Chart header carries the strip's own freshness truth (LIVE age, STALE age, BAZAR BAGLIDIR) via deriveStatus plus formatStripAge, and verify-deploy.sh checks the stale/502, Baku-date, and banner-slot contracts on every run regardless of calendar luck.
- Phase 1 verification gate written retroactively and scored 10/10 — ICT-01 claim recorded with wiring cited, all 8 audit partials resolved to satisfied with residuals, every row triangulating code lines plus test lines plus green-suite output

---
