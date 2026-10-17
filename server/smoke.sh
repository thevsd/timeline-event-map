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
