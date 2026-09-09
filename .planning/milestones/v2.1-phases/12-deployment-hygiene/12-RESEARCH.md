# Phase 12: Deployment Hygiene - Research

**Researched:** 2026-09-09
**Domain:** Vercel deployment hygiene — credential/flag/branch leftover verification + removal + docs
**Confidence:** HIGH (in-repo state) / MEDIUM (Vercel dashboard mechanics)

## Summary

Phase 12 proves the v1.0 preview-drill leftovers are gone: the drill-automation Vercel API token (DEPL-01), the disabled Deployment Protection setting (DEPL-02), and the `drill-preview` branch plus `DRILL_FORCE_STALE` flag references (DEPL-03). This session verified the repo side is already clean: `src/` and `scripts/` contain zero matches for the flag/branch/token patterns, `git branch -r` shows only `origin/main`, `git show-ref` has no drill refs, and no `.env*`, `.vercel/`, or `vercel.json` exists in the repo. The remaining work is almost entirely dashboard-side (user-operated) plus documenting the intentional end state as one compact PROJECT.md row.

The key planning constraint is the division of labor: the agent has no Vercel CLI, no API token, and never touches the dashboard directly, so token deletion and protection state are proven by user readback (screenshot/pasted value per D-03, trusted confirmation per D-05), supplemented by behavioral curl probes the agent CAN run (prod 200 unauthenticated = public prod; old preview 302 to `vercel.com/sso-api` = login-required previews, the exact fingerprint observed in 03-03). The target protection state — Standard Protection with Vercel Authentication on the Hobby plan — is the Vercel default, confirmed against current Vercel docs.

