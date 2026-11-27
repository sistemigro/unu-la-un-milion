#!/usr/bin/env bash
# Fails if an answer bank reached anything a player can fetch.
#
# Greps for the ASCII canary planted in every bank rather than for a Romanian
# answer: a minifier may escape `ș` as ș, which a literal grep would miss.
#
# Checks the client chunks AND the server build. The server build legitimately
# contains the banks — that is where scoring happens — so only `.next/static`
# and the served HTML are failures. Pass a base URL to also check served pages:
#
#   scripts/check-leak.sh                        # build output only
#   scripts/check-leak.sh http://localhost:3100  # and the served HTML
set -uo pipefail

CANARY='ZZ-BANK-CANARY-ZZ'
BASE="${1:-}"
status=0

if [[ ! -d .next ]]; then
  echo "✗ no .next — run 'npm run build' first" >&2
  exit 2
fi

echo "→ client chunks (.next/static)"
if hits=$(grep -rl "$CANARY" .next/static 2>/dev/null); then
  echo "✗ LEAK — answer bank is in the client bundle:" >&2
  echo "$hits" | sed 's/^/    /' >&2
  status=1
else
  echo "  ✓ clean"
fi

echo "→ prerendered HTML (.next/server/app/**/*.html)"
if hits=$(find .next/server/app -name '*.html' -exec grep -l "$CANARY" {} + 2>/dev/null); then
  echo "✗ LEAK — answer bank is in prerendered HTML:" >&2
  echo "$hits" | sed 's/^/    /' >&2
  status=1
else
  echo "  ✓ clean"
fi

# The RSC payload is embedded in the served HTML, which is where a bank passed
# as a prop to a client component would surface — and it is NOT in .next/static.
if [[ -n "$BASE" ]]; then
  echo "→ served pages at $BASE"
  for path in / /joc/1-decembrie /joc/istorie /joc/geografie; do
    body=$(curl -s --max-time 20 "$BASE$path" 2>/dev/null)
    if [[ -z "$body" ]]; then
      echo "  ! $path unreachable — skipped" >&2
      continue
    fi
    if grep -q "$CANARY" <<<"$body"; then
      echo "✗ LEAK — answer bank is in the HTML served at $path" >&2
      status=1
    else
      echo "  ✓ $path clean"
    fi
  done
fi

if [[ $status -eq 0 ]]; then
  echo "✓ no answer bank reached the client"
else
  echo "✗ answer banks leaked — see above" >&2
fi
exit "$status"
