#!/usr/bin/env bash
# verify-phase9-drill.sh — Phase 9 DEPLOY-02 live-URL drill (D-16).
# Usage: bash scripts/verify-phase9-drill.sh <LIVE_BASE_URL>
# Zero-dependency: curl + node only. Exits 1 on first failure, 2 on bad usage.
#
# VERIFY-DON'T-REDESIGN (D-16): this drill proves the current route shape
# (maxDuration = 15, bounded RANGE_FOR_INTERVAL windows) fits the intraday
# payload. A green drill changes no source. Redesign app/api/yahoo/route.ts
# ONLY on drill failure, with the failing step output pasted as evidence.
# Never present a passing local check as live verification — this script runs
# against the deployed Vercel URL only.
set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Usage: bash scripts/verify-phase9-drill.sh <LIVE_BASE_URL>" >&2
  exit 2
fi
# Strip any trailing slash so path joins are predictable.
BASE="${BASE%/}"

# Resolve repo root from the script location so route/source contract paths
# hold regardless of the caller's working directory.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

API="$BASE/api/yahoo"
PAGE="$BASE/"

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1: $2" >&2; exit 1; }

# --- STEP 0: ROUTE-SHAPE — the verify-only contract, statically ---
# The drill exercises the unchanged route shape: maxDuration = 15 with
# allowlist-before-URL-build intact, plus the stale/502 branch shapes.
route_file="$ROOT/app/api/yahoo/route.ts"
[ -f "$route_file" ] || fail "ROUTE-SHAPE" "route source missing: $route_file"
grep -q 'maxDuration = 15' "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing 'maxDuration = 15'"
grep -q 'SYMBOL_ALLOWLIST' "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing symbol allowlist guard"
grep -q 'INTERVAL_ALLOWLIST' "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing interval allowlist guard"
grep -q 'status: 502' "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing 'status: 502'"
grep -q "'Cache-Control': 'no-store'" "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing stale-branch 'no-store'"
grep -q "'Retry-After': '60'" "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing 'Retry-After: 60'"
grep -q 'retryAfter: 60' "$route_file" \
  || fail "ROUTE-SHAPE" "$route_file missing 'retryAfter: 60' JSON shape"
pass "ROUTE-SHAPE"

# Shared envelope guard: 200 with a node-parsed fresh envelope — non-empty
# candles array, parseable lastUpdatedISO, stale strictly false. Fails closed
# on malformed JSON so stale can never masquerade as live (T-09-02).
check_envelope() {
  node -e "
const fs = require('fs');
let j;
try {
  j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
} catch (e) {
  console.log('BAD-ENVELOPE unparseable JSON: ' + e.message);
  process.exit(2);
}
if (!Array.isArray(j.candles) || j.candles.length < 1) {
  console.log('BAD-ENVELOPE candles must be a non-empty array');
  process.exit(2);
}
const t = Date.parse(j.lastUpdatedISO);
if (!Number.isFinite(t)) {
  console.log('BAD-ENVELOPE lastUpdatedISO unparseable: ' + JSON.stringify(j.lastUpdatedISO));
  process.exit(2);
}
if (j.stale !== false) {
  console.log('BAD-ENVELOPE stale must be strictly false on the fresh path (got ' + JSON.stringify(j.stale) + ')');
  process.exit(2);
}
console.log('OK n=' + j.candles.length + ' lastUpdatedISO=' + j.lastUpdatedISO);
" "$1"
}

cold_body=$(mktemp)
warm_body=$(mktemp)
intra_body=$(mktemp)
page_file=$(mktemp)
trap 'rm -f "$cold_body" "$warm_body" "$intra_body" "$page_file"' EXIT

# --- STEP 1: ES daily cold-start — cold vs warm totals, both 200 + fresh ---
ES_DAILY="$API?symbol=ES=F&interval=1d"
cold_meta=$(curl -s -o "$cold_body" -w '%{http_code} %{time_total}' "$ES_DAILY" 2>/dev/null || echo "000 0.0")
cold_code=$(printf '%s' "$cold_meta" | awk '{print $1}')
cold_time=$(printf '%s' "$cold_meta" | awk '{print $2}')
[ "$cold_code" = "200" ] || fail "ES-COLD" "GET $ES_DAILY returned $cold_code, expected 200"
cold_check=$(check_envelope "$cold_body") || fail "ES-COLD" "$cold_check"
warm_meta=$(curl -s -o "$warm_body" -w '%{http_code} %{time_total}' "$ES_DAILY" 2>/dev/null || echo "000 0.0")
warm_code=$(printf '%s' "$warm_meta" | awk '{print $1}')
warm_time=$(printf '%s' "$warm_meta" | awk '{print $2}')
[ "$warm_code" = "200" ] || fail "ES-WARM" "GET $ES_DAILY returned $warm_code, expected 200"
warm_check=$(check_envelope "$warm_body") || fail "ES-WARM" "$warm_check"
echo "cold vs warm: cold_time=${cold_time}s cold_code=$cold_code ($cold_check) warm_time=${warm_time}s warm_code=$warm_code ($warm_check)"
pass "ES-COLD-WARM"

