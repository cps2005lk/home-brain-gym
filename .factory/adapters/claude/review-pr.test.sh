#!/usr/bin/env bash
# Tests for review-pr.sh, with a fake `gh` (answers like GitHub) and a fake
# review.sh next to the script (records how it was called).
set -uo pipefail

src="$(cd "$(dirname "$0")" && pwd)/review-pr.sh"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1${2:+ ($2)}"; fails=$((fails + 1)); }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/kit"
cp "$src" "$tmp/kit/review-pr.sh"
cat >"$tmp/kit/review.sh" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$@" >"$FAKE_DIR/review-args"
exit "${FAKE_REVIEW_EXIT:-0}"
SH
cat >"$tmp/bin/gh" <<'SH'
#!/usr/bin/env bash
# gh pr view <n> --json <field> -q <expr>
[[ "$1 $2" == "pr view" ]] || exit 1
[[ -n "${FAKE_GH_FAIL:-}" ]] && { echo "no pull requests found" >&2; exit 1; }
echo "$3" >"$FAKE_DIR/gh-pr"
case "$5" in
  state) echo "${FAKE_STATE:-OPEN}" ;;
  headRefName) echo "${FAKE_HEAD:-feature}" ;;
  headRefOid) echo "${FAKE_OID:-$(git rev-parse HEAD)}" ;;
  baseRefName) echo "${FAKE_BASE:-main}" ;;
  files) printf '%b\n' "${FAKE_FILES:-specs/001-x/spec.md\nsrc/app.ts}" ;;
  *) exit 1 ;;
esac
SH
chmod +x "$tmp/kit/review-pr.sh" "$tmp/kit/review.sh" "$tmp/bin/gh"
export FAKE_DIR="$tmp" PATH="$tmp/bin:$PATH"

p="$tmp/proj"
git init -q -b main "$p" && cd "$p" || exit 1
git config user.email t@example.com && git config user.name t
mkdir -p specs/001-x && echo "# Spec" >specs/001-x/spec.md && git add -A && git commit -q -m base
git switch -q -c feature && echo x >app.ts && git add -A && git commit -q -m "Add x"

run() { rm -f "$tmp/review-args"; "$tmp/kit/review-pr.sh" "$@" >"$tmp/out" 2>&1; echo $?; }
called() { [[ -e "$tmp/review-args" ]]; }

# Runs the review
[[ "$(run 2)" == 0 ]] && called && pass "PR 2: runs review.sh" || fail "runs review.sh" "$(cat "$tmp/out")"
[[ "$(tr '\n' ' ' <"$tmp/review-args")" == "--base main specs/001-x " ]] && pass "with the PR's base and its spec folder" || fail "args" "$(tr '\n' ' ' <"$tmp/review-args")"
for form in "#2" "PR#2" "pr#2" "PR 2"; do
  rm -f "$tmp/gh-pr"; run $form >/dev/null; [[ "$(cat "$tmp/gh-pr" 2>/dev/null)" == 2 ]] || fail "reads the number from '$form'"
done && pass "reads 2, #2, PR#2, pr#2 and 'PR 2'"
FAKE_BASE=develop; export FAKE_BASE
run 2 >/dev/null; grep -qx develop "$tmp/review-args" && pass "a PR into another branch is compared with that branch" || fail "other base"
unset FAKE_BASE
run --model opus 2 >/dev/null; [[ "$(tr '\n' ' ' <"$tmp/review-args")" == "--base main --model opus specs/001-x " ]] && pass "--model reaches review.sh" || fail "--model" "$(tr '\n' ' ' <"$tmp/review-args")"
FAKE_FILES='specs/001-x/spec.md\nspecs/001-x/review.md\nspecs/001-x/tasks.md'; export FAKE_FILES
run 2 >/dev/null; grep -qx specs/001-x "$tmp/review-args" && pass "several files in one spec folder: one folder" || fail "one folder"
unset FAKE_FILES
FAKE_REVIEW_EXIT=1; export FAKE_REVIEW_EXIT
[[ "$(run 2)" == 1 ]] && pass "review.sh's exit code comes back (1 = CHANGES NEEDED)" || fail "exit code passed through"
unset FAKE_REVIEW_EXIT

# Refuses (2), without calling review.sh
refuse() { # name, then args; env set by the caller
  local name="$1"; shift
  [[ "$(run "$@")" == 2 ]] && ! called && pass "$name" || fail "$name" "$(cat "$tmp/out")"
}
refuse "no PR number: refused"
refuse "not a number: refused" abc
refuse "--another-round: refused (a human runs review.sh)" --another-round 2
grep -q "a human" "$tmp/out" && pass "--another-round: says a human decides" || fail "another round message"
FAKE_GH_FAIL=1 refuse "PR not found: refused" 9
FAKE_STATE=MERGED refuse "merged PR: refused" 2
FAKE_STATE=CLOSED refuse "closed PR: refused" 2
FAKE_HEAD=other refuse "on a different branch: refused" 2
grep -q "git switch other" "$tmp/out" && pass "different branch: says which branch to switch to" || fail "switch hint" "$(cat "$tmp/out")"
FAKE_OID=0000000000000000000000000000000000000000 refuse "branch differs from the PR on GitHub: refused" 2
FAKE_FILES='src/app.ts' refuse "no spec folder in the PR: refused" 2
FAKE_FILES='specs/001-x/spec.md\nspecs/002-y/spec.md' refuse "two spec folders: refused" 2
grep -q "specs/002-y" "$tmp/out" && pass "two spec folders: names them" || fail "names both folders"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
