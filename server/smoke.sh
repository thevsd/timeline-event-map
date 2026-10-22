#!/usr/bin/env bash
# End-to-end check of the auth flow against a running server: ./smoke.sh [base-url]
# Uses up the login budget for this IP at the end (by design): that times it out for 1 minute, longer if run
# again within a day (2, 15, then 30 minutes). Restart the server to reset it.
set -euo pipefail
BASE=${1:-http://localhost:5137}; B=$BASE/api/auth
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
U="smoke$RANDOM$RANDOM"; P1="smoke-pass-$RANDOM-one"; P2="smoke-pass-$RANDOM-two"

# call METHOD PATH EXPECTED_STATUS [JSON]  -> body in $T/body
call() {
  local s; s=$(curl -s -o "$T/body" -w '%{http_code}' -b "$T/jar" -c "$T/jar" -X "$1" "$B$2" \
    ${4:+-H 'Content-Type: application/json' -d "$4"})
  [[ $s == "$3" ]] || { echo "FAIL $1 $2: expected $3, got $s: $(cat "$T/body")"; exit 1; }
  echo "ok   $1 $2 -> $s"
}
# A fresh solved captcha; every signup, login and recover needs one.
cap() { bash "$(dirname "$0")/solve-altcha.sh" "$BASE"; }

call GET  /me 401
call POST /signup 400 "{\"username\":\"$U\",\"password\":\"password123\",\"altcha\":\"$(cap)\"}"
grep -q CommonPassword "$T/body"
call POST /signup 200 "{\"username\":\"$U\",\"password\":\"$P1\",\"altcha\":\"$(cap)\"}"
CODE=$(sed -E 's/.*"recoveryCode":"([^"]+)".*/\1/' "$T/body")
call GET  /me 200
call POST /logout 204
call GET  /me 401
call POST /login 401 "{\"username\":\"$U\",\"password\":\"wrong-password\",\"altcha\":\"$(cap)\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P1\",\"altcha\":\"$(cap)\"}"
call POST /recover 401 "{\"username\":\"$U\",\"recoveryCode\":\"AAAA-AAAA-AAAA-AAAA\",\"newPassword\":\"$P2\",\"altcha\":\"$(cap)\"}"
# Typed sloppily on purpose: lowercase, no dashes.
LOOSE=$(echo "$CODE" | tr -d - | tr A-Z a-z)
call POST /recover 200 "{\"username\":\"$U\",\"recoveryCode\":\"$LOOSE\",\"newPassword\":\"$P2\",\"altcha\":\"$(cap)\"}"
grep -q recoveryCode "$T/body"
call POST /recover 401 "{\"username\":\"$U\",\"recoveryCode\":\"$CODE\",\"newPassword\":\"$P1\",\"altcha\":\"$(cap)\"}"
call POST /login 401 "{\"username\":\"$U\",\"password\":\"$P1\",\"altcha\":\"$(cap)\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\",\"altcha\":\"$(cap)\"}"

# Timelines, signed in as $U.
B=$BASE/api/timelines
idof() { sed -E 's/.*"id":"([^"]+)".*/\1/' "$T/body"; }
call GET  / 200
grep -qx '\[\]' "$T/body"
call POST / 400 '{"title":"no events list"}'
call POST / 200 '{"title":"First","events":[]}'
ID1=$(idof)
call POST / 200 '{"title":"  ","events":[]}'
grep -q '"title":"Untitled timeline"' "$T/body"
ID2=$(idof)
# Newest first.
call GET  / 200
[[ $(grep -o '"id":"[^"]*"' "$T/body" | head -1) == "\"id\":\"$ID2\"" ]] || { echo "FAIL: newest is not first"; exit 1; }
call PUT  "/$ID1" 200 '{"title":"First, edited","events":[]}'
call PATCH "/$ID1" 200 '{"title":"Renamed"}'
call GET  "/$ID1" 200
grep -q '"Renamed"' "$T/body"
call PATCH "/$ID1" 200 '{"pinned":true}'
grep -q '"pinned":true' "$T/body"
grep -q '"title":"Renamed"' "$T/body" || { echo "FAIL: pinning changed the title"; exit 1; }
S=$(head -c 10000001 /dev/zero | tr '\0' ' ' | curl -s -o /dev/null -w '%{http_code}' -b "$T/jar" -X POST "$B/" -H 'Content-Type: application/json' --data-binary @-)
[[ $S == 413 ]] || { echo "FAIL: 10 MB + 1 byte got $S, expected 413"; exit 1; }
echo "ok   POST / over 10 MB -> 413"
call DELETE "/$ID2" 204
call GET  "/$ID2" 404
# Someone else sees none of them, and cannot touch them.
B=$BASE/api/auth
call POST /logout 204
call POST /signup 200 "{\"username\":\"${U}b\",\"password\":\"$P1\",\"altcha\":\"$(cap)\"}"
B=$BASE/api/timelines
call GET  "/$ID1" 404
call PUT  "/$ID1" 404 '{"title":"Taken","events":[]}'
call PATCH "/$ID1" 404 '{"pinned":false}'
call DELETE "/$ID1" 404
call GET  / 200
grep -qx '\[\]' "$T/body"
B=$BASE/api/auth
call POST /logout 204
B=$BASE/api/timelines
call GET  / 401
B=$BASE/api/auth

# Captcha: missing, garbage and replayed ones are refused before anything else is looked at.
call POST /signup 400 "{\"username\":\"$U\",\"password\":\"$P2\"}"
grep -q CaptchaFailed "$T/body"
call POST /recover 400 "{\"username\":\"$U\",\"recoveryCode\":\"$CODE\",\"newPassword\":\"$P1\",\"altcha\":\"bm90IGEgY2FwdGNoYQ==\"}"
grep -q CaptchaFailed "$T/body"
USED=$(cap)
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\",\"altcha\":\"$USED\"}"
call POST /login 400 "{\"username\":\"$U\",\"password\":\"$P2\",\"altcha\":\"$USED\"}"
grep -q CaptchaFailed "$T/body"

# 10 login-budget calls so far (login + recover share it; refused captchas count too), so the 11th is throttled.
call POST /login 429 "{\"username\":\"$U\",\"password\":\"$P2\",\"altcha\":\"$(cap)\"}"
# Now that this network has been timed out, its captchas are 20x harder.
curl -s "$B/challenge" | grep -q '"maxnumber":2000000' || { echo "FAIL: challenge did not get harder"; exit 1; }
echo "ok   GET /challenge -> harder"
echo "all good"
