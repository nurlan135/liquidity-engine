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
echo "$cc_value" | grep -qi 's-maxage=60' \
  || fail "HEADERS" "cache-control missing s-maxage=60 (got: '$cc_value')"
echo "$cc_value" | grep -qi 'stale-while-revalidate=30' \
  || fail "HEADERS" "cache-control missing stale-while-revalidate=30 (got: '$cc_value')"
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

echo "verify-deploy.sh: all checks passed for $BASE"
