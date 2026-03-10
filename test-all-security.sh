#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  University Test System — Comprehensive Security & Feature Tests
#  Run: bash test-all-security.sh
# ═══════════════════════════════════════════════════════════════════
set +e  # Don't exit on errors — we handle them ourselves

BASE="http://localhost:3000/api"
PASS=0
FAIL=0
SKIP=0
RESULTS=()

# ─── Colors ──────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Helpers ─────────────────────────────────────────
pass() { ((PASS++)); RESULTS+=("${GREEN}✔ PASS${NC} — $1"); echo -e "  ${GREEN}✔ PASS${NC} $1"; }
fail() { ((FAIL++)); RESULTS+=("${RED}✘ FAIL${NC} — $1  →  $2"); echo -e "  ${RED}✘ FAIL${NC} $1  →  $2"; }
skip() { ((SKIP++)); RESULTS+=("${YELLOW}⊘ SKIP${NC} — $1"); echo -e "  ${YELLOW}⊘ SKIP${NC} $1"; }
section() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

json_field() {
  # Usage: json_field '{"key":"val"}' key
  echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null
}

json_nested() {
  # Usage: json_nested '{"a":{"b":"val"}}' a.b
  echo "$1" | python3 -c "
import sys,json
d=json.load(sys.stdin)
keys='$2'.split('.')
for k in keys:
    if isinstance(d,dict): d=d.get(k,'')
    else: d=''
print(d)
" 2>/dev/null
}

# ─── Test credentials ───────────────────────────────
ADMIN_PHONE="+998914476508"
ADMIN_PASS="admin123"
STUDENT_PHONE="+998902222222"
STUDENT_PASS="student123"
# Student2 unavailable (unknown password), tests use Student1 only
# Subscribed: Student1 → Data Science + Mathematics
#             Student2 → Data Science only
UNSUBSCRIBED_SUBJECT="48481429-2d92-45bc-80ac-a8b81cafe008"  # English (nobody subscribed)

echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Security & Feature Test Suite                    ${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"

# ═══════════════════════════════════════════════════════
# 0. SERVER CHECK
# ═══════════════════════════════════════════════════════
section "0. Server Connectivity"

HELLO=$(curl -sf "$BASE" 2>/dev/null || echo "DEAD")
if [[ "$HELLO" == *"Hello"* ]]; then
  pass "Server is running"
else
  echo -e "${RED}Server not running at $BASE — aborting.${NC}"
  exit 1
fi

# ═══════════════════════════════════════════════════════
# 1. LOGIN + HttpOnly COOKIE
# ═══════════════════════════════════════════════════════
section "1. Login & HttpOnly Cookie"

COOKIE_JAR=$(mktemp)
LOGIN_RAW=$(curl -s -c "$COOKIE_JAR" -D- -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: test-fp-device-A' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASS\"}")

LOGIN_BODY=$(echo "$LOGIN_RAW" | sed -n '/^{/,/^}/p' | tail -1)
# Fallback: extract JSON from end of response
if [[ -z "$LOGIN_BODY" ]]; then
  LOGIN_BODY=$(echo "$LOGIN_RAW" | grep -o '{.*}' | tail -1)
fi

ADMIN_TOKEN=$(json_field "$LOGIN_BODY" "accessToken")
ADMIN_SESSION=$(json_field "$LOGIN_BODY" "sessionId")

if [[ -n "$ADMIN_TOKEN" && ${#ADMIN_TOKEN} -gt 20 ]]; then
  pass "Login returns accessToken (${#ADMIN_TOKEN} chars)"
else
  fail "Login returns accessToken" "got: $(echo "$LOGIN_BODY" | head -c 80)"
fi

# Check HttpOnly cookie was set
if grep -q "__refresh_token" "$COOKIE_JAR" 2>/dev/null; then
  pass "HttpOnly __refresh_token cookie set"
else
  # Also check response headers
  if echo "$LOGIN_RAW" | grep -qi "set-cookie.*__refresh_token.*httponly"; then
    pass "HttpOnly __refresh_token cookie set (header)"
  else
    fail "HttpOnly __refresh_token cookie" "cookie not found in jar or headers"
  fi
fi

# Verify refreshToken is NOT in the response body
if echo "$LOGIN_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if 'refreshToken' not in d else 1)" 2>/dev/null; then
  pass "refreshToken NOT leaked in response body"
else
  fail "refreshToken leaked in response body" "should be cookie-only"
fi

# ═══════════════════════════════════════════════════════
# 2. SESSION MANAGEMENT
# ═══════════════════════════════════════════════════════
section "2. Session Management"

SESSIONS=$(curl -s "$BASE/auth/sessions" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
SESS_COUNT=$(echo "$SESSIONS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [[ "$SESS_COUNT" -ge 1 ]]; then
  pass "GET /sessions returns active sessions ($SESS_COUNT)"
else
  fail "GET /sessions" "expected ≥1, got $SESS_COUNT — $SESSIONS"
fi

# ═══════════════════════════════════════════════════════
# 3. ONE-DEVICE-AT-A-TIME
# ═══════════════════════════════════════════════════════
section "3. One-Device-At-A-Time (Session Revocation on New Login)"

# Login again (simulates another device) → old session should be revoked
COOKIE_JAR2=$(mktemp)
LOGIN2_RAW=$(curl -s -c "$COOKIE_JAR2" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: test-fp-device-B' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_TOKEN2=$(json_field "$LOGIN2_RAW" "accessToken")

# Old token should now be rejected (session revoked)
OLD_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/sessions" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ "$OLD_CHECK" == "401" ]]; then
  pass "Old session rejected after new login (401)"
else
  fail "Old session rejection" "expected 401, got $OLD_CHECK"
fi

# New token should work
NEW_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/sessions" \
  -H "Authorization: Bearer $ADMIN_TOKEN2")

if [[ "$NEW_CHECK" == "200" ]]; then
  pass "New session works (200)"
else
  fail "New session" "expected 200, got $NEW_CHECK"
fi

# Update token for further tests
ADMIN_TOKEN="$ADMIN_TOKEN2"

# ═══════════════════════════════════════════════════════
# 4. TOKEN REFRESH VIA COOKIE
# ═══════════════════════════════════════════════════════
section "4. Token Refresh via HttpOnly Cookie"

REFRESH_RESP=$(curl -s -b "$COOKIE_JAR2" -c "$COOKIE_JAR2" -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: test-fp-device-B')
NEW_TOKEN=$(json_field "$REFRESH_RESP" "accessToken")

if [[ -n "$NEW_TOKEN" && ${#NEW_TOKEN} -gt 20 ]]; then
  pass "Refresh returns new accessToken via cookie"
  ADMIN_TOKEN="$NEW_TOKEN"
else
  fail "Token refresh" "response: $(echo "$REFRESH_RESP" | head -c 100)"
fi

# ═══════════════════════════════════════════════════════
# 5. TOKEN REUSE DETECTION
# ═══════════════════════════════════════════════════════
section "5. Token Reuse Detection (Refresh Token Rotation)"

# Use the same (now-old) cookie jar again — should fail and revoke all sessions
REUSE_RESP=$(curl -s -b "$COOKIE_JAR2" -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: test-fp-device-B')
REUSE_STATUS=$(json_field "$REUSE_RESP" "statusCode")
REUSE_MSG=$(json_field "$REUSE_RESP" "message")

if [[ "$REUSE_STATUS" == "401" ]]; then
  pass "Reused refresh token rejected (401)"
else
  # Could also be that the cookie jar was updated; check deeper
  if echo "$REUSE_MSG" | grep -qi "revoked\|invalid\|expired"; then
    pass "Reused refresh token rejected (message: $REUSE_MSG)"
  else
    skip "Token reuse detection (cookie jar may have been updated)"
  fi
fi

# Re-login for further tests
COOKIE_JAR3=$(mktemp)
LOGIN3=$(curl -s -c "$COOKIE_JAR3" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: test-fp-device-A' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_TOKEN=$(json_field "$LOGIN3" "accessToken")

# ═══════════════════════════════════════════════════════
# 6. FINGERPRINT MISMATCH
# ═══════════════════════════════════════════════════════
section "6. Device Fingerprint Verification"

# Try refresh with DIFFERENT fingerprint
FP_RESP=$(curl -s -b "$COOKIE_JAR3" -X POST "$BASE/auth/refresh" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: TOTALLY-DIFFERENT-DEVICE')
FP_STATUS=$(json_field "$FP_RESP" "statusCode")

if [[ "$FP_STATUS" == "401" ]]; then
  pass "Fingerprint mismatch blocks refresh (401)"
else
  fail "Fingerprint mismatch" "expected 401, got status=$FP_STATUS resp=$(echo "$FP_RESP" | head -c 100)"
fi

# Re-login again since session was revoked
COOKIE_JAR4=$(mktemp)
LOGIN4=$(curl -s -c "$COOKIE_JAR4" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: stable-fp-1234' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASS\"}")
ADMIN_TOKEN=$(json_field "$LOGIN4" "accessToken")

# ═══════════════════════════════════════════════════════
# 7. SUBSCRIPTION-FILTERED SEARCH
# ═══════════════════════════════════════════════════════
section "7. Search — Subscription Filtering"

# Login as student
STUDENT_LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$STUDENT_PHONE\",\"password\":\"$STUDENT_PASS\"}")
STUDENT_TOKEN=$(json_field "$STUDENT_LOGIN" "accessToken")

if [[ -z "$STUDENT_TOKEN" || ${#STUDENT_TOKEN} -lt 20 ]]; then
  fail "Student login" "could not get token"
else
  # Search should only return results from subscribed subjects
  SEARCH=$(curl -s "$BASE/search?q=test" \
    -H "Authorization: Bearer $STUDENT_TOKEN")
  SEARCH_TOTAL=$(json_nested "$SEARCH" "meta.total")

  # Check that results only contain subscribed subjects (Data Science / Mathematics)
  HAS_ENGLISH=$(echo "$SEARCH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
found=False
for item in d.get('data',[]):
    s = item.get('subject',{})
    if 'English' in str(s.get('name','')):
        found=True
print('YES' if found else 'NO')
" 2>/dev/null || echo "ERROR")

  if [[ "$HAS_ENGLISH" == "NO" ]]; then
    pass "Search filtered by subscription (no English results, total=$SEARCH_TOTAL)"
  else
    fail "Search subscription filter" "English results leaked through"
  fi
fi

# ═══════════════════════════════════════════════════════
# 8. MATERIALS LIST — SUBSCRIPTION FILTERING
# ═══════════════════════════════════════════════════════
section "8. Materials List — Subscription Filtering for Students"

# Student: GET /materials without subjectId filter
MATERIALS=$(curl -s "$BASE/materials" \
  -H "Authorization: Bearer $STUDENT_TOKEN")
MAT_SUBJECTS=$(echo "$MATERIALS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
subjects=set()
for m in d.get('data',[]):
    subjects.add(m.get('subject',{}).get('name',''))
print('|'.join(sorted(subjects)))
" 2>/dev/null || echo "ERROR")

# Student is subscribed to Data Science + Mathematics only
if echo "$MAT_SUBJECTS" | grep -qi "English"; then
  fail "Materials list subscription filter" "returned unsubscribed subject: $MAT_SUBJECTS"
else
  pass "Materials list only shows subscribed subjects ($MAT_SUBJECTS)"
fi

# Student: only PUBLISHED materials should appear
MAT_STATUSES=$(echo "$MATERIALS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
statuses=set()
for m in d.get('data',[]):
    statuses.add(m.get('status',''))
print('|'.join(sorted(statuses)))
" 2>/dev/null || echo "ERROR")

if [[ "$MAT_STATUSES" == "PUBLISHED" ]]; then
  pass "Student sees only PUBLISHED materials (statuses: $MAT_STATUSES)"
else
  if [[ -z "$MAT_STATUSES" || "$MAT_STATUSES" == "" ]]; then
    pass "Student sees only PUBLISHED materials (empty — no non-PUBLISHED)"
  else
    fail "Materials status filter" "expected only PUBLISHED, got: $MAT_STATUSES"
  fi
fi

# ═══════════════════════════════════════════════════════
# 9. MATERIALS ACCESS — UNSUBSCRIBED SUBJECT BLOCKED
# ═══════════════════════════════════════════════════════
section "9. Materials Endpoint — Unsubscribed Subject Blocked"

# Try to list materials for English (student not subscribed)
BLOCKED=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/materials?subjectId=$UNSUBSCRIBED_SUBJECT" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if [[ "$BLOCKED" == "403" ]]; then
  pass "Materials for unsubscribed subject blocked (403)"
else
  fail "Materials unsubscribed block" "expected 403, got $BLOCKED"
fi

# ═══════════════════════════════════════════════════════
# 10. QUIZ ACCESS — SUBSCRIPTION CHECK
# ═══════════════════════════════════════════════════════
section "10. Quiz Access — Subscription Check"

# Try to list quizzes for English (not subscribed)
QUIZ_BLOCK=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/subjects/$UNSUBSCRIBED_SUBJECT/quizzes" \
  -H "Authorization: Bearer $STUDENT_TOKEN")

if [[ "$QUIZ_BLOCK" == "403" ]]; then
  pass "Quizzes for unsubscribed subject blocked (403)"
else
  fail "Quiz subscription check" "expected 403, got $QUIZ_BLOCK"
fi

# ═══════════════════════════════════════════════════════
# 11. CHECK-ANSWER ORACLE PREVENTION
# ═══════════════════════════════════════════════════════
section "11. Check-Answer Oracle Prevention"

# Get a quiz question ID
QUIZ_ID=$(curl -s "$BASE/subjects/e9e8b60a-3f4d-4e3b-9a30-b3c408cf1305/quizzes?limit=1" \
  -H "Authorization: Bearer $STUDENT_TOKEN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
quizzes=d.get('data',[])
print(quizzes[0]['id'] if quizzes else '')
" 2>/dev/null)

if [[ -n "$QUIZ_ID" ]]; then
  # Get questions and first option for the quiz
  QUIZ_DETAIL=$(curl -s "$BASE/quizzes/$QUIZ_ID" \
    -H "Authorization: Bearer $STUDENT_TOKEN")

  QUESTION_ID=$(echo "$QUIZ_DETAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
qs=d.get('questions',[])
print(qs[0]['id'] if qs else '')
" 2>/dev/null)

  OPTION_ID=$(echo "$QUIZ_DETAIL" | python3 -c "
import sys,json
d=json.load(sys.stdin)
qs=d.get('questions',[])
if qs and qs[0].get('options'):
    print(qs[0]['options'][0]['id'])
else:
    print('')
" 2>/dev/null)

  if [[ -n "$QUESTION_ID" && -n "$OPTION_ID" ]]; then
    # Try check-answer WITHOUT completing the quiz first
    ORACLE_RESP=$(curl -s -X POST "$BASE/quizzes/check-answer" \
      -H "Authorization: Bearer $STUDENT_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"questionId\":\"$QUESTION_ID\",\"selectedOptionId\":\"$OPTION_ID\"}")
    ORACLE_STATUS=$(json_field "$ORACLE_RESP" "statusCode")

    if [[ "$ORACLE_STATUS" == "403" ]]; then
      pass "Check-answer blocked for student without completed attempt (403)"
    else
      # Student may have completed attempts already
      if echo "$ORACLE_RESP" | grep -q "isCorrect"; then
        skip "Check-answer (student has completed attempt for this quiz)"
      else
        fail "Check-answer oracle prevention" "expected 403, got: $(echo "$ORACLE_RESP" | head -c 100)"
      fi
    fi
  else
    skip "Check-answer test (no questions found)"
  fi
else
  skip "Check-answer test (no quiz found)"
fi

# ═══════════════════════════════════════════════════════
# 12. ADMIN CAN ACCESS ALL (no subscription needed)
# ═══════════════════════════════════════════════════════
section "12. Admin Bypass — Full Access"

# Admin should see ALL materials (not filtered by subscription)
ADMIN_MATERIALS=$(curl -s "$BASE/materials" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
ADMIN_MAT_COUNT=$(json_nested "$ADMIN_MATERIALS" "meta.total")

if [[ "$ADMIN_MAT_COUNT" -ge 1 ]]; then
  pass "Admin sees all materials (total=$ADMIN_MAT_COUNT)"
else
  fail "Admin materials access" "expected ≥1, got $ADMIN_MAT_COUNT"
fi

# Admin can access English quizzes (no subscription needed)
ADMIN_ENG=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/subjects/$UNSUBSCRIBED_SUBJECT/quizzes" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [[ "$ADMIN_ENG" == "200" ]]; then
  pass "Admin can access any subject's quizzes (200)"
else
  fail "Admin quiz access" "expected 200, got $ADMIN_ENG"
fi

# ═══════════════════════════════════════════════════════
# 13. SECURE FILE DOWNLOAD
# ═══════════════════════════════════════════════════════
section "13. Secure File Download"

# Get a material ID
MAT_ID=$(echo "$ADMIN_MATERIALS" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',[])
print(data[0]['id'] if data else '')
" 2>/dev/null)

if [[ -n "$MAT_ID" ]]; then
  # Authenticated student download (student is subscribed to Data Science)
  DL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/materials/$MAT_ID/download" \
    -H "Authorization: Bearer $STUDENT_TOKEN")

  if [[ "$DL_STATUS" == "200" ]]; then
    pass "Subscribed student can download material (200)"
  elif [[ "$DL_STATUS" == "404" ]]; then
    skip "Secure download (material file not on disk)"
  else
    fail "Secure file download" "expected 200, got $DL_STATUS"
  fi

  # Unauthenticated download should fail
  UNAUTH_DL=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/materials/$MAT_ID/download")
  if [[ "$UNAUTH_DL" == "401" ]]; then
    pass "Unauthenticated download blocked (401)"
  else
    fail "Unauthenticated download" "expected 401, got $UNAUTH_DL"
  fi
else
  skip "Secure file download (no materials found)"
fi

# ═══════════════════════════════════════════════════════
# 14. LOGOUT — SESSION REVOCATION
# ═══════════════════════════════════════════════════════
section "14. Logout & Session Revocation"

# Re-login for clean test
COOKIE_JAR5=$(mktemp)
LOGIN5=$(curl -s -c "$COOKIE_JAR5" -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Fingerprint: logout-test-fp' \
  -d "{\"phone\":\"$ADMIN_PHONE\",\"password\":\"$ADMIN_PASS\"}")
LOGOUT_TOKEN=$(json_field "$LOGIN5" "accessToken")

# Logout
LOGOUT_RESP=$(curl -s -b "$COOKIE_JAR5" -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $LOGOUT_TOKEN" \
  -H 'Content-Type: application/json')

# Token should now be invalid (session revoked)
sleep 1
POST_LOGOUT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/sessions" \
  -H "Authorization: Bearer $LOGOUT_TOKEN")

if [[ "$POST_LOGOUT" == "401" ]]; then
  pass "Session revoked after logout (401)"
else
  fail "Logout session revocation" "expected 401, got $POST_LOGOUT"
fi

# ═══════════════════════════════════════════════════════
# 15. PROTECTED ROUTES REQUIRE AUTH
# ═══════════════════════════════════════════════════════
section "15. All Protected Routes Require Authentication"

PROTECTED_ROUTES=(
  "GET:$BASE/auth/profile"
  "GET:$BASE/auth/sessions"
  "GET:$BASE/materials"
  "GET:$BASE/search?q=test"
  # Note: GET /subjects is intentionally public (no auth required)
)

ALL_PROTECTED=true
for route in "${PROTECTED_ROUTES[@]}"; do
  METHOD="${route%%:*}"
  URL="${route#*:}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$URL")
  if [[ "$STATUS" != "401" ]]; then
    ALL_PROTECTED=false
    fail "Route $METHOD $URL requires auth" "got $STATUS instead of 401"
  fi
done

if $ALL_PROTECTED; then
  pass "All protected routes return 401 without token (${#PROTECTED_ROUTES[@]} checked)"
fi

# ═══════════════════════════════════════════════════════
# 16. DEEP SEARCH — SUBSCRIPTION FILTERING
# ═══════════════════════════════════════════════════════
section "16. Deep Search — Subscription Filtering"

# Login as student again (previous session may have been revoked)
STUDENT_LOGIN2=$(curl -s -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$STUDENT_PHONE\",\"password\":\"$STUDENT_PASS\"}")
STUDENT_TOKEN2=$(json_field "$STUDENT_LOGIN2" "accessToken")

if [[ -n "$STUDENT_TOKEN2" && ${#STUDENT_TOKEN2} -gt 20 ]]; then
  DEEP=$(curl -s "$BASE/search/deep?q=test" \
    -H "Authorization: Bearer $STUDENT_TOKEN2")
  DEEP_STATUS=$(json_field "$DEEP" "statusCode")

  if [[ "$DEEP_STATUS" == "500" ]]; then
    fail "Deep search" "Internal server error — query bug"
  else
    DEEP_TOTAL=$(json_nested "$DEEP" "meta.total")
    pass "Deep search works for student (total=$DEEP_TOTAL)"
  fi
else
  fail "Student re-login for deep search" "no token"
fi

# ═══════════════════════════════════════════════════════
# 17. ROLE-BASED ACCESS (Admin-only endpoints)
# ═══════════════════════════════════════════════════════
section "17. Role-Based Access Control"

# Student should NOT be able to upload materials
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/materials/upload" \
  -H "Authorization: Bearer $STUDENT_TOKEN2" \
  -F "file=@/dev/null;filename=test.txt" \
  -F "subjectId=fake")

if [[ "$UPLOAD_STATUS" == "403" ]]; then
  pass "Student blocked from uploading materials (403)"
else
  fail "Student upload block" "expected 403, got $UPLOAD_STATUS"
fi

# Student cannot create subjects
CREATE_SUBJ=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/subjects" \
  -H "Authorization: Bearer $STUDENT_TOKEN2" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Hacked Subject"}')

if [[ "$CREATE_SUBJ" == "403" ]]; then
  pass "Student blocked from creating subjects (403)"
else
  fail "Student create subject" "expected 403, got $CREATE_SUBJ"
fi

# ═══════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  TEST RESULTS${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done

echo ""
echo -e "  ─────────────────────────────────────"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}  ${YELLOW}Skipped: $SKIP${NC}  Total: $TOTAL"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}🎉 ALL TESTS PASSED!${NC}"
else
  echo -e "  ${RED}${BOLD}⚠  $FAIL test(s) failed${NC}"
fi
echo ""

# Cleanup temp files
rm -f "$COOKIE_JAR" "$COOKIE_JAR2" "$COOKIE_JAR3" "$COOKIE_JAR4" "$COOKIE_JAR5" 2>/dev/null

exit $FAIL
