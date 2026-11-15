#!/usr/bin/env bash
# Tests for the pre-commit and pre-push hooks, in a real repo with a remote.
# Each case answers: does git refuse (blocked) or accept (allowed)?
set -uo pipefail

hooks="$(cd "$(dirname "$0")" && pwd)"
fails=0
expect() { # name, "blocked"|"allowed", git exit code
  local got=allowed; [[ "$3" != 0 ]] && got=blocked
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
}

work="$(mktemp -d)"
git init -q --bare -b main "$work/remote.git"
git init -q -b main "$work/repo"
cd "$work/repo" || exit 1
git config user.name t; git config user.email t@example.com
git config core.hooksPath "$hooks"
git remote add origin "$work/remote.git"
mkdir scripts; printf '#!/usr/bin/env bash\nexit 0\n' >scripts/check.sh; chmod +x scripts/check.sh
git add -A; git commit -q --no-verify -m start; git push -q --no-verify origin main 2>/dev/null

# pre-commit
echo a >a.txt; git add a.txt
git commit -q -m a 2>/dev/null;              expect "commit on main" blocked $?
git commit -q --no-verify -m a 2>/dev/null;  expect "commit on main with --no-verify (the known gap)" allowed $?
git switch -q -c work
echo b >b.txt; git add b.txt
git commit -q -m b 2>/dev/null;              expect "commit on a branch" allowed $?
echo 'X=1' >.env; git add .env
git commit -q -m env 2>/dev/null;            expect "commit an .env file" blocked $?
git rm -q --cached .env; rm .env
touch CLAUDE.md; git add CLAUDE.md
git commit -q -m claude 2>/dev/null;         expect "commit a CLAUDE.md" blocked $?
git rm -q --cached CLAUDE.md; rm CLAUDE.md

# pre-push
git push -q origin work 2>/dev/null;         expect "push a branch, checks pass" allowed $?
git push -q origin work:main 2>/dev/null;    expect "push to main" blocked $?
printf '#!/usr/bin/env bash\nexit 1\n' >scripts/check.sh
git commit -q -am "failing check" 2>/dev/null
git push -q origin work 2>/dev/null;         expect "push with failing checks" blocked $?
git rm -q scripts/check.sh; git commit -q -m "no check" 2>/dev/null
git push -q origin work 2>/dev/null;         expect "push with no scripts/check.sh (could not check)" blocked $?

cd / && rm -rf "$work"
echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
