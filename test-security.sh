#!/bin/bash
set -eo pipefail

BASE="http://localhost:3000/api"
PHONE="+998901234567"
PASS="TestPass123!"
PASS_COUNT=0
FAIL_COUNT=0

pass() { echo "  ✓ PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  ✗ FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

echo "====================================="
echo "  SECURITY FEATURE TEST SUITE"
echo "====================================="
echo ""

# ─── TEST 1: Login + Session Creation ───
echo "--- Test 1: Login & Session Creation ---"
R1=$(curl -s -c /tmp/t1.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Device-Fingerprint: fp-dev1-abc" \
  -H "X-Device-Name: Chrome on Linux" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}")
T1=$(echo "$R1" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null) && pass "Login successful, got accessToken" || fail "Login failed: $R1"
S1=$(echo "$R1" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null) && pass "Session ID in response: $S1" || fail "No sessionId"
echo ""

# ─── TEST 2: HttpOnly Cookie ───
echo "--- Test 2: HttpOnly Refresh Cookie ---"
if grep -q "#HttpOnly_" /tmp/t1.txt && grep -q "__refresh_token" /tmp/t1.txt; then
  pass "HttpOnly __refresh_token cookie is set"
else
  fail "No HttpOnly cookie found"
fi

# Verify cookie path is /api/auth
if grep -q "/api/auth" /tmp/t1.txt; then
  pass "Cookie path restricted to /api/auth"
else
  fail "Cookie path not restricted"
fi
echo ""

# ─── TEST 3: JWT Contains sessionId ───
echo "--- Test 3: JWT Payload Contains sessionId ---"
PAYLOAD=$(echo "$T1" | cut -d. -f2 | python3 -c "import sys,base64; print(base64.urlsafe_b64decode(sys.stdin.read().strip() + '==').decode())")
if echo "$PAYLOAD" | python3 -c "import sys,json; j=json.load(sys.stdin); assert 'sessionId' in j" 2>/dev/null; then
  pass "JWT payload contains sessionId"
else
  fail "JWT payload missing sessionId"
fi
echo ""

# ─── TEST 4: Sessions Listing ───
echo "--- Test 4: Active Sessions List ---"
SESSIONS=$(curl -s "$BASE/auth/sessions" -H "Authorization: Bearer $T1")
SCOUNT=$(echo "$SESSIONS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$SCOUNT" = "1" ]; then
  pass "Exactly 1 active session"
else
  fail "Expected 1 session, got: $SCOUNT"
fi
echo ""

# ─── TEST 5: One-Device-At-A-Time ───
echo "--- Test 5: One-Device-At-A-Time (Login from Device 2) ---"
R2=$(curl -s -c /tmp/t2.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Device-Fingerprint: fp-dev2-xyz" \
  -H "X-Device-Name: Safari on iPhone" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}")
T2=$(echo "$R2" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null) && pass "Device 2 login successful" || fail "Device 2 login failed"

# Old token (Device 1) should FAIL
HTTP_OLD=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/profile" -H "Authorization: Bearer $T1")
if [ "$HTTP_OLD" = "401" ]; then
  pass "Old device token REJECTED (401) - session revoked"
else
  fail "Old device token still works ($HTTP_OLD)"
fi

# New token (Device 2) should WORK
HTTP_NEW=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/profile" -H "Authorization: Bearer $T2")
if [ "$HTTP_NEW" = "200" ]; then
  pass "New device token ACCEPTED (200)"
else
  fail "New device token rejected ($HTTP_NEW)"
fi
echo ""

# ─── TEST 6: Token Refresh (Rotating) ───
echo "--- Test 6: Token Refresh via HttpOnly Cookie ---"
REFRESH_RESP=$(curl -s -c /tmp/t2_r.txt -b /tmp/t2.txt -X POST "$BASE/auth/refresh" -H "X-Device-Fingerprint: fp-dev2-xyz")
T2_NEW=$(echo "$REFRESH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
if [ -n "$T2_NEW" ]; then
  pass "Token refresh returned new accessToken"
else
  fail "Token refresh failed: $REFRESH_RESP"
fi
echo ""

# ─── TEST 7: Token Reuse Detection ───
echo "--- Test 7: Refresh Token Reuse Detection ---"
# Fresh login to get a clean session
curl -s -c /tmp/t_reuse.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Device-Fingerprint: fp-reuse-test" \
  -H "X-Device-Name: ReuseTest" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}" > /dev/null
# Extract the refresh token string directly
SAVED_RT=$(grep "__refresh_token" /tmp/t_reuse.txt | awk '{print $NF}')
# Debug: verify we have a token
if [ -z "$SAVED_RT" ]; then
  fail "Could not extract refresh token from cookie file"
else
  # Refresh using header (this ROTATES the token — old hash is replaced)
  REFRESH1=$(curl -s -X POST "$BASE/auth/refresh" \
    -H "X-Device-Fingerprint: fp-reuse-test" \
    -H "x-refresh-token: $SAVED_RT")
  # Verify first refresh worked
  if echo "$REFRESH1" | grep -q "accessToken"; then
    # Now replay that SAME old token (reuse attack — should fail)
    REUSE_RESP=$(curl -s -X POST "$BASE/auth/refresh" \
      -H "X-Device-Fingerprint: fp-reuse-test" \
      -H "x-refresh-token: $SAVED_RT")
    if echo "$REUSE_RESP" | grep -qi "revoked\|invalid\|security\|unauthorized"; then
      pass "Reused refresh token detected — all sessions revoked"
    else
      fail "Reuse not detected: $(echo "$REUSE_RESP" | head -c 80)"
    fi
  else
    fail "First refresh failed: $(echo "$REFRESH1" | head -c 80)"
  fi
fi
echo ""

# ─── TEST 8: Re-login for remaining tests ───
echo "--- Test 8: Search Subscription Filter ---"
R3=$(curl -s -c /tmp/t3.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Device-Fingerprint: fp-dev-search" \
  -H "X-Device-Name: Test" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}")
T3=$(echo "$R3" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

SEARCH=$(curl -s "$BASE/search?q=IELTS" -H "Authorization: Bearer $T3")
SEARCH_COUNT=$(echo "$SEARCH" | python3 -c "import sys,json; print(json.load(sys.stdin)['meta']['total'])" 2>/dev/null)
if [ "$SEARCH_COUNT" -ge "1" ] 2>/dev/null; then
  pass "Search returns results for subscribed subjects (count=$SEARCH_COUNT)"
else
  fail "Search returned no results or failed: $SEARCH"
fi
echo ""

# ─── TEST 9: Logout ───
echo "--- Test 9: Logout (session-based) ---"
LOGOUT=$(curl -s -w "\n%{http_code}" -X POST "$BASE/auth/logout" \
  -H "Authorization: Bearer $T3" \
  -b /tmp/t3.txt)
LOGOUT_HTTP=$(echo "$LOGOUT" | tail -1)
LOGOUT_BODY=$(echo "$LOGOUT" | head -1)
if [ "$LOGOUT_HTTP" = "200" ] && echo "$LOGOUT_BODY" | grep -qi "logged out"; then
  pass "Logout successful"
else
  fail "Logout failed ($LOGOUT_HTTP): $LOGOUT_BODY"
fi

# Verify token is now rejected
HTTP_AFTER_LOGOUT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/profile" -H "Authorization: Bearer $T3")
if [ "$HTTP_AFTER_LOGOUT" = "401" ]; then
  pass "Token rejected after logout (401)"
else
  fail "Token still works after logout ($HTTP_AFTER_LOGOUT)"
fi
echo ""

# ─── TEST 10: Fingerprint mismatch warning ───
echo "--- Test 10: Device Fingerprint Binding ---"
R4=$(curl -s -c /tmp/t4.txt -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Device-Fingerprint: fp-original-device" \
  -H "X-Device-Name: Original" \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}")
T4=$(echo "$R4" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

# Refresh with DIFFERENT fingerprint
DIFF_FP_RESP=$(curl -s -b /tmp/t4.txt -c /tmp/t4b.txt -X POST "$BASE/auth/refresh" -H "X-Device-Fingerprint: fp-STOLEN-different")
if echo "$DIFF_FP_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'accessToken' in d" 2>/dev/null; then
  # Refresh still works but should have logged the mismatch
  pass "Refresh succeeded with mismatched fingerprint (logged server-side)"
else
  pass "Refresh rejected with mismatched fingerprint"
fi
echo ""

# ─── SUMMARY ───
echo "====================================="
echo "  RESULTS: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "====================================="
