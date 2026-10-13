#!/usr/bin/env bash
# End-to-end check of the auth flow against a running server: ./smoke.sh [base-url]
# Uses up the login budget for this IP at the end (by design); restart the server to reset it.
set -euo pipefail
B=${1:-http://localhost:5137}/api/auth
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
U="smoke$RANDOM$RANDOM"; P1="smoke-pass-$RANDOM-one"; P2="smoke-pass-$RANDOM-two"

# call METHOD PATH EXPECTED_STATUS [JSON]  -> body in $T/body
call() {
  local s; s=$(curl -s -o "$T/body" -w '%{http_code}' -b "$T/jar" -c "$T/jar" -X "$1" "$B$2" \
    ${4:+-H 'Content-Type: application/json' -d "$4"})
  [[ $s == "$3" ]] || { echo "FAIL $1 $2: expected $3, got $s: $(cat "$T/body")"; exit 1; }
  echo "ok   $1 $2 -> $s"
}

call GET  /me 401
call POST /signup 400 "{\"username\":\"$U\",\"password\":\"password123\"}"
grep -q CommonPassword "$T/body"
call POST /signup 200 "{\"username\":\"$U\",\"password\":\"$P1\"}"
CODE=$(sed -E 's/.*"recoveryCode":"([^"]+)".*/\1/' "$T/body")
call GET  /me 200
call POST /logout 204
call GET  /me 401
call POST /login 401 "{\"username\":\"$U\",\"password\":\"wrong-password\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P1\"}"
call POST /recover 401 "{\"username\":\"$U\",\"recoveryCode\":\"AAAA-AAAA-AAAA-AAAA\",\"newPassword\":\"$P2\"}"
# Typed sloppily on purpose: lowercase, no dashes.
LOOSE=$(echo "$CODE" | tr -d - | tr A-Z a-z)
call POST /recover 200 "{\"username\":\"$U\",\"recoveryCode\":\"$LOOSE\",\"newPassword\":\"$P2\"}"
grep -q recoveryCode "$T/body"
call POST /recover 401 "{\"username\":\"$U\",\"recoveryCode\":\"$CODE\",\"newPassword\":\"$P1\"}"
call POST /login 401 "{\"username\":\"$U\",\"password\":\"$P1\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\"}"

# 7 login-budget calls so far (login + recover share it); 3 more pass, the 11th is throttled.
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\"}"
call POST /login 200 "{\"username\":\"$U\",\"password\":\"$P2\"}"
call POST /login 429 "{\"username\":\"$U\",\"password\":\"$P2\"}"
echo "all good"
