#!/usr/bin/env bash
# Tests for review.sh, with a fake `claude` on PATH that records how it was
# called and answers with a chosen verdict.
set -uo pipefail

script="$(cd "$(dirname "$0")" && pwd)/review.sh"
fails=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1${2:+ ($2)}"; fails=$((fails + 1)); }

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin"
cat >"$tmp/bin/claude" <<'SH'
#!/usr/bin/env bash
printf '%s\n' "$@" >"$FAKE_DIR/args"
cat >"$FAKE_DIR/prompt"
printf 'Findings: none\n\n%b\n' "${FAKE_LAST:-Verdict: APPROVE}"
SH
chmod +x "$tmp/bin/claude"
export FAKE_DIR="$tmp" PATH="$tmp/bin:$PATH"

# A project with a spec, a reviewer file, a check, and one commit on a branch.
p="$tmp/proj"
git init -q -b main "$p" && cd "$p" || exit 1
git config user.email t@example.com && git config user.name t
mkdir -p specs/001-x .claude/agents scripts
echo "# Spec: x" >specs/001-x/spec.md; echo "# Tasks" >specs/001-x/tasks.md
echo "reviewer" >.claude/agents/reviewer.md
printf '#!/usr/bin/env bash\necho "ALL CHECKS PASSED"\n' >scripts/check.sh; chmod +x scripts/check.sh
git add -A && git commit -q -m base
git switch -q -c feature && echo "echo hello" >hello.sh && git add hello.sh && git commit -q -m "Add hello"

run() { "$script" "$@" >"$tmp/out" 2>&1; echo $?; }

[[ "$(run specs/001-x)" == 0 ]] && pass "APPROVE: exit 0" || fail "APPROVE: exit 0" "$(cat "$tmp/out")"
grep -q "^--agent$" "$tmp/args" && grep -qx reviewer "$tmp/args" && pass "runs the reviewer agent" || fail "runs the reviewer agent"
for t in Bash Edit Write; do grep -qx "$t" "$tmp/args" || fail "removes $t"; done && pass "removes Bash, Edit and Write"
grep -q "specs/001-x/spec.md" "$tmp/prompt" && grep -q "specs/001-x/tasks.md" "$tmp/prompt" && pass "prompt names the spec and tasks" || fail "prompt names the spec and tasks"
grep -q "+echo hello" "$tmp/prompt" && pass "prompt has the diff" || fail "prompt has the diff"
grep -q "Add hello" "$tmp/prompt" && pass "prompt has the commits" || fail "prompt has the commits"
grep -q "hello.sh" "$tmp/prompt" && grep -q "Add hello" "$tmp/prompt" && grep -q "1 file changed" "$tmp/prompt" && pass "each commit lists its files" || fail "each commit lists its files"
grep -q "ALL CHECKS PASSED" "$tmp/prompt" && grep -q "Exit code: 0" "$tmp/prompt" && pass "prompt has the check output" || fail "prompt has the check output"
grep -q "^Verdict: APPROVE" specs/001-x/review.md && pass "writes review.md" || fail "writes review.md"
rm -f specs/001-x/review.md

FAKE_LAST="Verdict: CHANGES NEEDED"; export FAKE_LAST
[[ "$(run specs/001-x)" == 1 ]] && pass "CHANGES NEEDED: exit 1" || fail "CHANGES NEEDED: exit 1"; rm -f specs/001-x/review.md
FAKE_LAST="Looks fine to me."
[[ "$(run specs/001-x)" == 2 ]] && pass "no verdict line: could not review (2)" || fail "no verdict line"; rm -f specs/001-x/review.md
FAKE_LAST="Verdict: APPROVE\nVerdict: CHANGES NEEDED"
[[ "$(run specs/001-x)" == 1 ]] && pass "only the last line counts" || fail "only the last line counts"; rm -f specs/001-x/review.md
unset FAKE_LAST

printf '#!/usr/bin/env bash\necho "2 tests FAILED"; exit 1\n' >scripts/check.sh && git commit -qam "failing check"
run specs/001-x >/dev/null
grep -q "Exit code: 1" "$tmp/prompt" && grep -q "2 tests FAILED" "$tmp/prompt" && pass "a failing check is shown to the reviewer" || fail "failing check shown"
rm -f specs/001-x/review.md
run --check "no-such-command" specs/001-x >/dev/null
grep -q "No checks ran" "$tmp/prompt" && pass "a missing check is a finding, not a pass" || fail "missing check"
rm -f specs/001-x/review.md

# Refusals: claude must not be called at all.
rm -f "$tmp/prompt"
echo dirty >>hello.sh
[[ "$(run specs/001-x)" == 2 && ! -e "$tmp/prompt" ]] && pass "uncommitted changes: refused" || fail "uncommitted changes"
git checkout -q -- hello.sh
[[ "$(run specs/nope)" == 2 ]] && pass "no spec: refused" || fail "no spec"
git switch -q main
[[ "$(run specs/001-x)" == 2 ]] && pass "no commits since base: refused" || fail "no commits since base"
git switch -q feature
[[ "$(run --base nowhere specs/001-x)" == 2 ]] && pass "unknown base: refused" || fail "unknown base"
mv .claude/agents/reviewer.md "$tmp/r.md"
[[ "$(run specs/001-x)" == 2 && ! -e "$tmp/prompt" ]] && pass "no reviewer agent file: refused" || fail "no reviewer file"
mv "$tmp/r.md" .claude/agents/reviewer.md

