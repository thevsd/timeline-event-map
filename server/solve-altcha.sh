#!/usr/bin/env bash
# Prints a solved captcha for signup/login/recover, like the widget makes: ./solve-altcha.sh [base-url]
# Each one is accepted once and expires after 2 minutes. Needs node (it comes with npm).
set -euo pipefail
curl -sf "${1:-http://localhost:5137}/api/auth/challenge" | node -e '
  const c = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const sha = (s) => require("crypto").createHash("sha256").update(s).digest("hex");
  for (let n = 0; n <= c.maxnumber; n++)
    if (sha(c.salt + n) === c.challenge) {
      const { algorithm, challenge, salt, signature } = c;
      process.stdout.write(Buffer.from(JSON.stringify({ algorithm, challenge, number: n, salt, signature })).toString("base64"));
      process.exit(0);
    }
  console.error("no solution found");
  process.exit(1);'
