#!/usr/bin/env bash
# test-names.sh — Test suite for Screen Names (Alias Registry)
#
# Usage: ./tests/test-names.sh [--with-api]
#   Without --with-api: fast local-only tests (~5s)
#   With --with-api:    includes Stitch API calls (show, verify, generate --name)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STITCH="node $SCRIPT_DIR/scripts/stitch.mjs"
PROJECT="13734138812577734985"  # OstseeGuide project

PASS=0
FAIL=0
SKIP=0
WITH_API=false
[[ "${1:-}" == "--with-api" ]] && WITH_API=true

# --- Helpers ---

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

pass() { PASS=$((PASS + 1)); green "  ✅ PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); red   "  ❌ FAIL: $1 — $2"; }
skip() { SKIP=$((SKIP + 1)); yellow "  ⏭️  SKIP: $1"; }

# Run command, store stdout JSON in LAST_OUT. Stderr suppressed.
LAST_OUT=""
run_ok() {
  local name="$1"; shift
  if LAST_OUT=$("$@" 2>/dev/null); then
    pass "$name"
  else
    fail "$name" "exit code $?"
    LAST_OUT=""
    return 1
  fi
}

run_fail() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    fail "$name" "expected failure, got success"
    return 1
  else
    pass "$name"
  fi
}