# Rounds and the reviewed commit (review.md is committed, as a human would).
export FAKE_LAST="Verdict: CHANGES NEEDED"
run specs/001-x >/dev/null
head_sha="$(git rev-parse HEAD)"
grep -qx "Reviewed-commit: $head_sha" specs/001-x/review.md && pass "records the full reviewed commit" || fail "records the reviewed commit"
grep -qx "Round: 1" specs/001-x/review.md && pass "first review is round 1" || fail "round 1"
git add -A && git commit -qm "review 1"
run specs/001-x >/dev/null; grep -qx "Round: 2" specs/001-x/review.md && pass "after CHANGES NEEDED: round 2" || fail "round 2"
git add -A && git commit -qm "review 2"
run specs/001-x >/dev/null; git add -A && git commit -qm "review 3"
rm -f "$tmp/prompt"
[[ "$(run specs/001-x)" == 2 && ! -e "$tmp/prompt" ]] && grep -q "A human decides" "$tmp/out" && pass "after 3 rounds of CHANGES NEEDED: stops, a human decides" || fail "round limit" "$(cat "$tmp/out")"
run --another-round specs/001-x >/dev/null; grep -qx "Round: 4" specs/001-x/review.md && pass "--another-round: a human allows round 4" || fail "another round"
git add -A && git commit -qm "review 4"
export FAKE_LAST="Verdict: APPROVE"
run --another-round specs/001-x >/dev/null; git add -A && git commit -qm "approved"
run specs/001-x >/dev/null; grep -qx "Round: 1" specs/001-x/review.md && pass "after APPROVE: back to round 1" || fail "reset after approve"
unset FAKE_LAST

# Full feature files and the Red proof, in a fresh repo.
q="$tmp/proj2"
git init -q -b main "$q" && cd "$q" || exit 1
git config user.email t@example.com && git config user.name t
mkdir -p specs/002-y/contracts .claude/agents
echo "SPEC-TEXT-123" >specs/002-y/spec.md; echo "CONTRACT-TEXT-456" >specs/002-y/contracts/cli.md
printf 'OLD-REVIEW-789\nVerdict: APPROVE\n' >specs/002-y/review.md; echo reviewer >.claude/agents/reviewer.md
echo "RULES-TEXT-321" >AGENTS.md
git add -A && git commit -q -m base && git switch -q -c feature
echo "test" >the.test && git add -A && git commit -q -m "Red: add the test"
red1="$(git rev-parse --short HEAD)"
echo "code" >code.sh && git add -A && git commit -q -m "Green: add the code"
echo "more" >>the.test && git add -A && git commit -q -m "Red: a test that passes at once"
red2="$(git rev-parse --short HEAD)"
"$script" --check "test -f code.sh" specs/002-y >/dev/null 2>&1
grep -q "SPEC-TEXT-123" "$tmp/prompt" && grep -q "CONTRACT-TEXT-456" "$tmp/prompt" && pass "every feature file is in the prompt, in full" || fail "feature files in full"
grep -q "RULES-TEXT-321" "$tmp/prompt" && pass "the project rules are in the prompt, in full" || fail "project rules in full"
! grep -q "OLD-REVIEW-789" "$tmp/prompt" && pass "the old review is left out" || fail "old review left out"
grep -q "$red1 Red: add the test: checks FAIL (exit 1)" "$tmp/prompt" && pass "a real Red step is proven (checks fail there)" || fail "real Red proven"
grep -q "$red2 Red: a test that passes at once: checks PASS (exit 0)\. This Red step is NOT proven" "$tmp/prompt" && pass "a Red step that passes is reported as not proven" || fail "fake Red reported"
[[ -z "$(git worktree list | sed 1d)" ]] && pass "no worktrees left behind" || fail "worktrees left behind"
git switch -q -c no-reds main && echo x >x.sh && git add -A && git commit -q -m "Add x"
"$script" --check "true" specs/002-y >/dev/null 2>&1
grep -q "no Red step can be proven" "$tmp/prompt" && pass "no Red: commits: said plainly" || fail "no reds"

# The project prepares each checkout (scripts/review-setup.sh), e.g. node_modules.
git add -A && git commit -q -m "wip" && git switch -q feature
mkdir -p scripts && printf '#!/usr/bin/env bash\necho "SETUP-OK from $REVIEW_ROOT" > setup.txt\n' >scripts/review-setup.sh
chmod +x scripts/review-setup.sh && git add -A && git commit -q -m "review setup"
"$script" --check "cat setup.txt; test -f code.sh" specs/002-y >/dev/null 2>&1
grep -q "SETUP-OK from $(cd "$q" && pwd -P)" "$tmp/prompt" && pass "review-setup.sh runs in each checkout, with REVIEW_ROOT" || fail "review-setup runs"
git add -A && git commit -q -m "review" && printf '#!/usr/bin/env bash\nexit 1\n' >scripts/review-setup.sh && git add -A && git commit -q -m "broken setup"
"$script" --check "test -f code.sh" specs/002-y >/dev/null 2>&1
grep -q "could not prepare the checkout (scripts/review-setup.sh failed). NOT proven" "$tmp/prompt" && pass "a failing setup is reported as not proven" || fail "failing setup"
[[ -z "$(git worktree list | sed 1d)" ]] && pass "no worktrees left after a failing setup" || fail "worktrees left after failing setup"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
