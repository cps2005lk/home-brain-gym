#!/usr/bin/env bash
# Tests for no-secrets-staged.sh: each case stages one file in a tiny repo.
#
# Fake secrets are BUILT here from pieces, so this file never contains a full
# secret pattern (GitHub's secret scanning and our own check would flag it).
set -uo pipefail

check="$(cd "$(dirname "$0")" && pwd)/no-secrets-staged.sh"
fails=0
letters() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }
upper() { LC_ALL=C tr -dc 'A-Z0-9' </dev/urandom | head -c "$1"; }

run_case() { # name, wanted exit code, file name, file content, [secret that must not be printed]
  local dir; dir="$(mktemp -d)"
  git -C "$dir" init -q -b work
  mkdir -p "$dir/$(dirname "$3")"
  printf '%s\n' "$4" >"$dir/$3"
  git -C "$dir" add -A
  local out; out="$(cd "$dir" && "$check" 2>&1)"; local got=$?
  if [[ "$got" == "$2" ]]; then echo "PASS  $1"; else echo "FAIL  $1 (want $2, got $got)"; fails=$((fails + 1)); fi
  # The check must never print the secret value itself.
  if [[ -n "${5:-}" && "$out" == *"$5"* ]]; then echo "FAIL  $1 printed the secret"; fails=$((fails + 1)); fi
  rm -rf "$dir"
}

# Should allow
run_case "plain code"                     0 src/app.ts 'const total = 1 + 2;'
run_case ".env.example template"          0 .env.example 'VITE_SUPABASE_URL='
run_case "placeholder token (M0 lesson)"  0 docs/setup.md "SUPABASE_ACCESS_TOKEN=sbp""_xxxxxxxxxxxxxxxxxxxx"
run_case "publishable key (not secret)"   0 .env.example "KEY=sb_publishable_$(letters 30)"
run_case "short look-alike"               0 notes.md "sk-ant-short"

# Should block: files
run_case ".env file"                      1 .env 'A=1'
run_case ".env.local file"                1 .env.local 'A=1'
run_case "private key file"               1 keys/server.pem 'x'

# Should block: values (the last argument must never appear in the output)
v="sk-ant-""$(letters 40)";        run_case "Anthropic key"     1 src/a.ts "k='$v'" "$v"
v="gh""p_$(letters 36)";           run_case "GitHub token"      1 src/b.ts "t='$v'" "$v"
v="sb_""secret_$(letters 30)";     run_case "Supabase secret"   1 src/c.ts "s='$v'" "$v"
v="sbp""_$(letters 40)";           run_case "Supabase token"    1 notes.md "$v" "$v"
v="GOC""SPX-$(letters 28)";        run_case "Google secret"     1 cfg.json "{\"s\":\"$v\"}" "$v"
v="AK""IA$(upper 16)";             run_case "AWS key"           1 cfg.ini "id=$v" "$v"
run_case "private key block"  1 key.txt "-----BEGIN RSA PRIVATE ""KEY-----"

# Removing a secret is allowed: only added lines count.
dir="$(mktemp -d)"; git -C "$dir" init -q -b work
secret="sbp""_$(letters 40)"; printf '%s\n' "$secret" >"$dir/old.md"
git -C "$dir" add -A; git -C "$dir" -c user.name=t -c user.email=t@example.com commit -q --no-verify -m old
: >"$dir/old.md"; git -C "$dir" add -A
(cd "$dir" && "$check" >/dev/null 2>&1); got=$?
[[ $got == 0 ]] && echo "PASS  removing a secret" || { echo "FAIL  removing a secret (want 0, got $got)"; fails=$((fails + 1)); }
rm -rf "$dir"

# Could not check
dir="$(mktemp -d)"; (cd "$dir" && "$check" >/dev/null 2>&1); got=$?
[[ $got == 2 ]] && echo "PASS  not a git repository" || { echo "FAIL  not a git repository (want 2, got $got)"; fails=$((fails + 1)); }
rm -rf "$dir"

echo
[[ $fails == 0 ]] && echo "All tests passed." || { echo "$fails test(s) failed."; exit 1; }
