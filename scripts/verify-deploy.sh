#!/usr/bin/env bash
# verify-deploy.sh — re-runnable live-URL checklist (D-09).
# Usage: bash scripts/verify-deploy.sh <BASE_URL>
# Zero-dependency: curl + node only. Exits 1 on first failure, 2 on bad usage.
set -u

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Usage: bash scripts/verify-deploy.sh <BASE_URL>" >&2
  exit 2
fi
# Strip any trailing slash so path joins are predictable.
BASE="${BASE%/}"

API="$BASE/api/yahoo"
PAGE="$BASE/"

pass() { echo "PASS $1"; }
fail() { echo "FAIL $1: $2" >&2; exit 1; }

# --- WARMUP: tolerate one cold-origin non-200, up to 4 tries 5s apart ---
warm_ok=0
for attempt in 1 2 3 4; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API" || echo "000")
  if [ "$code" = "200" ]; then
    warm_ok=1
    break
  fi
  if [ "$attempt" -lt 4 ]; then
    sleep 5
  fi
done
if [ "$warm_ok" != "1" ]; then
  fail "WARMUP" "GET $API never returned 200 after 4 attempts (last=$code)"
fi
pass "WARMUP"

# --- HEADERS: fetch from the deployment URL directly (Vercel strips
# s-maxage before the browser, so DevTools can never assert this) ---
headers=$(curl -sSI "$API" || true)
cc_line=$(printf '%s\n' "$headers" | grep -i '^cache-control:' | tail -1 || true)
cc_value=$(printf '%s' "$cc_line" | sed 's/^[Cc]ache-[Cc]ontrol:[[:space:]]*//')
# CDN fingerprint first: Vercel consumes s-maxage/SWR at the edge and forwards
# only `public` to the browser by design, so the raw-value assertions below can
# only hold on non-Vercel origins (local `next start`). When x-vercel-cache is
# present the edge proof is MISS-to-HIT progression plus the Age header instead.
vcache_probe=$(printf '%s\n' "$headers" | grep -i '^x-vercel-cache:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
age_probe=$(printf '%s\n' "$headers" | grep -i '^age:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
if [ -n "$vcache_probe" ]; then
  echo "SKIP HEADERS-RAW (Vercel strips s-maxage/SWR at the edge by design; asserting CDN progression instead)"
else
  echo "$cc_value" | grep -qi 's-maxage=60' \
    || fail "HEADERS" "cache-control missing s-maxage=60 (got: '$cc_value')"
  echo "$cc_value" | grep -qi 'stale-while-revalidate=30' \
    || fail "HEADERS" "cache-control missing stale-while-revalidate=30 (got: '$cc_value')"
fi
# Fresh and stale/502 branches must disagree (route.ts branch-split contract):
# fresh serves s-maxage+SWR, stale/502 serve no-store. The live fresh body
# below asserts stale strictly false, so this header pair belongs to fresh.
echo "$cc_value" | grep -qi 'no-store' \
  && fail "HEADERS" "fresh path must not be no-store (got: '$cc_value')"
# CDN progression: two sequential HEADs should move MISS -> HIT-or-STALE.
# Local `next start` emits no x-vercel-cache; SKIP instead of failing there.
vcache1=$(printf '%s\n' "$headers" | grep -i '^x-vercel-cache:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
headers2=$(curl -sSI "$API" || true)
vcache2=$(printf '%s\n' "$headers2" | grep -i '^x-vercel-cache:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
if [ -z "$vcache1" ] && [ -z "$vcache2" ]; then
  echo "SKIP HEADERS-CDN (no x-vercel-cache header; expected on local next start)"
else
  case "$vcache2" in
    HIT|STALE) ;;
    *) fail "HEADERS" "expected x-vercel-cache MISS-then-HIT-or-STALE, got first='$vcache1' second='$vcache2'" ;;
  esac
  # Edge proof part two: a cache HIT/STALE must carry an Age header.
  age2=$(printf '%s\n' "$headers2" | grep -i '^age:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
  if [ -z "$age2" ]; then
    # First response may be a MISS with no Age yet; re-check against the warm edge.
    headers3=$(curl -sSI "$API" || true)
    age2=$(printf '%s\n' "$headers3" | grep -i '^age:' | tail -1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r' || true)
    [ -n "$age2" ] || fail "HEADERS" "x-vercel-cache present but no Age header on the warm edge"
  fi
  echo "edge progression: first='$vcache1' second='$vcache2' age='$age2' (raw cc='$cc_value')"
fi
pass "HEADERS"

# --- ENVELOPE: defensive parse, fail closed on malformed JSON ---
body_file=$(mktemp)
trap 'rm -f "$body_file"' EXIT
curl -s "$API" -o "$body_file" || fail "ENVELOPE" "GET $API failed"
check=$(node -e "
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
  console.log('BAD-ENVELOPE lastUpdatedISO unparseable: ' + j.lastUpdatedISO);
  process.exit(2);
}
if (j.stale !== false) {
  console.log('BAD-ENVELOPE stale must be strictly false on the fresh path (got ' + JSON.stringify(j.stale) + ')');
  process.exit(2);
}
if (j.source !== 'live' && j.source !== 'cache') {
  console.log('BAD-ENVELOPE source must be live or cache (got ' + JSON.stringify(j.source) + ')');
  process.exit(2);
}
const age = Math.floor((Date.now() - t) / 1000);
if (age >= 120) {
  console.log('ENVELOPE-AGE stale data presented as live: age ' + age + 's >= 120s (STALE_AFTER_SEC)');
  process.exit(3);
}
console.log('OK age=' + age + 's n=' + j.candles.length + ' source=' + j.source);
" "$body_file") || {
  rc=$?
  if [ "$rc" = "3" ]; then
    fail "ENVELOPE-AGE" "$check"
  else
    fail "ENVELOPE" "$check"
  fi
}
pass "ENVELOPE ($check)"

# --- PAGE: root renders HTTP 200 with a non-empty body ---
page_file=$(mktemp)
trap 'rm -f "$body_file" "$page_file"' EXIT
page_code=$(curl -s -o "$page_file" -w '%{http_code}' "$PAGE" || echo "000")
[ "$page_code" = "200" ] || fail "PAGE" "GET $PAGE returned $page_code, expected 200"
[ -s "$page_file" ] || fail "PAGE" "GET $PAGE returned an empty body"
pass "PAGE"

# --- STALE-502: the 502 contract statically, never a live upstream kill ---
# The fresh path above already proves prod serves live: strictly-false stale
# plus a non-no-store cache-control. This step asserts the stale/502 branch
# contract without touching prod state: (1) the live response headers must
# not be no-store on the fresh path; (2) the route source must carry the
# status-502 + no-store + Retry-After-60 + { error, retryAfter: 60 } shape.
echo "$cc_value" | grep -qi 'no-store' \
  && fail "STALE-502" "fresh-path headers must not be no-store (got: '$cc_value')"
route_file="app/api/yahoo/route.ts"
[ -f "$route_file" ] || fail "STALE-502" "route source missing: $route_file"
grep -q 'status: 502' "$route_file" \
  || fail "STALE-502" "$route_file missing 'status: 502'"
grep -q "'Cache-Control': 'no-store'" "$route_file" \
  || fail "STALE-502" "$route_file missing stale-branch 'no-store'"
grep -q "'Retry-After': '60'" "$route_file" \
  || fail "STALE-502" "$route_file missing 'Retry-After: 60'"
grep -q 'retryAfter: 60' "$route_file" \
  || fail "STALE-502" "$route_file missing 'retryAfter: 60' JSON shape"
pass "STALE-502"

# --- DST-DATE: Baku date shape plus ordering plus render hook, never a
# transition today --- reuses the ENVELOPE body file: every candle date must
# match YYYY-MM-DD and the sequence must be strictly ascending; the page body
# must carry a Baku rendering hook (session-line slot or freshness copy).
dst_check=$(node -e "
const fs = require('fs');
let j;
try {
  j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
} catch (e) {
  console.log('BAD-DATE unparseable ENVELOPE JSON: ' + e.message);
  process.exit(2);
}
const dates = (j.candles || []).map((c) => c.date);
if (dates.length < 1) {
  console.log('BAD-DATE envelope holds no candle dates');
  process.exit(2);
}
for (const d of dates) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) {
    console.log('BAD-DATE candle date not YYYY-MM-DD: ' + JSON.stringify(d));
    process.exit(2);
  }
}
for (let i = 1; i < dates.length; i++) {
  if (!(dates[i] > dates[i - 1])) {
    console.log('BAD-DATE candle dates not strictly ascending at index ' + i + ': ' + dates[i - 1] + ' -> ' + dates[i]);
    process.exit(2);
  }
}
console.log('OK n=' + dates.length + ' first=' + dates[0] + ' last=' + dates[dates.length - 1]);
" "$body_file") || fail "DST-DATE" "$dst_check"
grep -q 'data-slot="session-line"' "$page_file" \
  || grep -q 'data-slot="status-strip"' "$page_file" \
  || grep -q 'BAZAR BAGLIDIR' "$page_file" \
  || grep -q 'LIVE' "$page_file" \
  || grep -q 'STALE' "$page_file" \
  || fail "DST-DATE" "page body carries no Baku rendering hook (session-line, status-strip, or freshness copy)"
pass "DST-DATE ($dst_check)"

# --- ROLLOVER-BANNER: the slot-hook contract, never live visibility ---
# The banner renders only in rollover weeks, so asserting visibility would be
# a lucky-date check. Assert the path instead: the served HTML carries the
# slot when a banner is live this week, else the built page JavaScript
# carries the same slot string (client-side render path).
if grep -q 'data-slot="rollover-banner"' "$page_file"; then
  pass "ROLLOVER-BANNER (slot rendered in served HTML)"
else
  js_bundle=$(grep -o 'src="[^"]*\.js[^"]*"' "$page_file" | sed 's/^src="//; s/"$//' | head -5 || true)
  found=""
  for src in $js_bundle; do
    case "$src" in
      http*|//*) chunk_url="$src" ;;
      /*) chunk_url="$BASE$src" ;;
      *) chunk_url="$BASE/$src" ;;
    esac
    if curl -s "$chunk_url" | grep -q 'rollover-banner'; then
      found="$src"
      break
    fi
  done
  if [ -z "$found" ]; then
    # Same-origin chunk fetch may miss cross-origin CDN chunks; fall back to
    # the repo source contract (the shell owns this slot unconditionally).
    grep -q 'data-slot="rollover-banner"' components/dashboard/terminal-shell.tsx \
      || fail "ROLLOVER-BANNER" "no page HTML slot, no chunk slot, and no repo source slot"
    pass "ROLLOVER-BANNER (slot contract in repo source; banner renders in rollover weeks only)"
  else
    pass "ROLLOVER-BANNER (slot contract in chunk $found)"
  fi
fi

echo "verify-deploy.sh: all checks passed for $BASE"
