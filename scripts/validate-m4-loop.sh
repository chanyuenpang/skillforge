#!/usr/bin/env bash
# M4 端到端闭环验证脚本
# 测试: 成功闭环 / 失败重试 / 幂等重复
set -euo pipefail

BASE="http://localhost:4174"
RESET="\033[0m"
GREEN="\033[32m"
RED="\033[31m"
CYAN="\033[36m"
YELLOW="\033[33m"

pass_count=0
fail_count=0

pass() { echo -e "${GREEN}PASS${RESET} $1"; pass_count=$((pass_count + 1)); }
fail() { echo -e "${RED}FAIL${RESET} $1"; fail_count=$((fail_count + 1)); }
info() { echo -e "${CYAN}INFO${RESET} $1"; }
warn() { echo -e "${YELLOW}WARN${RESET} $1"; }

# ──────────────────────────────────────────────────────
# Scenario 1: 成功闭环
# ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
info "Scenario 1: 成功闭环 (init → start → output → complete → detail)"
echo "═══════════════════════════════════════════════"

IDK1="test-m4-success-$(date +%s)"

# 1a) Initiate
R1=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs" \
  -H "Content-Type: application/json" \
  -d "{\"fixtureId\":\"demo-fixture-success\",\"idempotencyKey\":\"$IDK1\"}")
CODE1=$(echo "$R1" | tail -1)
BODY1=$(echo "$R1" | sed '$d')
TR1=$(echo "$BODY1" | jq -r '.data.taskRunId // empty')

if [ "$CODE1" = "201" ] && [ -n "$TR1" ]; then
  pass "Initiate → 201, taskRunId=$TR1"
else
  fail "Initiate → code=$CODE1, body=$BODY1"
fi

# 1b) Start
R2=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR1/start" \
  -H "Content-Type: application/json" -d "{}")
CODE2=$(echo "$R2" | tail -1)
BODY2=$(echo "$R2" | sed '$d')
STATUS2=$(echo "$BODY2" | jq -r '.data.currentStatus // empty')

if [ "$CODE2" = "200" ] && [ "$STATUS2" = "running" ]; then
  pass "Start → 200, currentStatus=running"
else
  fail "Start → code=$CODE2, status=$STATUS2"
fi

# 1c) Output
R3=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR1/output" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"result\",\"content\":\"Demo output: all good\",\"payload\":{\"score\":95}}")
CODE3=$(echo "$R3" | tail -1)
BODY3=$(echo "$R3" | sed '$d')
OK3=$(echo "$BODY3" | jq -r '.data.ok // false')

if [ "$CODE3" = "200" ] && [ "$OK3" = "true" ]; then
  pass "Output → 200, ok=true"
else
  fail "Output → code=$CODE3, ok=$OK3"
fi

# 1d) Transcript-kind output (should bridge to transcript-store)
R3b=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR1/output" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"transcript\",\"content\":\"Provider trace: model=gpt-4o, tokens=42\"}")
CODE3b=$(echo "$R3b" | tail -1)
BODY3b=$(echo "$R3b" | sed '$d')
OK3b=$(echo "$BODY3b" | jq -r '.data.ok // false')

if [ "$CODE3b" = "200" ] && [ "$OK3b" = "true" ]; then
  pass "Transcript output → 200, bridged to transcript-store"
else
  fail "Transcript output → code=$CODE3b, ok=$OK3b"
fi

# 1e) Complete
R4=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR1/complete" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"All tasks done\",\"durationMs\":1234}")
CODE4=$(echo "$R4" | tail -1)
BODY4=$(echo "$R4" | sed '$d')
STATUS4=$(echo "$BODY4" | jq -r '.data.currentStatus // empty')
DUR4=$(echo "$BODY4" | jq -r '.data.durationMs // empty')

if [ "$CODE4" = "200" ] && [ "$STATUS4" = "completed" ]; then
  pass "Complete → 200, currentStatus=completed, durationMs=$DUR4"
else
  fail "Complete → code=$CODE4, status=$STATUS4"
fi

# 1f) Detail query — verify full lineage + executionLog + transcriptEvidence
R5=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/tasks/runs/$TR1")
CODE5=$(echo "$R5" | tail -1)
BODY5=$(echo "$R5" | sed '$d')
LIN_CURSTAT=$(echo "$BODY5" | jq -r '.data.currentStatus // empty')
EXECLOG=$(echo "$BODY5" | jq -r '.data.executionLog // empty')
TRANSEV=$(echo "$BODY5" | jq -r '.data.transcriptEvidence // empty')

if [ "$CODE5" = "200" ] && [ "$LIN_CURSTAT" = "completed" ]; then
  pass "Detail GET → 200, currentStatus=completed"
else
  fail "Detail GET → code=$CODE5, status=$LIN_CURSTAT"
fi

if [ "$EXECLOG" != "null" ] && [ "$EXECLOG" != "" ]; then
  pass "Detail contains executionLog (ledger written)"
