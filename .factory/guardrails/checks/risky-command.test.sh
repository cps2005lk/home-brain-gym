#!/usr/bin/env bash
# Tests for risky-command.sh: should-allow, should-block and should-ask cases.
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/risky-command.sh"
fails=0
run_case() { # name, wanted exit code, command
  "$check" "$3" >/dev/null 2>&1; local got=$?
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
}

# Should allow (0)
run_case "plain commit"                       0 'git commit -m "Fix the timer"'
run_case "commit --amend (not -n)"            0 'git commit --amend --no-edit'
run_case "push a branch"                      0 'git push -u origin fix-timer'
run_case "branch named main-docs"             0 'git push origin main-docs'
run_case "git log mentions main"              0 'git log --oneline origin/main'
run_case "message mentions --no-verify"       0 'git commit -m "Hooks: --no-verify skips them"'
run_case "single quotes mention it"           0 "git commit -m 'never use --no-verify or core.hooksPath'"
run_case "heredoc body mentions it"           0 $'gh pr create --body "$(cat <<\'EOF\'\nDo not use --no-verify.\ngh pr merge is for humans.\nEOF\n)"'
run_case "gh pr create"                       0 'gh pr create --title "x" --body "y"'
run_case "gh pr create -f (means --fill)"     0 'gh pr create -f'
run_case "bare heredoc mentions it"           0 $'git commit -F - <<EOF\ngh pr merge is for humans\ngit push --no-verify is not allowed\nEOF'
run_case "gh pr view"                         0 'gh pr view 2 --json mergeStateStatus'
run_case "gh api read"                        0 'gh api repos/o/r/branches/main/protection'
run_case "gh api explicit GET"                0 'gh api -X GET repos/o/r'
run_case "grep for the flag in files"         0 'grep -rn -- "--no-verify" docs'
run_case "npm test"                           0 'npm test'

# Should block (1)
run_case "push --no-verify"                   1 'git push --no-verify'
run_case "commit --no-verify"                 1 'git commit --no-verify -m "x"'
run_case "commit -n"                          1 'git commit -n -m "x"'
run_case "commit -anm cluster"                1 'git commit -anm "x"'
run_case "after cd &&"                        1 'cd repo && git commit -n -m "x"'
run_case "git -C dir commit -n"               1 'git -C ../app commit -n -m "x"'
run_case "core.hooksPath via -c"              1 'git -c core.hooksPath=/dev/null commit -m "x"'
run_case "core.hooksPath via config"          1 'git config core.hooksPath .nowhere'
run_case "push to main"                       1 'git push origin main'
run_case "push HEAD:main"                     1 'git push origin HEAD:main'
run_case "push to master"                     1 'git push origin master'
run_case "delete main on remote"              1 'git push origin :main'
run_case "full path to git"                   1 '/usr/bin/git push origin main'
run_case "env var before git"                 1 'GIT_TRACE=1 git push --no-verify'
run_case "gh pr merge"                        1 'gh pr merge 2 --rebase'
run_case "inside \$( )"                       1 'echo $(git push origin main)'

# Should ask a human (3)
run_case "force-push a branch"                3 'git push --force origin fix'
run_case "force-push -f"                      3 'git push -f origin fix'
run_case "force-with-lease"                   3 'git push --force-with-lease origin fix'
run_case "force via +refspec"                 3 'git push origin +fix'
run_case "gh api PUT"                         3 'gh api -X PUT repos/o/r/branches/main/protection --input p.json'
run_case "gh api --method=PATCH"              3 'gh api --method=PATCH repos/o/r'
run_case "gh api with a field (POST)"         3 'gh api repos/o/r/rulesets -f name=x'
run_case "gh repo edit"                       3 'gh repo edit --visibility private'
run_case "gh secret set"                      3 'gh secret set TOKEN'

# Block wins over ask
run_case "force-push to main"                 1 'git push --force origin main'

# Could not check (2)
run_case "no command"                         2 ''

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