**Primary recommendation:** Plan one verification-heavy wave (repo grep + branch check + history token scan, all runnable by the agent) gated on two user checkpoints (token-deletion confirmation, protection-setting readback), then a docs task (PROJECT.md row) and a live-URL re-run of the kept verify scripts as public-prod proof.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Production stays public, previews require Vercel login — live-URL checks keep working unauthenticated while preview drills stay private.
- **D-02:** "Protected" for previews means Require Vercel login (the Vercel default), not a bypass secret and not open URLs.
- **D-03:** Proof is agent-read: the agent reads back the dashboard setting (or accepts the user's screenshot/pasted value) and writes it into docs — trusted word alone is not enough.
- **D-04:** Division of labor: the user flips the dashboard switch (agent gives exact clicks), the agent verifies afterward. If the dashboard already matches, verification only. No "document now, apply later" drift.
- **D-05:** The user confirms deletion of the drill-automation token in the Vercel dashboard; the agent trusts the confirmation and documents it (no API readback).
- **D-06:** Beyond the dashboard, the agent scans shell history + env exports + repo (including git history) for token traces — nothing committed ever stays.
- **D-07:** If the drill token turns out to still be live, it is revoked/deleted during the phase — hygiene means no live drill token survives. Keeping it as "intentional" is rejected.
- **D-08:** `scripts/verify-deploy.sh` and `scripts/verify-phase9-drill.sh` are KEPT as the standard live-URL health checks for future phases — they are tooling, not remnants.
- **D-09:** The drill flag (`DRILL_FORCE_STALE` and friends) needs no removal work — already removed in 03-04. The phase greps to prove the repo is clean.
- **D-10:** The `drill-preview` branch is already gone from remote (only `main` remains). The phase re-verifies with `git branch -r`; no Vercel-dashboard preview-deployment sweep is required.
- **D-11:** The intentional state lives as a compact PROJECT.md note (table row, not a full section, not a new DEPLOYMENT.md, not SUMMARY-only): protection setting, token deletion, branch cleanup in one entry.
- **D-12:** Compact means one row: "protection: public prod + login previews; token deleted; branch gone" — no prose retelling of the drill history.

### Claude's Discretion

Exact grep patterns for the token/flag scan, verification script structure, and PROJECT.md row placement/formatting.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPL-01 | Stale Vercel token removed — no unused/exposed token remains in env or config | Token-trace scan patterns (worktree + git history + shell history + env exports) below; dashboard Tokens-page deletion is user-operated with trusted confirmation per D-05 |
| DEPL-02 | Deployment Protection leftovers resolved — protection state is intentional and documented | Target state (Standard + Vercel Authentication = Hobby default) confirmed in Vercel docs; dashboard nav path + behavioral curl fingerprints documented; PROJECT.md one-row format specified |
| DEPL-03 | drill-preview branch remnants removed — no dead branches, flags, or references to the drill preview | Branch-verification commands (incl. `ls-remote` authoritative check) + flag/branch grep patterns; repo already verified clean this session |

## Project Constraints (from CLAUDE.md / AGENTS.md)

- Repo `CLAUDE.md` contains only `@AGENTS.md`; `AGENTS.md` instructs reading guides in `node_modules/next/dist/docs/` before writing code (breaking-change warning vs training data).
- **Finding: the Next.js-docs instruction does NOT apply to this phase [VERIFIED: working-tree state this session].** Phase 12 is verification + removal + docs work (grep, `git branch -r`/`ls-remote`, curl probes, PROJECT.md row). No Next.js code, API route, or component changes are expected; `src/` and `scripts/` already grep clean. No `.env*`, `.vercel/`, or `vercel.json` exists to edit.
- **Revival condition:** if the planner adds any Next.js code/config change (e.g., touching `app/api/yahoo/route.ts`, adding `vercel.json` headers), the AGENTS.md instruction revives for that task — add a "read the relevant `node_modules/next/dist/docs/` guide first" step.
- No project skills directories exist (`/.claude/skills/`, `/.agents/skills/` both absent [VERIFIED: Glob + ls this session]) — no skill patterns to account for.
- `.gitignore` already covers `.env*`, `*.pem`, `.vercel` [VERIFIED: .gitignore:25,34,37] — token scan focuses on history/exports/committed strings, not missing files.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token deletion (dashboard Tokens page) | Vercel platform (user-operated) | — | Agent has no Vercel CLI/API access; only the account holder can revoke |
| Deployment Protection setting | Vercel platform (user-operated) | — | Project-level dashboard setting; agent verifies by readback + behavioral probe |
| Branch/flag/reference removal proof | Repo (agent) | — | Grep + git commands run locally with zero external deps |
| Intentional-state documentation | Repo docs (agent) | — | One PROJECT.md table row |
| Public-prod liveness proof | API / Backend (agent) | — | Re-run kept verify scripts against the live production URL |

## Standard Stack

This phase installs nothing. The "stack" is the verification toolchain — all present on this machine [VERIFIED: tool probes this session]:

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| git | 2.52.0.windows.1 | Branch checks (`branch -r`, `ls-remote`, `show-ref`), history token scan (`log -S`, `rev-list`) | Canonical source of branch truth |
| GNU grep | 3.0 | Worktree + history token/flag scans | Prior phases used the same grep-proof pattern (03-04) |
| curl | 8.17.0 | Behavioral protection probes (prod 200, preview 302 fingerprint) + live-URL verify scripts | Zero-dependency scripts already in repo use curl only |
| node | v24.11.1 | JSON parsing inside verify scripts | Already required by kept scripts |
| Git Bash | (present) | Runs `scripts/verify-*.sh` on this Windows box | 03-03 noted PowerShell-equivalent workaround; Git Bash `bash` is the cleaner path — confirm availability at plan time |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Vercel dashboard (user browser) | Token deletion, protection switch, setting readback | Both user checkpoints — agent never touches it |
| `scripts/verify-deploy.sh`, `scripts/verify-phase9-drill.sh` | Public-prod liveness proof after protection changes | Final verification task, unchanged per D-08 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| User dashboard readback | Vercel CLI (`vercel env ls`, project inspect) / REST API project readback | CLI is NOT installed [VERIFIED this session] and any API use needs a token — the very credential being deleted. Dashboard readback is the only viable path; do not add CLI-install tasks |
| `git branch -r` | `git ls-remote --heads origin` | `branch -r` can show stale refs; `ls-remote` is authoritative. Use both (cheap), treat `ls-remote` as the gate |

**Installation:** none — `npm install` of nothing. No new packages.

**Version verification:** N/A (no packages). Tool versions above were probed live this session.

## Package Legitimacy Audit

No external packages are installed in this phase — verification + removal + docs work only. Audit table intentionally empty; planner must NOT add install tasks. If a task needs a new tool (e.g., Vercel CLI), that is a scope deviation requiring a legitimacy check first.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

## Architecture Patterns

### System Architecture Diagram

```
User browser ──(1) flips switches──▶ Vercel dashboard ──(tokens page)──▶ drill token DELETED
                                  └─(Settings → Deployment Protection)──▶ Standard + Vercel Auth
                                          │
Agent (repo) ──(2) verifies──────▶ git branch -r / ls-remote ──▶ only origin/main ──▶ DEPL-03
             ──(3) verifies──────▶ grep worktree + git history ──▶ no flag/token traces ──▶ DEPL-01/03
             ──(4) probes────────▶ curl prod / (200, unauth) ──▶ public prod ──▶ DEPL-02
             ──(5) probes────────▶ curl preview URL (302 sso-api) ──▶ login previews ──▶ DEPL-02
             ──(6) documents─────▶ PROJECT.md one-row entry ──▶ DEPL-02
             ──(7) re-proves─────▶ verify-deploy.sh + verify-phase9-drill.sh green ──▶ no regression
```

Decision point at (1): if dashboard already matches target state → verification-only path (D-04), no switch-flip task.

### Recommended Project Structure

No new files. Touches, in order:

```
.planning/phases/12-deployment-hygiene/
├── 12-CONTEXT.md        # exists — user decisions (input)
├── 12-RESEARCH.md       # this file
└── 12-PLAN.md (+ tasks) # planner output
.planning/PROJECT.md     # append ONE row to Key Decisions table (D-11/D-12)
scripts/                 # untouched — verify scripts KEPT as-is (D-08)
```

### Pattern 1: Prove-removal-by-grep (established 03-04)
**What:** Assert absence with an exit-zero-gated grep: the command must print nothing AND exit accordingly; record the exact command + output in the summary.
**When to use:** DEPL-01/DEPL-03 clean-proof tasks.
**Example:**
```bash
# Source: established in 03-04-SUMMARY.md; patterns extended per D-06/D-09
grep -rniE 'DRILL_FORCE_STALE|drill-preview|VERCEL_TOKEN|vercel[_-]?token' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=.planning \
  . && echo "DIRTY" || echo "CLEAN"
```

### Pattern 2: Dashboard readback as evidence (D-03)
**What:** The agent pastes exact click-path instructions; the user returns a screenshot or pasted setting value; the agent transcribes the value into PROJECT.md. Trusted word alone is insufficient.
**When to use:** DEPL-02 protection proof; DEPL-01 token-deletion confirmation (trusted per D-05, still documented with date).

### Anti-Patterns to Avoid

- **Trusting the warm tree / prior summaries:** Phase 10 lesson — re-run every check live. (This research DID re-run: branch listing, greps, globs were all executed this session.)
- **Using `git branch -r` alone as remote truth:** stale remote-tracking refs linger after deletions. Always pair with `git ls-remote --heads origin`.
- **Scanning only the worktree for tokens:** D-06 explicitly requires shell history + env exports + git history. A committed-then-deleted token still lives in history.
- **Treating `.planning/` doc mentions as dirt:** historical summaries legitimately contain `DRILL_FORCE_STALE`/`drill-preview`. Scope code/config scans to exclude `.planning/` (or run two scans: strict-clean for code, expected-history for docs).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Live-URL health proof | New check script | Kept `scripts/verify-deploy.sh` (+ phase-9 drill) unchanged | Edge-progression semantics (MISS-to-HIT, stripped s-maxage) already encoded; a new script would re-learn 03-04's lesson |
| Secret scanning | Custom regex engine | Bounded `grep -E` patterns below + `git log -S` | Token formats are unknown (token value never recorded); broad-literal + pickaxe search beats a fake-precise pattern |
| Dashboard automation | Playwright/API scripting against Vercel | User click-path + readback | No credentials available to the agent; automation would need the token being deleted |
| Deployment docs page | New DEPLOYMENT.md / full section | One PROJECT.md table row (D-11/D-12) | Locked decision; prose retelling is explicitly rejected |

**Key insight:** Every automated solution to a dashboard-side problem in this phase needs the very credential being removed. The correct "tool" is a precise user instruction plus agent-side readback verification.

## Common Pitfalls

### Pitfall 1: Stale remote-tracking refs fake a dirty branch state
**What goes wrong:** `git branch -r` shows `origin/drill-preview` long after remote deletion because the local repo never pruned.
**Why it happens:** Fetch without `--prune` preserves deleted-branch refs.
**How to avoid:** Gate on `git ls-remote --heads origin` (authoritative, hits the server). Optionally `git fetch --prune` first, then `git branch -r`.
**Warning signs:** `branch -r` and `ls-remote` disagree — trust `ls-remote`.

### Pitfall 2: `.planning/` history trips the clean-grep
**What goes wrong:** A repo-wide grep for `drill-preview|DRILL_FORCE_STALE` returns dozens of hits — all in archived summaries/audits — and the task looks failed.
**Why it happens:** History documents the drill by design (03-03/03-04 summaries, milestone audit).
**How to avoid:** Two-tier scan: (a) strict CLEAN gate on code/config (`src/`, `app/`, `scripts/`, `components/`, root dotfiles, `package.json`), excluding `.planning/`; (b) informational scan of `.planning/` where hits are EXPECTED.
**Warning signs:** All hits carry `.planning/` paths — that is the expected-history signature, not dirt.

### Pitfall 3: No live preview exists to behaviorally probe
**What goes wrong:** Planner writes "curl the preview URL, expect 302 login" — but `drill-preview` is deleted, so there may be no preview deployment at all.
**Why it happens:** D-10 requires no preview-deployment sweep; previews only exist while a non-main branch is pushed.
**How to avoid:** Dashboard readback is the proof for preview protection (D-03). A curl 302-to-`sso-api` check is valid ONLY against an existing preview URL; if none exists, record "no preview deployment to probe — dashboard readback stands as proof" rather than failing the gate. Do NOT create a branch/preview just to probe it.
**Warning signs:** Preview URL returns 404 (no such deployment) vs 302 (protected) vs 200 (open) — only 200-on-preview is a fail; 404 means "nothing to probe".

### Pitfall 4: `DRILL_` prefix over-matches
**What goes wrong:** Grepping bare `DRILL` flags words like "drill" prose in docs or future-unrelated names.
**Why it happens:** Over-broad pattern.
**How to avoid:** Use the exact literals `DRILL_FORCE_STALE` plus `drill-preview` (kebab-case branch name) plus `DRILL_` prefix scan as informational-only. Exact names gate; prefix scan informs.

### Pitfall 5: Shell-history scan overreaches into other machines
**What goes wrong:** Agent tries to scan shell history that lives on the user's other terminal / expired HISTSIZE window and records "clean" without evidence.
**Why it happens:** History files are per-machine, often truncated or PowerShell (`PSReadLine`) rather than bash.
**How to avoid:** Ask the user to run one paste-ready command themselves (`grep -i vercel ~/.bash_history` / PowerShell history check) OR accept explicit user confirmation that no token was ever exported in shell (record which). Absence of a history file is "no observation", never "clean".

## Code Examples

No source-code patterns — this phase's "code" is shell verification. Copy-pasteable blocks for the planner:

### Worktree flag/branch/token scan (DEPL-01/DEPL-03)

```bash
# Source: extended from the 03-04 grep-proof pattern per D-06/D-09
# Tier (a) STRICT gate — must print nothing:
grep -rniE 'DRILL_FORCE_STALE|drill-preview|VERCEL_TOKEN|vercel[_-]?token|vercel_api' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=.planning --exclude-dir=.playwright-mcp \
  src app components scripts package.json package-lock.json .npmrc \
  .gitignore next.config.* tsconfig.* eslint* 2>/dev/null;
echo "strict-gate-exit=$? (1 = CLEAN)"
```

### Git-history token-trace scan (D-06)

```bash
# Pickaxe: which commits ever touched token-ish strings (expect: none with values)
git log --all --oneline -S 'VERCEL_TOKEN' | head -20
git log --all --oneline -S 'vercel_token' -i | head -20
# Flag history is EXPECTED (removal commits 41de201/4a7a47c are the proof, not dirt):
git log --all --oneline -S 'DRILL_FORCE_STALE' | head -20
```

### Branch-state verification (DEPL-03)

```bash
git fetch --prune origin
git branch -r            # expect: origin/HEAD + origin/main only
git ls-remote --heads origin   # authoritative: expect only refs/heads/main
git show-ref | grep -i drill || echo "NO-DRILL-REFS"
```

### Behavioral protection probes (DEPL-02)

```bash
# Public prod: must be 200 with NO auth (this is what verify-deploy.sh PAGE proves)
curl -s -o /dev/null -w 'prod-page=%{http_code}\n' https://liquidity-engine-nine.vercel.app/
curl -s -o /dev/null -w 'prod-api=%{http_code}\n' https://liquidity-engine-nine.vercel.app/api/yahoo
# Login-required preview fingerprint (observed 03-03): 302 → vercel.com/sso-api.
# ONLY valid against an existing preview URL; 404 = nothing to probe (see Pitfall 3).
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' <preview-url>
```

### PROJECT.md one-row entry (D-11/D-12)

Append to the `## Key Decisions` table in `.planning/PROJECT.md`:

```markdown
| [12] Deploy hygiene: public prod + Vercel-login previews (Standard Protection); drill token deleted <YYYY-MM-DD>; drill-preview branch gone | Intentional post-drill state, dashboard-verified | ✓ Done — DEPL-01/02/03 |
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `s-maxage` assertion on Vercel edge | `x-vercel-cache` MISS-to-HIT + Age progression | 03-04 (2026-09-06) | Kept verify scripts already encode this; reuse, don't re-derive |
| Preview drill with env flag | Flag removed, removal proven by grep + tests | 03-04 (2026-09-06) | Phase 12 only re-proves; no removal work expected |
| Protection disabled project-wide (drill) | Standard + Vercel Auth (Hobby default) | This phase (user flips) | Restores the default; prod stays public on Hobby regardless |

**Deprecated/outdated:** nothing in this phase's scope. (`yahoo-drill.test.ts` already deleted in 03-04; both verify scripts are current.)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel dashboard Tokens page lives under account settings and shows a deletable token list; deletion takes effect immediately | Architecture Patterns (Pattern 2) | LOW — user operates the page live; exact clicks confirmed at execution. If layout differs, user adapts and readback still works |
| A2 | Git Bash `bash` is available to run `scripts/verify-*.sh` on this Windows box (03-03 noted bash was absent, used PowerShell equivalents) | Standard Stack | MEDIUM — if absent, planner must use PowerShell-equivalent curl checks; verify scripts can't run unmodified |
| A3 | The production URL `https://liquidity-engine-nine.vercel.app` is unchanged since 03-04 | Code Examples (probes) | LOW — one-line fix at execution if renamed; PROJECT.md confirms it |
| A4 | No new preview deployment exists to probe (branch deleted) | Pitfall 3 | LOW — if a preview DOES exist, the 302-probe becomes runnable and strengthens proof; plan should branch on existence |
| A5 | Production remaining public is automatic on Hobby (protecting prod needs Pro/Enterprise), so "public prod" needs no switch — only verification | Summary / DEPL-02 | MEDIUM — confirmed in current Vercel docs [CITED], but if the project was upgraded to Pro, All-Deployments could cover prod; readback must confirm scope = Standard, not All |

## Open Questions

1. **Does any preview deployment currently exist to probe?**
   - What we know: `drill-preview` branch is gone; D-10 requires no dashboard sweep.
   - What's unclear: whether Vercel retains the old preview deployment URL in a probed state.
   - Recommendation: plan probes preview ONLY if the user supplies an existing preview URL; otherwise dashboard readback is the sole preview proof (Pitfall 3).

2. **Was the drill token ever exported in shell history / `.env` / CI?**
   - What we know: repo has no `.env*`/`.vercel/`; worktree greps clean (this session).
   - What's unclear: per-machine shell history and env exports are outside agent reach.
   - Recommendation: planner includes a user checkpoint with a paste-ready history-check command (Pitfall 5), or records explicit user confirmation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| git | Branch + history checks | ✓ | 2.52.0.windows.1 | — |
| grep | Token/flag scans | ✓ | 3.0 (GNU) | — |
| curl | Protection probes + verify scripts | ✓ | 8.17.0 | — |
| node | Verify-script JSON parsing | ✓ | v24.11.1 | — |
| npm / npx | Test runner (`npm test`) if re-proved | ✓ | 11.6.2 | — |
| Git Bash (`bash`) | Running `scripts/verify-*.sh` unmodified | ? | — | PowerShell-equivalent curl checks (03-03 precedent) — confirm at plan time (A2) |
| Vercel CLI | Dashboard-state readback | ✗ | — | User dashboard readback (only path; D-03/D-05) |
| Vercel dashboard | Token deletion + protection switch | user-side | — | None — blocking user checkpoints |

**Missing dependencies with no fallback:**
- Vercel dashboard access (user-gated) — planner MUST model the two user checkpoints as blocking tasks, not background items.

**Missing dependencies with fallback:**
- Vercel CLI (fallback: dashboard readback + curl probes); Git Bash if absent (fallback: PowerShell equivalents).

## Validation Architecture

`workflow.nyquist_validation` is `true` [VERIFIED: .planning/config.json:24] — this section is required. This phase ships no source changes, so validation is command-evidence, not unit tests.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 5 (+ node 24) |
| Config file | `vitest.config.ts` (include: `src/**/*.test.ts`, `app/**/*.test.ts`) |
| Quick run command | `npm test -- --run <touched-area>` (no touched area expected) |
| Full suite command | `npm test` (283/283 green at v2.0 ship; re-run only if any source file changes) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPL-01 | No token/flag strings in code/config | shell-grep gate | strict worktree grep (prints nothing, exit 1) | ✅ N/A — ad-hoc command, record output |
| DEPL-01 | No token values in git history | shell-grep gate | `git log --all -S 'VERCEL_TOKEN'` (expect empty) | ✅ N/A — ad-hoc, record output |
| DEPL-02 | Protection = Standard + Vercel Auth | manual (dashboard readback) | user screenshot/pasted value → PROJECT.md | ❌ Manual-only — no API/CLI surface available to agent |
| DEPL-02 | Prod publicly reachable unauthenticated | shell (curl) | `verify-deploy.sh $PROD_URL` PAGE + ENVELOPE green | ✅ `scripts/verify-deploy.sh` exists, kept per D-08 |
| DEPL-03 | Only `origin/main` remote ref | shell (git) | `git ls-remote --heads origin` (only `refs/heads/main`) | ✅ N/A — ad-hoc, record output |
| DEPL-03 | No flag/branch refs in code/config | shell-grep gate | strict worktree grep (same as DEPL-01) | ✅ N/A — ad-hoc, record output |

### Sampling Rate

- **Per task commit:** re-run the task's own gate command (grep / git / curl) and paste output into the task summary.
- **Per wave merge:** full strict-grep + `ls-remote` + `verify-deploy.sh` green.
- **Phase gate:** all six rows above evidenced before `/gsd-verify-work`.

### Wave 0 Gaps

- None — no new test files, fixtures, or framework installs needed. If any source file is touched (unexpected), add `npm test` green + `npm run lint` clean as gate items.

## Security Domain

`security_enforcement` is `true`, ASVS level 1 [VERIFIED: .planning/config.json:47-48]. This phase IS security hygiene (credential + access-control surface).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (platform) | Vercel Authentication on previews (Standard Protection); no app-level auth exists or is needed |
| V3 Session Management | no | No sessions in scope |
| V4 Access Control | yes | Prod-public / preview-login scope split; verify scope = Standard, not All-Deployments (A5) |
| V5 Input Validation | no | No inputs in scope |
| V6 Cryptography | no | No crypto in scope — never hand-roll; N/A |
| V14 Configuration | yes (L1-adjacent) | No secrets in env/config/repo; `.gitignore` covers `.env*`/`.pem`/`.vercel` |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Exposed Vercel API token (dashboard-created drill token) | Information Disclosure / Elevation | Delete/revoke in dashboard (D-05/D-07); history + shell + env scan (D-06) |
| Disabled Deployment Protection left open | Information Disclosure (preview exposure) | Re-enable Standard + Vercel Auth; readback proof (D-01–D-04) |
| Bypass-secret instead of login (D-02 rejects) | Elevation (shared secret leaks) | Vercel Authentication, no `VERCEL_AUTOMATION_BYPASS_SECRET` created |
| Dead branch redeployed / preview resurrected | Tampering | Remote ref deletion verified via `ls-remote`; no dashboard sweep needed (D-10) |

## Sources

### Primary (HIGH confidence)

- In-repo verification this session: `git branch -r` / `show-ref` (only `origin/main`), worktree greps over `src/` + `scripts/` (zero matches), Globs (no `.env*`/`.vercel/`/`vercel.json`), tool probes (git/curl/node/npm/grep versions), `vitest.config.ts`, `.planning/config.json`, `.gitignore`.
- 03-03-SUMMARY.md / 03-04-SUMMARY.md — drill mechanics, 302-to-`sso-api` fingerprint, token/protection/branch follow-ups, edge-progression pattern.

### Secondary (MEDIUM confidence)

- [Vercel Deployment Protection docs](https://vercel.com/docs/deployment-protection) (fetched 2026-09-09, last-updated 2026-08-28): Hobby = Vercel Auth + Standard available, prod stays public; settings at Dashboard → project → Settings → Deployment Protection; methods (Vercel Auth / Passport / Password / Trusted IPs) and scopes (Standard / All / Legacy).
- [Vercel bypass-protection docs](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) (fetched 2026-09-09): bypass-secret mechanics — cited to justify why D-02 rejects the bypass-secret option.

### Tertiary (LOW confidence)

- WebSearch for dashboard mechanics returned no usable results; token-page exact layout is [ASSUMED] (A1) — mitigated by user operating the page live.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every tool probed live; no installs needed.
- Architecture: HIGH — division of labor locked in CONTEXT.md; Vercel mechanics confirmed in current official docs.
- Pitfalls: HIGH — derived from actual 03-03/03-04 incidents (stale refs, stripped headers, cold-cache 502), not theory.

**Research date:** 2026-09-09
**Valid until:** 2026-10-09 (stable domain; Vercel dashboard layout is the only drift risk — re-confirm click paths at execution)
