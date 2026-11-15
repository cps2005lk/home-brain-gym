#!/usr/bin/env bash
# Fails when the staged changes contain a secret-looking file or value.
#
# Why: a committed secret stays in git history and keeps working until it is
# replaced (M0). Catching it before the commit is the cheapest place.
#
# It never prints the secret itself, only the file and the kind of secret.
# Placeholders like sbp_xxxxxxxx (one repeated character) are allowed.
#
# Usage: no-secrets-staged.sh            (run inside the repository)
# Exit:  0 = nothing found, 1 = found, 2 = not a git repo

set -uo pipefail

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "no-secrets-staged: not inside a git repository" >&2
  exit 2
fi

found=0
report() { echo "no-secrets-staged: $1" >&2; found=1; }

# 1. Files that should never be committed. .env.example is a template: allowed.
while IFS= read -r file; do
  name="${file##*/}"
  case "$name" in
    .env.example | .env.sample) ;;
    .env | .env.*) report "$file: env files hold secrets; keep them git-ignored" ;;
    *.pem | *.p12 | *.pfx | id_rsa | id_ed25519) report "$file: key file" ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR)

# 2. Secret-looking values in added lines. "name|pattern"; the prefix is fixed,
#    the rest is the secret part checked for placeholders.
patterns=(
  "Anthropic API key|sk-ant-[A-Za-z0-9_-]{20,}"
  "GitHub token|gh[pousr]_[A-Za-z0-9]{30,}"
  "Supabase secret key|sb_secret_[A-Za-z0-9_-]{10,}"
  "Supabase access token|sbp_[A-Za-z0-9]{20,}"
  "Google OAuth client secret|GOCSPX-[A-Za-z0-9_-]{20,}"
  "AWS access key|AKIA[0-9A-Z]{16}"
  "private key|-----BEGIN [A-Z ]*PRIVATE KEY-----"
)

# Added lines only, each prefixed with its file name: "path<TAB>+line".
added="$(git diff --cached -U0 --no-color | awk '
  /^\+\+\+ b\// { file = substr($0, 7); next }
  /^\+/ && !/^\+\+\+/ { print file "\t" $0 }')"

for entry in "${patterns[@]}"; do
  label="${entry%%|*}" regex="${entry#*|}"
  while IFS=$'\t' read -r file line; do
    [[ -z "$file" ]] && continue
    while IFS= read -r match; do
      body="$(printf '%s' "$match" | sed -E 's/^(sk-ant-|gh[pousr]_|sb_secret_|sbp_|GOCSPX-|AKIA)//')"
      # A placeholder is one character repeated: xxxxxxxx, 00000000.
      if [[ "$label" != "private key" && -z "$(printf '%s' "$body" | tr -d "${body:0:1}")" ]]; then
        continue
      fi
      report "$file: looks like a $label"
    done < <(printf '%s\n' "$line" | grep -oE -- "$regex")
  done <<< "$added"
done

if [[ $found == 1 ]]; then
  echo "Remove it from the commit (git restore --staged <file>). If it was real, replace the secret." >&2
  exit 1
fi
