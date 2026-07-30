#!/usr/bin/env bash
# Everything that has to be true before this tree is allowed to reach anybody.
#
# One entry point on purpose. There were four checks and each one had to be
# remembered separately, which meant the deployment path ran the cheap two and
# the other two ran when somebody thought of it. A gate nobody can hold open by
# forgetting is worth more than a thorough one nobody runs.
#
# Called from three places and it must behave the same in all of them: the
# pre-push hook, the GitHub workflow, and deploy.sh against the exported tree.
# So it takes the directory to check as an argument, defaulting to the repo this
# script lives in, and it never touches anything outside it.
#
#   tools/check.sh            check this working tree
#   tools/check.sh /tmp/x     check an exported copy
#
# Exit 0 and the tree may ship. Anything else and it may not.
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT" || { echo "check: $ROOT is not a directory"; exit 1; }

FAILED=0
step() {
  local label="$1"; shift
  local out
  if out=$("$@" 2>&1); then
    printf '  ok    %s\n' "$label"
    # A check that has something to say when it passes says it indented, so the
    # summary stays one line per check and the detail is still there.
    [ -n "$out" ] && printf '%s\n' "$out" | sed 's/^/          /'
  else
    printf '  FAIL  %s\n' "$label"
    printf '%s\n' "$out" | sed 's/^/          /'
    FAILED=1
  fi
}

echo "checking $ROOT"

# ── Does it parse ────────────────────────────────────────────────────
# Every file, not only the changed ones. deploy.sh used to check just what
# rsync said had moved, which is right for speed and wrong for a gate: a file
# broken three commits ago and never touched since is still broken.
while IFS= read -r f; do
  step "node --check ${f#./}" node --check "$f"
done < <(find . -name '*.js' -not -path './.git/*' -not -path './node_modules/*' | sort)

while IFS= read -r f; do
  step "py_compile ${f#./}" python3 -m py_compile "$f"
done < <(find . -name '*.py' -not -path './.git/*' -not -path './__pycache__/*' | sort)

# ── Does it hold together ────────────────────────────────────────────
step "shells match dict.js"     node tools/gen-shell.js --check
step "policy archive is intact" node tools/check-policy.js
step "price blocks are distinct" node tools/check-prices.js
step "html, keys and routes"    python3 tools/check-html.py

# ── Is it the file a crawler expects ─────────────────────────────────
step "robots.txt and llms.txt exist" test -f site/robots.txt -a -f site/llms.txt

echo
if [ "$FAILED" -eq 0 ]; then
  echo "check: everything passed"
else
  echo "check: FAILED"
fi
exit "$FAILED"