# Check LAST_OUT JSON field
check_json() {
  local name="$1" path="$2" expected="$3"
  local actual
  actual=$(echo "$LAST_OUT" | jq -r "$path" 2>/dev/null || echo "PARSE_ERROR")
  if [[ "$actual" == "$expected" ]]; then
    pass "$name"
  else
    fail "$name" "expected $path=$expected, got $actual"
  fi
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Stitch Screen Names — Test Suite        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Project: $PROJECT"
echo "API tests: $WITH_API"
echo ""

# ============================================================
# GROUP 1: Basic CRUD
# ============================================================
echo "━━━ Group 1: Basic CRUD ━━━"

# Clean slate
for a in test-alpha test-beta test-gamma test-renamed test-noted test-broken; do
  $STITCH unname $a --project $PROJECT 2>/dev/null || true
done

# T1: Create alias
run_ok "T1 create alias" $STITCH name test-alpha abc123def --project $PROJECT
check_json "T1 alias value" ".alias" "test-alpha"
check_json "T1 screenId" ".screenId" "abc123def"

# T2: Resolve alias
run_ok "T2 resolve" $STITCH resolve test-alpha --project $PROJECT
check_json "T2 screenId" ".screenId" "abc123def"

# T3: List contains alias
run_ok "T3 list" $STITCH names --project $PROJECT
T3_HAS=$(echo "$LAST_OUT" | jq '[.screens[] | select(.alias=="test-alpha")] | length')
if [[ "$T3_HAS" == "1" ]]; then pass "T3 in list"; else fail "T3 in list" "not found"; fi

echo ""
echo "━━━ Group 2: Conflict & Validation ━━━"

# T4: Duplicate without --force → fail
run_fail "T4 duplicate rejects" $STITCH name test-alpha different-id --project $PROJECT

# T5-T7: Invalid slugs
run_fail "T5 invalid: spaces" $STITCH name "test alpha" abc --project $PROJECT
run_fail "T6 invalid: Uppercase!" $STITCH name "Concept-A!" abc --project $PROJECT
run_fail "T7 invalid: -leading" $STITCH name "-leading" abc --project $PROJECT

# T8: Force overwrite
run_ok "T8 force overwrite" $STITCH name test-alpha newid999 --project $PROJECT --force
check_json "T8 screenId updated" ".screenId" "newid999"

# Restore
$STITCH name test-alpha abc123def --project $PROJECT --force 2>/dev/null

echo ""
echo "━━━ Group 3: Rename & Remove ━━━"

# Setup
$STITCH name test-beta beta456 --project $PROJECT 2>/dev/null

# T9: Rename
run_ok "T9 rename" $STITCH rename test-beta test-renamed --project $PROJECT
check_json "T9 from" ".from" "test-beta"
check_json "T9 to" ".to" "test-renamed"

# T10: Old alias gone
run_fail "T10 old alias gone" $STITCH resolve test-beta --project $PROJECT

# T11: New alias works
run_ok "T11 new alias" $STITCH resolve test-renamed --project $PROJECT
check_json "T11 screenId" ".screenId" "beta456"

# T12: Unname
run_ok "T12 unname" $STITCH unname test-renamed --project $PROJECT

# T13: Unname non-existent → fail
run_fail "T13 unname missing" $STITCH unname does-not-exist --project $PROJECT

# T14: Rename to existing → fail
$STITCH name test-gamma gamma789 --project $PROJECT 2>/dev/null
run_fail "T14 rename to existing" $STITCH rename test-alpha test-gamma --project $PROJECT

echo ""
echo "━━━ Group 4: Notes ━━━"

# T15: Name with note
$STITCH unname test-noted --project $PROJECT 2>/dev/null || true
run_ok "T15 create with note" $STITCH name test-noted noted123 --project $PROJECT --note "Test note here"
run_ok "T15 resolve" $STITCH resolve test-noted --project $PROJECT
check_json "T15 note preserved" ".note" "Test note here"

echo ""
echo "━━━ Group 5: Production aliases intact ━━━"

for concept in konzept-a konzept-b konzept-c; do
  run_ok "T16 $concept intact" $STITCH resolve $concept --project $PROJECT
done

# ============================================================
# GROUP 6: API Integration (requires --with-api)
# ============================================================
echo ""
echo "━━━ Group 6: Stitch API ━━━"

if $WITH_API; then

  # T17: show resolves via API
  run_ok "T17 show konzept-a" $STITCH show konzept-a --project $PROJECT
  check_json "T17 title" ".title" "Scharbeutz - Realistic Map Redesign"
  T17_URL=$(echo "$LAST_OUT" | jq -r '.screenshotUrl // "NONE"')
  if [[ "$T17_URL" == *"=w780"* ]]; then pass "T17 hi-res URL"; else fail "T17 hi-res URL" "missing =w780"; fi

  # T18: show broken screen
  $STITCH name test-broken fake-nonexistent --project $PROJECT --force 2>/dev/null
  run_fail "T18 show broken screen" $STITCH show test-broken --project $PROJECT
  $STITCH unname test-broken --project $PROJECT 2>/dev/null

  # T19: names --verify
  run_ok "T19 verify" $STITCH names --verify --project $PROJECT
  T19_OK=$(echo "$LAST_OUT" | jq '[.screens[] | select(.alias | startswith("konzept-")) | select(.status=="ok")] | length')
  if [[ "$T19_OK" == "3" ]]; then pass "T19 3 production OK"; else fail "T19 3 production OK" "got $T19_OK"; fi

else
  skip "T17 show via API (--with-api)"
  skip "T18 show broken (--with-api)"
  skip "T19 verify (--with-api)"
fi

# ============================================================
# Cleanup
# ============================================================
echo ""
echo "━━━ Cleanup ━━━"
for a in test-alpha test-beta test-gamma test-renamed test-noted test-broken; do
  $STITCH unname $a --project $PROJECT 2>/dev/null || true
done
green "  🧹 Test aliases cleaned up"

# ============================================================
# Summary
# ============================================================
echo ""
TOTAL=$((PASS + FAIL + SKIP))
echo "╔══════════════════════════════════════════╗"
if [[ $FAIL -eq 0 ]]; then
  printf "║  ✅ ALL PASSED: %d/%d (skipped: %d)        ║\n" "$PASS" "$TOTAL" "$SKIP"
else
  printf "║  ❌ FAILED: %d  PASSED: %d  SKIP: %d       ║\n" "$FAIL" "$PASS" "$SKIP"
fi
echo "╚══════════════════════════════════════════╝"
echo ""

exit $FAIL
