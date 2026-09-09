# Phase 12: Deployment Hygiene - Context

**Gathered:** 2026-09-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 clears Vercel leftovers from the v1.0 preview drill: the drill-automation API token, the disabled Deployment Protection setting, and the `drill-preview` branch. Verification + removal work, split between repo (grep/branch checks) and the Vercel dashboard (token + protection state). The ICT math, chart, proxy, and report are untouched — this phase proves the deployment surface is clean and documents the intentional protection state.

</domain>

<decisions>
## Implementation Decisions

### Protection final state
- **D-01:** Production stays public, previews require Vercel login — live-URL checks keep working unauthenticated while preview drills stay private.
- **D-02:** "Protected" for previews means Require Vercel login (the Vercel default), not a bypass secret and not open URLs.
- **D-03:** Proof is agent-read: the agent reads back the dashboard setting (or accepts the user's screenshot/pasted value) and writes it into docs — trusted word alone is not enough.
- **D-04:** Division of labor: the user flips the dashboard switch (agent gives exact clicks), the agent verifies afterward. If the dashboard already matches, verification only. No "document now, apply later" drift.

### Token verification
- **D-05:** The user confirms deletion of the drill-automation token in the Vercel dashboard; the agent trusts the confirmation and documents it (no API readback).
- **D-06:** Beyond the dashboard, the agent scans shell history + env exports + repo (including git history) for token traces — nothing committed ever stays.
- **D-07:** If the drill token turns out to still be live, it is revoked/deleted during the phase — hygiene means no live drill token survives. Keeping it as "intentional" is rejected.

### Drill scripts and remnants
- **D-08:** `scripts/verify-deploy.sh` and `scripts/verify-phase9-drill.sh` are KEPT as the standard live-URL health checks for future phases — they are tooling, not remnants.
- **D-09:** The drill flag (`DRILL_FORCE_STALE` and friends) needs no removal work — already removed in 03-04. The phase greps to prove the repo is clean.
- **D-10:** The `drill-preview` branch is already gone from remote (only `main` remains). The phase re-verifies with `git branch -r`; no Vercel-dashboard preview-deployment sweep is required.

### Documentation home
- **D-11:** The intentional state lives as a compact PROJECT.md note (table row, not a full section, not a new DEPLOYMENT.md, not SUMMARY-only): protection setting, token deletion, branch cleanup in one entry.
- **D-12:** Compact means one row: "protection: public prod + login previews; token deleted; branch gone" — no prose retelling of the drill history.

### Claude's Discretion
- Exact grep patterns for the token/flag scan, verification script structure, and PROJECT.md row placement/formatting.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — DEPL-01 (token removed), DEPL-02 (protection intentional + documented), DEPL-03 (drill-preview remnants removed).
- `.planning/ROADMAP.md` — Phase 12 goal, success criteria, DEPL-01/02/03 mapping.

### Drill history (why these leftovers exist)
- `.planning/milestones/v1.0-phases/03-production-deploy-verification/03-03-SUMMARY.md` §Preview drill + §Deployment Protection note — drill ran on `drill-preview` branch with preview-scoped flag; protection was disabled project-wide by the user to expose the preview; token deletion + protection decision + branch deletion explicitly left as user follow-ups.
- `.planning/milestones/v1.0-phases/03-production-deploy-verification/03-04-SUMMARY.md` — flag + drill test removed; branch deletion noted but not executed from the worktree (left for main checkout).
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — user-setup leftovers list (token deletion, protection decision, branch deletion) accepted as tracked debt for this milestone.

### Scripts kept (not removed)
- `scripts/verify-deploy.sh` — generic live-URL deploy check, kept per D-08.
- `scripts/verify-phase9-drill.sh` — Phase 9 DEPLOY-02 live-URL drill, kept per D-08.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-deploy.sh` / `scripts/verify-phase9-drill.sh` — kept as-is; the phase may reuse them as the live-URL proof that public prod still responds after protection changes.
- Prior grep pattern: `DRILL_FORCE_STALE|drill-preview|Deployment Protection|VERCEL_TOKEN` — starting point for the clean-proof scan (D-06/D-09).

### Established Patterns
- 03-04 removed the flag block + drill test with lint + tests green — the "prove removal by grep + test" pattern applies here (flag scan + branch check, no behavior change to prove).
- Phase 10 lesson: never trust the warm tree — verification must actually run (branch listing, grep, dashboard readback), not assume prior state.
- No `.env*`, `.vercel/`, or `vercel.json` in repo; `.gitignore` already covers `.env*` and `*.pem` — token scan focuses on history/exports/committed strings, not missing files.

### Integration Points
- Vercel dashboard (external, user-operated): Tokens page (delete/revoke) + Project Settings → Deployment Protection (public prod + login-required previews). Agent never touches the dashboard directly.
- `.planning/PROJECT.md` Key Decisions / debt table — the landing spot for the D-11 compact row.
- Remote refs (`git branch -r`): expected `origin/main` only — any `drill-preview` ref is a fail.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The user selected recommended options throughout; verification mechanics are Claude's discretion.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-Deployment Hygiene*
*Context gathered: 2026-09-09*