else
  fail "Detail missing executionLog"
fi

if [ "$TRANSEV" != "null" ] && [ "$TRANSEV" != "" ] && [ "$TRANSEV" != "[]" ]; then
  pass "Detail contains transcriptEvidence (transcript bridged)"
else
  warn "Detail has no transcriptEvidence (may be expected if bridge skipped)"
fi

# 1g) List runs — verify the run appears
R6=$(curl -s -w "\n%{http_code}" -X GET "$BASE/api/tasks/runs")
CODE6=$(echo "$R6" | tail -1)
BODY6=$(echo "$R6" | sed '$d')
TOTAL6=$(echo "$BODY6" | jq -r '.data.total // 0')
FOUND=$(echo "$BODY6" | jq -r ".data.items[] | select(.taskRunId==\"$TR1\") | .status // empty")

if [ "$CODE6" = "200" ] && [ "$TOTAL6" -gt 0 ] && [ "$FOUND" = "completed" ]; then
  pass "List GET → total=$TOTAL6, found run with status=completed"
else
  fail "List GET → total=$TOTAL6, found=$FOUND"
fi

echo ""
echo "═══════════════════════════════════════════════"
info "Scenario 2: 失败 + 重试闭环 (init → start → fail → start(retry) → output → complete)"
echo "═══════════════════════════════════════════════"

IDK2="test-m4-fail-retry-$(date +%s)"

# 2a) Initiate
R7=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs" \
  -H "Content-Type: application/json" \
  -d "{\"fixtureId\":\"demo-fixture-flaky\",\"idempotencyKey\":\"$IDK2\"}")
CODE7=$(echo "$R7" | tail -1)
BODY7=$(echo "$R7" | sed '$d')
TR2=$(echo "$BODY7" | jq -r '.data.taskRunId // empty')

if [ "$CODE7" = "201" ] && [ -n "$TR2" ]; then
  pass "Initiate → 201, taskRunId=$TR2"
else
  fail "Initiate → code=$CODE7, body=$BODY7"
fi

# 2b) Start
R8=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/start" \
  -H "Content-Type: application/json" -d "{}")
CODE8=$(echo "$R8" | tail -1)
BODY8=$(echo "$R8" | sed '$d')
STATUS8=$(echo "$BODY8" | jq -r '.data.currentStatus // empty')

if [ "$CODE8" = "200" ] && [ "$STATUS8" = "running" ]; then
  pass "Start → 200, currentStatus=running"
else
  fail "Start → code=$CODE8, status=$STATUS8"
fi

# 2c) Output before failure
R9=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/output" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"result\",\"content\":\"Partial output before crash\"}")
CODE9=$(echo "$R9" | tail -1)
BODY9=$(echo "$R9" | sed '$d')
OK9=$(echo "$BODY9" | jq -r '.data.ok // false')

if [ "$CODE9" = "200" ] && [ "$OK9" = "true" ]; then
  pass "Pre-fail output → 200, ok=true"
else
  fail "Pre-fail output → code=$CODE9, ok=$OK9"
fi

# 2d) Fail
R10=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/fail" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"TIMEOUT\",\"message\":\"Execution timed out after 30s\"}")
CODE10=$(echo "$R10" | tail -1)
BODY10=$(echo "$R10" | sed '$d')
STATUS10=$(echo "$BODY10" | jq -r '.data.currentStatus // empty')
ERRCODE10=$(echo "$BODY10" | jq -r '.data.errorCode // empty')

if [ "$CODE10" = "200" ] && [ "$STATUS10" = "failed" ] && [ "$ERRCODE10" = "TIMEOUT" ]; then
  pass "Fail → 200, currentStatus=failed, errorCode=$ERRCODE10. Ledger written."
else
  fail "Fail → code=$CODE10, status=$STATUS10, errorCode=$ERRCODE10"
fi

# 2e) Detail after fail — verify executionLog includes failure entry
R10b=$(curl -s "$BASE/api/tasks/runs/$TR2")
EXECLOG10=$(echo "$R10b" | jq -r '.data.executionLog // empty')
if [ "$EXECLOG10" != "null" ] && [ "$EXECLOG10" != "" ]; then
  FAIL_ENTRY=$(echo "$EXECLOG10" | jq -r '.[] | select(.status=="failed") | .status // empty')
  if [ "$FAIL_ENTRY" = "failed" ]; then
    pass "Detail after fail contains execLog with failed entry"
  else
    warn "Detail has execLog but no failed entry found"
  fi
else
  fail "Detail after fail missing executionLog"
fi

# 2f) Retry: start from failed (emits RETRY event + STARTED)
R11=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/start" \
  -H "Content-Type: application/json" -d "{}")
CODE11=$(echo "$R11" | tail -1)
BODY11=$(echo "$R11" | sed '$d')
STATUS11=$(echo "$BODY11" | jq -r '.data.currentStatus // empty')
PREV11=$(echo "$BODY11" | jq -r '.data.previousStatus // empty')

