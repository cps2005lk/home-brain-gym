#!/usr/bin/env bash
# Claude Code adapter: when a session ends, write one usage file for it in
# the project: docs/usage/<date>-<session>.yml. One file per session, so
# two branches never edit the same file (no merge conflicts).
#
# A script fills what the session file can prove: time, model, tokens.
# A human fills `task` and `corrections` later; only they know.
# Resuming a session and ending it again rewrites the same file.
#
# Input: SessionEnd JSON on stdin (session_id, transcript_path, ...).
# Source: https://code.claude.com/docs/en/hooks (checked 2026-11-21).
# SessionEnd can't block anything, so every problem is only reported.

set -uo pipefail

warn() { echo "factory usage log: $1" >&2; exit 0; }
command -v jq >/dev/null || warn "jq not found, so no usage file was written."

input="$(cat)"
session="$(jq -r '.session_id // empty' <<<"$input" 2>/dev/null)"
transcript="$(jq -r '.transcript_path // empty' <<<"$input" 2>/dev/null)"
[[ -n "$session" ]] || warn "no session_id in the hook input, so no usage file was written."

root="${CLAUDE_PROJECT_DIR:-$(jq -r '.cwd // empty' <<<"$input")}"
root="$(git -C "$root" rev-parse --show-toplevel 2>/dev/null)" || warn "not in a git repo, so no usage file was written."
[[ -f "$transcript" ]] || warn "transcript not found ($transcript), so no usage file was written."

# Everything below comes from the transcript. Each reply appears several
# times (once per content block), so replies are counted once by their id.
stats="$(jq -s '
  def t: sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601;
  ([.[] | .timestamp | strings] | sort) as $ts
  | ([.[] | select(.message.role == "assistant" and .message.usage)
      | {id: .message.id, m: .message.model, u: .message.usage}] | unique_by(.id)) as $r
  | ($ts | map(t)) as $s
  | {
      started:     ($ts[0] // "" | sub("\\.[0-9]+Z$"; "Z")),
      wall_min:    (if ($s | length) > 0 then ((($s[-1] - $s[0]) / 60) | floor) else 0 end),
      active_min:  ([range(1; $s | length) | $s[.] - $s[. - 1] | select(. < 300)] | add // 0 | ./60 | floor),
      model:       ([$r[] | .m | select(. != null and . != "<synthetic>")] | group_by(.) | max_by(length) // [""] | .[0]),
      replies:     ($r | length),
      input:       ($r | map(.u.input_tokens // 0) | add // 0),
      cache_write: ($r | map(.u.cache_creation_input_tokens // 0) | add // 0),
      cache_read:  ($r | map(.u.cache_read_input_tokens // 0) | add // 0),
      output:      ($r | map(.u.output_tokens // 0) | add // 0)
    }' "$transcript" 2>/dev/null)" || warn "could not read the transcript, so no usage file was written."

get() { jq -r ".$1" <<<"$stats"; }
started="$(get started)"
day="${started:0:10}"; [[ -n "$day" ]] || day="$(date -u +%F)"
file="$root/docs/usage/$day-${session:0:8}.yml"

# Keep what a human already wrote, if the session is resumed.
old() { [[ -f "$file" ]] && sed -n "s/^$1: *//p" "$file" | head -1; }
task="$(old task)"; corrections="$(old corrections)"

mkdir -p "$root/docs/usage"
cat >"$file" <<YML
# Usage of one agent session. Filled by the factory's SessionEnd hook;
# a human fills task (in "quotes") and corrections (a number).
session: $session
project: $(basename "$root")
branch: $(git -C "$root" branch --show-current)
started: $started
model: $(get model)
wall_minutes: $(get wall_min)
active_minutes: $(get active_min)
replies: $(get replies)
tokens_input: $(get input)
tokens_cache_write: $(get cache_write)
tokens_cache_read: $(get cache_read)
tokens_output: $(get output)
task:${task:+ $task}
corrections:${corrections:+ $corrections}
YML
