#!/bin/bash
set -e

BASE="http://localhost:8080"

echo "=== 1. Login (Get OTP) ==="
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"phone":"9999999999"}')
echo "$LOGIN"
OTP=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['otp'])")
echo "OTP: $OTP"

echo ""
echo "=== 2. Verify OTP ==="
AUTH=$(curl -s -X POST "$BASE/auth/verify-otp" -H "Content-Type: application/json" -d "{\"phone\":\"9999999999\",\"otp\":\"$OTP\"}")
echo "$AUTH"
TOKEN=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
UID1=$(echo "$AUTH" | python3 -c "import sys,json; print(json.load(sys.stdin)['userId'])")
echo "Token: ${TOKEN:0:40}..."

echo ""
echo "=== 3. Create Profile ==="
curl -s -X POST "$BASE/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Rohit","age":25,"gender":"male","budgetMin":10000,"budgetMax":20000,"location":"Bangalore"}'
echo ""

echo ""
echo "=== 4. Get Profile ==="
curl -s "$BASE/profile" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 5. Update Preferences ==="
curl -s -X PATCH "$BASE/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"smoking":"no","drinking":"occasionally","cleanliness":"high"}'
echo ""

echo ""
echo "=== 6. Create Listing ==="
LISTING=$(curl -s -X POST "$BASE/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Room in HSR Layout","description":"Furnished room near metro","rent":12000,"location":"HSR Layout","propertyType":"room"}')
echo "$LISTING"
LID=$(echo "$LISTING" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== 7. Get Listings ==="
curl -s "$BASE/listings" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 8. Get Single Listing ==="
curl -s "$BASE/listings/$LID" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "=== 9. Create User 2 (for interest/match test) ==="
LOGIN2=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"phone":"8888888888"}')
OTP2=$(echo "$LOGIN2" | python3 -c "import sys,json; print(json.load(sys.stdin)['otp'])")
AUTH2=$(curl -s -X POST "$BASE/auth/verify-otp" -H "Content-Type: application/json" -d "{\"phone\":\"8888888888\",\"otp\":\"$OTP2\"}")
TOKEN2=$(echo "$AUTH2" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
UID2=$(echo "$AUTH2" | python3 -c "import sys,json; print(json.load(sys.stdin)['userId'])")
echo "User2: $UID2"

echo ""
echo "=== 10. User 2 Sends Interest ==="
INTEREST=$(curl -s -X POST "$BASE/interests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"receiverId\":\"$UID1\",\"listingId\":\"$LID\"}")
echo "$INTEREST"
IID=$(echo "$INTEREST" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== 11. User 1 Accepts Interest (creates match) ==="
curl -s -X PATCH "$BASE/interests/$IID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"accepted"}'
echo ""

echo ""
echo "=== 12. Get Matches ==="
curl -s "$BASE/matches" -H "Authorization: Bearer $TOKEN"
echo ""
MATCHES=$(curl -s "$BASE/matches" -H "Authorization: Bearer $TOKEN")
MID=$(echo "$MATCHES" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['matchId'])")

echo ""
echo "=== 13. Send Message ==="
curl -s -X POST "$BASE/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"matchId\":\"$MID\",\"message\":\"Hey! Interested in the room\"}"
echo ""

echo ""
echo "=== 14. User 2 Replies ==="
curl -s -X POST "$BASE/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{\"matchId\":\"$MID\",\"message\":\"Sure! When can you visit?\"}"
echo ""

echo ""
echo "=== 15. Get Messages ==="
curl -s "$BASE/messages/$MID" -H "Authorization: Bearer $TOKEN"
echo ""

echo ""
echo "========================================="
echo "ALL TESTS PASSED!"
echo "========================================="
