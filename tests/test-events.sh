#!/usr/bin/env bash
# test-events.sh — Test suite for Event Log + History/Lineage/Rebuild
#
# Tests local event operations only (no Stitch API calls needed).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STITCH="node $SCRIPT_DIR/scripts/stitch.mjs"
PROJECT="13734138812577734985"
EVENTS_FILE="$SCRIPT_DIR/state/projects/$PROJECT/events.jsonl"

PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

pass() { PASS=$((PASS + 1)); green "  ✅ PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); red   "  ❌ FAIL: $1 — $2"; }

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
echo "║  Stitch Event Log — Test Suite           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Count initial events (preserve production events)
INITIAL_EVENTS=0
if [[ -f "$EVENTS_FILE" ]]; then
  INITIAL_EVENTS=$(wc -l < "$EVENTS_FILE" | tr -d ' ')
fi
echo "Initial events in log: $INITIAL_EVENTS"
echo ""

# ============================================================
# GROUP 1: Events are emitted by name/rename/unname
# ============================================================
echo "━━━ Group 1: Alias operations emit events ━━━"

# Clean test aliases
$STITCH unname evt-test-a --project $PROJECT 2>/dev/null || true
$STITCH unname evt-test-b --project $PROJECT 2>/dev/null || true
$STITCH unname evt-test-renamed --project $PROJECT 2>/dev/null || true

# T1: name emits alias_set
run_ok "T1 name" $STITCH name evt-test-a screen001 --project $PROJECT
AFTER_T1=$(wc -l < "$EVENTS_FILE" | tr -d ' ')
LAST_EVENT=$(tail -1 "$EVENTS_FILE" | jq -r '.op')
if [[ "$LAST_EVENT" == "alias_set" ]]; then pass "T1 event is alias_set"; else fail "T1 event is alias_set" "got $LAST_EVENT"; fi

LAST_ALIAS=$(tail -1 "$EVENTS_FILE" | jq -r '.alias')
if [[ "$LAST_ALIAS" == "evt-test-a" ]]; then pass "T1 alias correct"; else fail "T1 alias correct" "got $LAST_ALIAS"; fi

LAST_SID=$(tail -1 "$EVENTS_FILE" | jq -r '.screenId')
if [[ "$LAST_SID" == "screen001" ]]; then pass "T1 screenId correct"; else fail "T1 screenId correct" "got $LAST_SID"; fi

# Check event has required fields
LAST_V=$(tail -1 "$EVENTS_FILE" | jq -r '.v')
LAST_ID=$(tail -1 "$EVENTS_FILE" | jq -r '.id')
LAST_TS=$(tail -1 "$EVENTS_FILE" | jq -r '.ts')
LAST_PID=$(tail -1 "$EVENTS_FILE" | jq -r '.projectId')
if [[ "$LAST_V" == "1" ]]; then pass "T1 schemaVersion"; else fail "T1 schemaVersion" "got $LAST_V"; fi
if [[ "$LAST_ID" == evt_* ]]; then pass "T1 eventId format"; else fail "T1 eventId format" "got $LAST_ID"; fi
if [[ "$LAST_TS" == 20* ]]; then pass "T1 timestamp"; else fail "T1 timestamp" "got $LAST_TS"; fi
if [[ "$LAST_PID" == "$PROJECT" ]]; then pass "T1 projectId"; else fail "T1 projectId" "got $LAST_PID"; fi

# T2: force overwrite emits alias_set with previousScreenId
run_ok "T2 force overwrite" $STITCH name evt-test-a screen002 --project $PROJECT --force
LAST_PREV=$(tail -1 "$EVENTS_FILE" | jq -r '.previousScreenId // "null"')
if [[ "$LAST_PREV" == "screen001" ]]; then pass "T2 previousScreenId"; else fail "T2 previousScreenId" "got $LAST_PREV"; fi

# T3: rename emits alias_renamed
run_ok "T3 rename" $STITCH rename evt-test-a evt-test-renamed --project $PROJECT
LAST_OP=$(tail -1 "$EVENTS_FILE" | jq -r '.op')
LAST_PREV_ALIAS=$(tail -1 "$EVENTS_FILE" | jq -r '.previousAlias')
if [[ "$LAST_OP" == "alias_renamed" ]]; then pass "T3 event is alias_renamed"; else fail "T3 event is alias_renamed" "got $LAST_OP"; fi
if [[ "$LAST_PREV_ALIAS" == "evt-test-a" ]]; then pass "T3 previousAlias"; else fail "T3 previousAlias" "got $LAST_PREV_ALIAS"; fi

# T4: unname emits alias_removed
run_ok "T4 unname" $STITCH unname evt-test-renamed --project $PROJECT
LAST_OP=$(tail -1 "$EVENTS_FILE" | jq -r '.op')
if [[ "$LAST_OP" == "alias_removed" ]]; then pass "T4 event is alias_removed"; else fail "T4 event is alias_removed" "got $LAST_OP"; fi

echo ""
echo "━━━ Group 2: History command ━━━"

# Setup: create an alias, rebind it twice
$STITCH name evt-test-b screen-v1 --project $PROJECT 2>/dev/null
$STITCH name evt-test-b screen-v2 --project $PROJECT --force 2>/dev/null
$STITCH name evt-test-b screen-v3 --project $PROJECT --force 2>/dev/null

# T5: history shows events
run_ok "T5 history" $STITCH history evt-test-b --project $PROJECT
T5_COUNT=$(echo "$LAST_OUT" | jq '.totalEvents')
if [[ "$T5_COUNT" -ge 3 ]]; then pass "T5 at least 3 events"; else fail "T5 at least 3 events" "got $T5_COUNT"; fi

# T6: history --rev 1 shows first revision
run_ok "T6 rev 1" $STITCH history evt-test-b --project $PROJECT --rev 1
check_json "T6 revision number" ".revision" "1"
T6_SID=$(echo "$LAST_OUT" | jq -r '.event.screenId')
if [[ "$T6_SID" == "screen-v1" ]]; then pass "T6 first rev screenId"; else fail "T6 first rev screenId" "got $T6_SID"; fi

# T7: history --rev 3 shows latest
run_ok "T7 rev 3" $STITCH history evt-test-b --project $PROJECT --rev 3
T7_SID=$(echo "$LAST_OUT" | jq -r '.event.screenId')
if [[ "$T7_SID" == "screen-v3" ]]; then pass "T7 third rev screenId"; else fail "T7 third rev screenId" "got $T7_SID"; fi

# T8: history --rev out of range
run_fail "T8 rev out of range" $STITCH history evt-test-b --project $PROJECT --rev 99

echo ""
echo "━━━ Group 3: Rebuild command ━━━"

# T9: rebuild restores names from events
# First, note current state
BEFORE_NAMES=$($STITCH names --project $PROJECT 2>/dev/null | jq '[.screens[].alias] | sort')

run_ok "T9 rebuild" $STITCH rebuild --project $PROJECT
T9_COUNT=$(echo "$LAST_OUT" | jq '.rebuiltAliases')
if [[ "$T9_COUNT" -ge 1 ]]; then pass "T9 rebuilt aliases > 0"; else fail "T9 rebuilt aliases > 0" "got $T9_COUNT"; fi

# T10: after rebuild, production aliases still work
run_ok "T10 konzept-a after rebuild" $STITCH resolve konzept-a --project $PROJECT

echo ""
echo "━━━ Group 4: Append-only integrity ━━━"

# T11: events file only grew, never shrank
FINAL_EVENTS=$(wc -l < "$EVENTS_FILE" | tr -d ' ')
if [[ "$FINAL_EVENTS" -ge "$INITIAL_EVENTS" ]]; then
  pass "T11 event count only grew ($INITIAL_EVENTS → $FINAL_EVENTS)"
else
  fail "T11 event count only grew" "$INITIAL_EVENTS → $FINAL_EVENTS"
fi

# T12: every line is valid JSON
INVALID=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  if ! echo "$line" | jq . >/dev/null 2>&1; then
    INVALID=$((INVALID + 1))
  fi
done < "$EVENTS_FILE"
if [[ "$INVALID" -eq 0 ]]; then pass "T12 all lines valid JSON"; else fail "T12 all lines valid JSON" "$INVALID invalid lines"; fi

# T13: every event has required fields
MISSING=0
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  for field in v id ts projectId op; do
    val=$(echo "$line" | jq -r ".$field // \"MISSING\"")
    if [[ "$val" == "MISSING" ]]; then
      MISSING=$((MISSING + 1))
    fi
  done
done < "$EVENTS_FILE"
if [[ "$MISSING" -eq 0 ]]; then pass "T13 all events have required fields"; else fail "T13 all events have required fields" "$MISSING missing fields"; fi

# ============================================================
# Cleanup
# ============================================================
echo ""
echo "━━━ Cleanup ━━━"
$STITCH unname evt-test-b --project $PROJECT 2>/dev/null || true
green "  🧹 Test aliases cleaned up"
echo "  📝 Events remain in log (append-only, not cleaned)"

# ============================================================
# Summary
# ============================================================
echo ""
TOTAL=$((PASS + FAIL))
echo "╔══════════════════════════════════════════╗"
if [[ $FAIL -eq 0 ]]; then
  printf "║  ✅ ALL PASSED: %d/%d                      ║\n" "$PASS" "$TOTAL"
else
  printf "║  ❌ FAILED: %d  PASSED: %d                 ║\n" "$FAIL" "$PASS"
fi
echo "╚══════════════════════════════════════════╝"
echo ""

exit $FAIL