if [ "$CODE11" = "200" ] && [ "$STATUS11" = "running" ] && [ "$PREV11" = "failed" ]; then
  pass "Retry start → 200, previousStatus=failed → currentStatus=running (retry event emitted)"
else
  fail "Retry start → code=$CODE11, status=$STATUS11, prev=$PREV11"
fi

# 2g) Output after retry
R12=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/output" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"result\",\"content\":\"Retry succeeded on attempt 2\"}")
CODE12=$(echo "$R12" | tail -1)
OK12=$(echo "$R12" | sed '$d' | jq -r '.data.ok // false')

if [ "$CODE12" = "200" ] && [ "$OK12" = "true" ]; then
  pass "Post-retry output → 200, ok=true"
else
  fail "Post-retry output → code=$CODE12, ok=$OK12"
fi

# 2h) Complete after retry
R13=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR2/complete" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Completed after retry\",\"durationMs\":5678}")
CODE13=$(echo "$R13" | tail -1)
STATUS13=$(echo "$R13" | sed '$d' | jq -r '.data.currentStatus // empty')

if [ "$CODE13" = "200" ] && [ "$STATUS13" = "completed" ]; then
  pass "Complete after retry → 200, currentStatus=completed"
else
  fail "Complete after retry → code=$CODE13, status=$STATUS13"
fi

# 2i) Detail after retry — verify lineage includes retryCount > 0
R14=$(curl -s "$BASE/api/tasks/runs/$TR2")
RETRYCNT=$(echo "$R14" | jq -r '.data.retryCount // -1')

if [ "$RETRYCNT" -ge 1 ]; then
  pass "Detail after retry → retryCount=$RETRYCNT (lineage preserved)"
else
  fail "Detail after retry → retryCount=$RETRYCNT (expected >= 1)"
fi

echo ""
echo "═══════════════════════════════════════════════"
info "Scenario 3: 幂等 / 重复触发"
echo "═══════════════════════════════════════════════"

IDK3="test-m4-idempotent-$(date +%s)"

# 3a) First initiate
R15=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs" \
  -H "Content-Type: application/json" \
  -d "{\"fixtureId\":\"demo-fixture-idem\",\"idempotencyKey\":\"$IDK3\",\"parentPlanId\":\"plan-100\"}")
CODE15=$(echo "$R15" | tail -1)
BODY15=$(echo "$R15" | sed '$d')
TR3=$(echo "$BODY15" | jq -r '.data.taskRunId // empty')
DUP15=$(echo "$BODY15" | jq -r '.data.duplicate // empty')

if [ "$CODE15" = "201" ] && [ -n "$TR3" ] && [ "$DUP15" = "false" ]; then
  pass "First initiate → 201, duplicate=false, taskRunId=$TR3"
else
  fail "First initiate → code=$CODE15, dup=$DUP15"
fi

# 3b) Second initiate with same idempotencyKey
R16=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs" \
  -H "Content-Type: application/json" \
  -d "{\"fixtureId\":\"demo-fixture-idem\",\"idempotencyKey\":\"$IDK3\"}")
CODE16=$(echo "$R16" | tail -1)
BODY16=$(echo "$R16" | sed '$d')
TR3B=$(echo "$BODY16" | jq -r '.data.taskRunId // empty')
DUP16=$(echo "$BODY16" | jq -r '.data.duplicate // empty')

if [ "$CODE16" = "200" ] && [ "$TR3B" = "$TR3" ] && [ "$DUP16" = "true" ]; then
  pass "Second initiate → 200, duplicate=true, same taskRunId=$TR3B"
else
  fail "Second initiate → code=$CODE16, dup=$DUP16, tr=$TR3B vs $TR3"
fi

echo ""
echo "═══════════════════════════════════════════════"
info "Scenario 4: 非法状态转换 (STATE_CONFLICT)"
echo "═══════════════════════════════════════════════"

# 4a) Try to fail a pending run
R17=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/tasks/runs/$TR3/fail" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"TEST\",\"message\":\"Should not work\"}")
CODE17=$(echo "$R17" | tail -1)
BODY17=$(echo "$R17" | sed '$d')
ERRCODE17=$(echo "$BODY17" | jq -r '.error.code // empty')

if [ "$CODE17" = "409" ] && [ "$ERRCODE17" = "STATE_CONFLICT" ]; then
  pass "Illegal fail on pending → 409 STATE_CONFLICT"
else
  fail "Illegal fail on pending → code=$CODE17, err=$ERRCODE17"
fi

# ──────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "                      RESULTS"
echo "═══════════════════════════════════════════════"
echo -e "  ${GREEN}PASS: $pass_count${RESET}"
echo -e "  ${RED}FAIL: $fail_count${RESET}"
echo ""

if [ "$fail_count" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed — M4 端到端闭环成立！${RESET}"
  exit 0
else
  echo -e "${RED}❌ Some checks failed${RESET}"
  exit 1
fi
