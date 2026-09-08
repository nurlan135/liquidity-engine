---
status: awaiting_human_verify
trigger: Debug the ES poll-lifecycle bug on the live deployment (https://liquidity-engine-nine.vercel.app)
created: 2026-09-07
updated: 2026-09-08
---

# Debug Session: es-poll-lifecycle-bug

## Symptoms

- **Expected:** ES leg fetches in the browser; SMT/Asia/Judas overlays appear when data is present; empty-state behavior (no lines, per-block reasons) stays intact when legs are genuinely empty.
- **Actual (2026-09-07):** Coverage line reads `NQ 127 / ES 0 / joined 0`; status strip shows `ES …` forever, even after 2+ minutes. Network log: app fires only 3 requests at mount (NQ bare path, NQ 1h, NQ 15m) and NEVER requests `symbol=ES=F`. After ~2 min the NQ leg itself goes STALE — its 60s interval poll never fires either. ALL timers from `startDualPoll` appear dead.
- **Actual (2026-09-08 retest):** Bug DOES NOT REPRODUCE. Real Chromium vs live Vercel URL: ES lands at ~55-90s (200), coverage `NQ 126 / ES 126 / joined 126`, all staggered timeouts + 60s intervals fire. Same for local prod build.
- **Errors:** Console showed minified React error #418 (hydration mismatch) — fired on EVERY load including healthy runs (pageerror at 1.4s in the passing run). Fix (suppressHydrationWarning, commit 68d4121) is now LIVE (proven in bundle, 09-08).
- **Backend ruled out:** Direct GET /api/yahoo?symbol=ES=F&interval=1d returns 200, stale=false, n=127 — from curl AND in-page manual fetch. Not CORS/network/backend.
- **Reproduction:** Load https://liquidity-engine-nine.vercel.app in a browser (Playwright confirmed 09-07; NOT reproducible 09-08; user retest 09-08 10:0x+0400: "STILL FAILING" after ~40s — NQ LIVE, ES …, NQ 126 / ES 0 / joined 0).
- **Prime suspect (FALSIFIED):** Hydration failure remounts TerminalShell, the useEffect cleanup runs stopDualPoll, and the re-mounted poll schedule never survives. Controlled experiment (same bundle + same mismatch) shows timers survive #418 recovery.
- **Premature-observation analysis (09-08):** ES first fetch is deferred to esTimeout which targets the :30/:00-phase grid + 5-10s jitter: worst case (mount at :30.0) delayES = 65-70s; PLUS page-load + hydration + NQ-trio latency before startDualPoll arms. So ES landing at 55-90s after navigation is BY DESIGN. A ~40s "40 san əvvəl" wait is INSIDE the dead window — expected reading is exactly NQ live / ES … / ES 0. NOT a refutation.

## Files of interest

- `src/lib/store.ts` — startDualPoll/stopDualPoll, refreshES, timer module state
- `components/dashboard/terminal-shell.tsx` — poll owner useEffect (~line 129), Yenilə button wired to NQ-only refresh()
- `src/lib/session-line.ts` — minor: header "NY" label renders America/Chicago (CME_TZ), not Eastern; fix alongside if trivial
- Full diagnosis already recorded in `.planning/phases/09-composition-3-live-overlays-verify/09-COVERAGE.md` ("Visual glance" section)

## Goal

find_and_fix — prove root cause (reproduce locally or minimal case), fix ES leg fetch + keep empty-state behavior, keep `npm test` green, no route changes. Summarize: root cause, fix, files changed, verification steps.

## Current Focus

- hypothesis: CONFIRMED premature observation. Instrumented live run reproduces the user's exact 40s reading (NQ 126 / ES 0) then ES lands at +49s → 126/126/126 by 90s, zero pageerrors. Poll lifecycle healthy on fixed bundle.
- test: DONE — live-verify.mjs (removed). Fix-acceptance signals: (1) original-issue repro steps now correct — PASS (ES lands by 90s); (2) mechanism understood — PASS (delayES grid math + 40s-inside-dead-window proof); (3) adjacent features — PASS (NQ trio + intervals + 60s ES refire all green); (4) existing tests — PASS modulo pre-existing parallel flake (280/280 clean once; isolated 24/24 x3); (5) environment — PASS on live Vercel prod itself; (6) stability — 4 live runs, zero timer deaths.
- expecting: Human confirms "fixed" after a 90s+ wait. If user re-reports ES 0 after 120s+, reopen as Mandelbug recurrence (H-D/H-E).
- next_action: Request human verification with corrected wait window (90s+), then archive.
- reasoning_checkpoint:
    hypothesis: "The user's 40s 'STILL FAILING' reading is the by-design ES dead window (delayES grid + jitter puts first ES at ~45-70s), not a fix failure; the poll lifecycle is healthy on the fixed live bundle."
    confirming_evidence:
      - "Instrumented live run shows EXACT user reading at 40s (NQ 126 / ES 0 / joined 0), then symbol=ES=F fires at +49.1s and coverage reaches 126/126/126 by 90s, stable at 150s."
      - "Live chunk bytes contain suppressHydrationWarning:!0 on the session-line span; PAGEERRORS=0 / 418-COUNT=0 over 150s."
      - "All 4 staggered timeouts + all four 60s intervals armed from startDualPoll; clears={timeout:1 (internal restart), interval:0}."
    falsification_test: "If a fresh live load still shows ES 0 at 120s+ with no symbol=ES=F request in the network log, this hypothesis is wrong and the Mandelbug has recurred."
    fix_rationale: "No new code fix this round — the already-deployed suppressHydrationWarning fix is proven live; the 'failure' was a too-short observation window against a documented 55-90s ES landing design."
    blind_spots: "Did not capture response status of the +49.1s ES request (assumed 200 from coverage update); the 09-07 2-min+ death mechanism remains unexplained-by-design (Mandelbug, 4 healthy live runs since)."
    candidate_causes:
      - "code: delayES grid formula makes 40s ES-absence expected behavior, not a defect"
      - "environment: edge-cached SSR HTML + fresh deploy timing meant user tested a correct-but-slow-to-fill bundle"
    and_gate: "no — single-cause reading error; no code defect remains on the fixed bundle."
- resolution:
    root_cause: "Two layered findings. (1) PROVEN code defect (fixed, commit 68d4121, verified live): session-line clock text froze build-time clock into SSR HTML → React #418 on every load. (2) User retest 'STILL FAILING' is a premature observation: 40s wait falls inside the by-design ES dead window (delayES :30-phase grid + 5-10s jitter → first ES at ~45-70s); instrumented run reproduces the exact 40s reading then ES lands +49s → 126/126/126. The 09-07 2-min+ total timer death itself is a Mandelbug (environment-gated, 4 healthy live runs since; H-D Yahoo throttle / H-E observation artifact untestable until recurrence)."
    fix: "suppressHydrationWarning on the session-line span in terminal-shell.tsx (commit 68d4121, already deployed) — no new code change this session; verification + premature-observation proof only."
    verification: "Real Chromium vs LIVE fixed bundle 150s: 40s NQ126/ES0 (matches user report), ES fires +49.1s, 90s+150s 126/126/126, PAGEERRORS=0, 418-COUNT=0, all timers/intervals armed, ES 60s refire at +109s. npm test 280/280 clean (one parallel-contention flake in store.test.ts, 24/24 isolated x3, untouched by fix)."
    files_changed: ["components/dashboard/terminal-shell.tsx"]
- reasoning_checkpoint:
    hypothesis: "The frozen SSR clock text in the session-line span causes React hydration error #418 on every load; suppressing the expected mismatch silences the error without touching poll lifecycle."
    confirming_evidence:
      - "Fiber diff pinned the mismatch to session-line text (SSR frozen clock vs client now) in the hydration repro."
      - "Post-fix real-Chromium run vs local prod: 418-COUNT=0, coverage 126/126/126, ES lands 200."
    falsification_test: "If #418 pageerror still fires once after the fix, the hypothesis is wrong (a second mismatch source exists)."
    fix_rationale: "suppressHydrationWarning on the one clock-text span tells React the SSR/client text difference is expected; no timer, store, or effect code changes."
    blind_spots: "Did not re-verify against the live Vercel URL post-fix (deploy needed); the 09-07 transient timer death remains environment-gated and unexplained."
    candidate_causes:
      - "code: useState(() => new Date()) rendered into SSR HTML freezes build-time clock text"
      - "environment: 14.5h edge cache widens the SSR/client clock skew to hours, guaranteeing the mismatch"
    and_gate: "no — single code cause; the edge cache only widens the skew, it is not a required second condition."
- resolution:
    root_cause: "Session-line clock text rendered from useState(() => new Date()) freezes the build-time clock into SSR HTML; every client hydration computes a different now, producing React error #418 on every load. (The 09-07 timer death itself was reclassified Mandelbug/environment-gated — controlled experiments prove #418 recovery does NOT kill the poll schedule.)"
    fix: "suppressHydrationWarning on the session-line span in terminal-shell.tsx — silences the expected clock-text mismatch; poll lifecycle untouched."
    verification: "npm test 280/280; next build clean; real-Chromium vs fixed local prod: 418-COUNT=0, ES 200, coverage 126/126/126."
    files_changed: ["components/dashboard/terminal-shell.tsx"]

## Evidence

- timestamp: 2026-09-08
  checked: store.ts startDualPoll body (lines 527-592)
  found: Single startDualPoll call always arms all 4 timeouts AFTER its internal stopDualPoll; the only sync throw is invalid-clock (impossible in prod, no arg passed). Mount-immediate trio (refreshNQ/1H/15M) precedes timeout arming; ES first fetch is deferred to the :30-phase esTimeout.
  implication: The 3 observed mount requests prove startDualPoll RAN. Dead ES timeout + dead NQ interval imply stopDualPoll ran AFTER the last start (cleanup-last). No in-call path leaves timers dead.
- timestamp: 2026-09-08
  checked: terminal-shell strict ownership + all callers; time.ts/freshness.ts purity
  found: startDualPoll called ONLY terminal-shell.tsx:130 (empty-deps effect), stopDualPoll ONLY at its cleanup (line 131) + inside startDualPoll (line 529). No second mount path (page/layout single route; NqChart dynamic ssr:false never owns polls).
  implication: Only candidate kill is the mount effect's own cleanup (remount/unmount/stale-closure) or module-state loss via client remount.
- timestamp: 2026-09-08
  checked: React 19.2.8 prod bundle hydration-recovery semantics (react-dom-client.production.js)
  found: #418 = throwOnHydrationMismatch(text|HTML) → queued + throw. Recovery at ROOT (no Suspense/error boundary wraps TerminalShell) → mountHostRootWithoutHydrating = resetHydrationState + reconcileChildren → in-place client reconciliation, NOT root unmount.
  implication: #418 does NOT unmount the tree in fiber-reconciler terms.
- timestamp: 2026-09-08
  checked: REAL hydration repro — prod SSR HTML + hydrateRoot + real TerminalShell/store (dev React build, jsdom)
  found: #418 REPRODUCED with exact fiber diff — session-line text SSR "Bakı 09:17 · NY 00:17" vs client "Bakı 09:20 · NY 00:20": clock text is the mismatch source. BUT: only ONE effect START fired, ZERO cleanups; 3 mount fetches landed; lastSchedule SURVIVED; staggered fetches fired. NO timer death.
  implication: Session-line clock = the #418 source (proven). The kill mechanism is NOT hydration effect replay.
- timestamp: 2026-09-08
  checked: H-C dual-module-instance theory (Turbopack chunk split duplicating store.ts)
  found: ELIMINATED. store code exists in exactly ONE client chunk; server page.js contains zero startDualPoll.
  implication: One store instance, one timer-cell set. Kill is NOT cross-instance arming/clearing.
- timestamp: 2026-09-08
  checked: Vercel-served HTML + headers vs local build
  found: Structurally IDENTICAL app (same TerminalShell client-ref, same single flight push, no __next_error__). 14.5h edge cache (x-vercel-cache:HIT), frozen clock 17:56 Baku (build-time). NO second mismatch source in markup.
  implication: Prod-only death is NOT in the served bytes.
- timestamp: 2026-09-08
  checked: Selectors on REAL 126-row NQ data (all render-path selectors + freshness + chart mapper)
  found: ALL OK, zero throws (selectSMT/Asia/Judas honestly null on empty sibling legs).
  implication: No render-path throw unmounts the tree after set(). Eliminated.
- timestamp: 2026-09-08
  checked: No visibilityState gating in any built chunk; StrictMode disabled (reactStrictMode:null); no Offscreen in any chunk; no service worker in repo.
  found: All eliminated as kill mechanisms.
  implication: React-internals tunnel vision ends.
- timestamp: 2026-09-08
  checked: REAL Chromium vs LOCAL prod (:3101) AND vs VERCEL prod, instrumented setTimeout/setInterval/clear + requests + pageerror (repro-browser.mjs, repro-vercel.mjs)
  found: #418 FIRES in healthy runs (pageerror 1.4s, args[]=text) AND all 4 staggered timeouts arm from startDualPoll AND all fire (60s intervals) AND ES lands 200 (54-90s) → coverage 126/126/126. Zero clearTimeout/clearInterval on poll handles. Vercel bundle bytes IDENTICAL to 09-07 failing run (React 19.3.0 both; only deployment-id + minifier seeds differ). Same 8h-frozen-clock HTML, same mismatch — timers LIVE.
  implication: '#418 recovery kills timers' FALSIFIED by controlled experiment. Bug class RECLASSIFIED Bohrbug→Mandelbug (environment-gated, not reproducible 09-08). 09-07 death needs a transient cause (market-open Yahoo throttle on Vercel egress IP? observation artifact across the spontaneous 13:53 reload?).
- timestamp: 2026-09-08
  checked: Deployment state for user retest ("STILL FAILING" after ~40s). Local tree clean; 68d4121 committed AND pushed (main...origin/main in sync). Live HTML frozen clock "Bakı 10:01 · NY 01:01" matches 68d4121 commit time (10:01 +0400) — live was rebuilt/deployed AFTER the fix. Live chunk live-126o6o-b0j09f.js contains session-line span WITH suppressHydrationWarning:!0. Resume brief's "UNCOMMITTED, not deployed" premise is STALE — fix IS live.
  found: Fix IS deployed. But delayES formula ((((60-sec)%60)+30)*1000-ms+jitter, jitter 5-10s) gives worst-case first-ES ~65-70s after startDualPoll, plus load/hydration/NQ-trio latency. User's 40s wait is inside the by-design dead window — expected reading NQ live / ES … / ES 0.
  implication: Retest does NOT refute the fix. The correct verification is a 120s+ instrumented run, not a longer eyeball wait. Proceeding to run it now.
- timestamp: 2026-09-08
  checked: DECISIVE instrumented run — real Chromium vs LIVE fixed bundle, 150s, init-script timer hooks + /api/yahoo request log + pageerror listener (live-verify.mjs, removed after)
  found: Mount trio fires at +4.2s (NQ bare, 1h, 15m). 40s sample: coverage EXACTLY "NQ 126 / ES 0 / joined 0" — reproduces the user's "STILL FAILING" reading to the digit, proving it is the by-design dead window. ES first fetch fires +49.1s (symbol=ES=F&interval=1d); 90s sample: "NQ 126 / ES 126 / joined 126"; 150s: still 126/126/126 with ES 60s interval refiring at +109.1s. All 4 startDualPoll timeouts armed with on-grid delays (15.5s/45.0s/31.6s/59.7s) + all four 60s intervals armed. PAGEERRORS=0, 418-COUNT=0 (fix verified live). clears={timeout:1,interval:0} — the single timeout clear is the internal stopDualPoll-inside-startDualPoll restart, zero interval kills.
  implication: User's 40s observation is CONFIRMED premature, not a refutation. Poll lifecycle healthy on the fixed bundle; #418 gone live. The 09-07 2-min+ timer death remains a Mandelbug (transient, not reproduced in 4 live runs) — candidates H-D/H-E stand but untestable until/if it recurs.
- timestamp: 2026-09-08
  checked: npm test (full suite, 3 runs) + isolated store.test.ts (3 runs)
  found: Full suite flaky: 280/280 once, 279/280 twice — the single failure is ALWAYS store.test.ts "writes candles..." with "Test timed out in 15000ms". Fix commit 68d4121 never touched store.ts/store.test.ts (only terminal-shell.tsx + 09-COVERAGE.md). Isolated store.test.ts: 24/24 THREE times (2.3-4.8s each). The 15s timeout under 29-worker parallel load is a resource-contention flake, pre-existing and unrelated to this fix.
  implication: Test signal is green modulo a known-flaky parallel timeout. No regression from the fix.

## Eliminated

- hypothesis: Dual store module instances (Turbopack chunk split) arm/clear mismatched timer cells
  evidence: store code in exactly one client chunk; server bundle has zero startDualPoll
  timestamp: 2026-09-08
- hypothesis: Prod react bundle replays hydration effects differently from dev (START,START,STOP)
  evidence: prod commitHookEffectListMount/Unmount semantically identical to dev; jsdom+dev recovery mounts effects exactly once
  timestamp: 2026-09-08
- hypothesis: Offscreen/Suspense hide-reappear cycle runs effect cleanup without remount
  evidence: no Offscreen in any chunk; TerminalShell has no Suspense ancestor on its path
  timestamp: 2026-09-08
- hypothesis: Render-path throw after set() unmounts the tree (unguarded D1 selectors on real data)
  evidence: all render-path selectors + freshness + chart mapper run clean on real 126-row NQ data
  timestamp: 2026-09-08
- hypothesis: visibility gating / StrictMode double-effect / service worker kills timers
  evidence: no visibilityState in chunks; reactStrictMode null; no SW in repo
  timestamp: 2026-09-08
- hypothesis: Hydration #418 recovery kills the poll schedule (prime suspect)
  evidence: controlled experiment — same bundle bytes + same frozen-clock mismatch + #418 firing → all 4 staggered timeouts arm AND fire, ES lands 200, coverage 126/126/126 (3 real-Chromium runs: local ×2, Vercel ×2)
  timestamp: 2026-09-08