# --- STEP 2: INTRADAY payload — NQ 1h + 15m legs, 200 inside 15s each ---
# Bounded ranges (1h 3mo, 15m 1mo per RANGE_FOR_INTERVAL) must fit maxDuration 15.
for iv in 1h 15m; do
  leg_url="$API?symbol=NQ=F&interval=$iv"
  leg_meta=$(curl -s -o "$intra_body" -w '%{http_code} %{time_total}' "$leg_url" 2>/dev/null || echo "000 0.0")
  leg_code=$(printf '%s' "$leg_meta" | awk '{print $1}')
  leg_time=$(printf '%s' "$leg_meta" | awk '{print $2}')
  [ "$leg_code" = "200" ] || fail "INTRADAY-$iv" "GET $leg_url returned $leg_code, expected 200"
  awk "BEGIN {exit !( $leg_time < 15 )}" \
    || fail "INTRADAY-$iv" "GET $leg_url took ${leg_time}s, exceeds maxDuration 15"
  leg_check=$(check_envelope "$intra_body") || fail "INTRADAY-$iv" "$leg_check"
  echo "leg $iv: time=${leg_time}s code=$leg_code ($leg_check)"
done
pass "INTRADAY"

# --- PAGE fetch (shared by steps 3-4) ---
page_code=$(curl -s -o "$page_file" -w '%{http_code}' "$PAGE" 2>/dev/null || echo "000")
[ "$page_code" = "200" ] || fail "PAGE" "GET $PAGE returned $page_code, expected 200"
[ -s "$page_file" ] || fail "PAGE" "GET $PAGE returned an empty body"
pass "PAGE"

# Slot-contract fallback (rollover-banner precedent from verify-deploy.sh):
# served HTML first, then the built JS chunks (client render path), then the
# repo source contract — client rendering may defer slots past served HTML.
check_slot() {
  local slot="$1"
  local contract="$2"
  if grep -q "data-slot=\"$slot\"" "$page_file"; then
    echo "served HTML"
    return 0
  fi
  local js_bundle
  js_bundle=$(grep -o 'src="[^"]*\.js[^"]*"' "$page_file" | sed 's/^src="//; s/"$//' | head -5 || true)
  local src
  for src in $js_bundle; do
    local chunk_url
    case "$src" in
      http*|//*) chunk_url="$src" ;;
      /*) chunk_url="$BASE$src" ;;
      *) chunk_url="$BASE/$src" ;;
    esac
    if curl -s "$chunk_url" 2>/dev/null | grep -q "$slot"; then
      echo "chunk $src"
      return 0
    fi
  done
  if [ -f "$ROOT/$contract" ] && grep -q "data-slot=\"$slot\"" "$ROOT/$contract"; then
    echo "repo source contract ($contract)"
    return 0
  fi
  return 1
}

# --- STEP 3: §3 RENDER — all four slots present, none asserted visible ---
for slot in s3-liquidity-path s3-smt-status s3-amd-timing s3-conviction; do
  where=$(check_slot "$slot" "components/dashboard/report.tsx") \
    || fail "S3-SLOT-$slot" "no page HTML slot, no chunk slot, and no repo source slot"
  echo "slot $slot: $where"
done
pass "S3-SLOTS"

# --- STEP 4: OVERLAY presence — paths only, never live signal visibility ---
# Overlays depend on live session state, so the drill probes the
# asia-lines / judas-markers / smt-marker paths without asserting that a
# signal is visible on the canvas right now.
for slot in asia-lines judas-markers smt-marker; do
  where=$(check_slot "$slot" "components/charts/nq-chart.tsx") \
    || fail "OVERLAY-$slot" "no page HTML slot, no chunk slot, and no repo source slot"
  echo "slot $slot: $where"
done
pass "OVERLAYS"

echo "verify-phase9-drill.sh: all checks passed for $BASE"
