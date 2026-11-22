#!/usr/bin/env bash
# Decides whether an agent may run a shell command, before it runs.
#
# Why: git hooks only see git, and only after the agent decided to commit or
# push. This check sees the command itself, so an agent adapter (for example
# kit/adapters/claude/) can stop it before it runs. It knows nothing about
# any agent tool: it gets a command string and answers with an exit code.
#
# Usage: risky-command.sh "<shell command>"
# Exit:  0 = allowed
#        1 = blocked (never for an agent: skipping hooks, pushing to main, merging)
#        2 = could not check (no command given, or perl missing): treat as blocked
#        3 = ask a human first (force-push, changing repo settings or secrets)
# The reasons go to stderr.
#
# Known gaps: text inside quotes is ignored (so commit messages may mention
# --no-verify), and so are tricks like variables ("$FLAG") or a script that
# runs git itself. This is a guard against habits and accidents. The git
# hooks and GitHub branch protection are the layers behind it.

set -uo pipefail

[[ $# -ge 1 && -n "$1" ]] || { echo "risky-command: no command given, so nothing was checked." >&2; exit 2; }
command -v perl >/dev/null || { echo "risky-command: perl not found, so nothing was checked." >&2; exit 2; }

perl -e '
  use strict; use warnings;
  my $cmd = shift;

  # 1. Remove what is only text, not command: heredoc bodies, then quoted strings.
  $cmd =~ s/<<-?\s*([\x27"]?)(\w+)\1[^\n]*\n.*?^\s*\2[ \t]*$//gms;
  $cmd =~ s/\x27[^\x27]*\x27/\x27\x27/g;
  $cmd =~ s/"(?:\\.|[^"\\])*"/""/g;

  my (@block, @ask);

  # The review record is written only by review.sh, never by an agent.
  my $rv = qr{(?:^|/)review\.md\b};
  push @block, "review.md is written only by review.sh: an agent must not change a review." if $cmd =~ />\|?\s*\S*$rv/;

  # 2. Split into simple commands: ; && || | newlines, $( ), backticks, ( ).
  for my $part (split /\|\||&&|[;|\n`()]|\$\(/, $cmd) {
    my @t = grep { length } split /\s+/, $part;
    shift @t while @t && ($t[0] =~ /^\w+=/ || $t[0] =~ /^(env|command|exec|sudo|time|nohup)$/);
    next unless @t;
    (my $prog = $t[0]) =~ s{.*/}{};

    push @block, "--no-verify skips the git hooks." if grep { /^--no-verify$/ } @t;
    if ($prog =~ /^(tee|cp|mv|rm|truncate|dd)$/ || ($prog =~ /^(sed|perl)$/ && grep { /^-i/ || /^-pi$/ } @t)) {
      push @block, "review.md is written only by review.sh: an agent must not change a review." if grep { /$rv/ } @t;
    }

    if ($prog eq "git") {
      # Find the git subcommand: skip global options and their values.
      my $i = 1;
      while ($i < @t && $t[$i] =~ /^-/) { $i += ($t[$i] =~ /^(-C|-c|--git-dir|--work-tree|--namespace)$/) ? 2 : 1 }
      my $sub = $t[$i] // "";
      my @args = @t[$i + 1 .. $#t];

      # Changing core.hooksPath switches the hooks off; reading it is fine.
      my $hp = "core.hooksPath changes which git hooks run.";
      push @block, $hp if grep { /^core\.hookspath=/i } @t[1 .. $i - 1];
      if ($sub eq "config") {
        my ($k) = grep { $args[$_] =~ /^core\.hookspath$/i } 0 .. $#args;
        if (defined $k) {
          my @pos = grep { !/^-/ } @args[$k + 1 .. $#args];
          my $writes = @pos || grep { /^--(unset|unset-all|add|replace-all|edit)$/ } @args;
          $writes ||= ($args[0] // "") =~ /^(set|unset)$/;
          push @block, $hp if $writes;
        }
      }

      if ($sub eq "commit" && grep { /^-[a-zA-Z]*n[a-zA-Z]*$/ } @args) {
        push @block, "git commit -n is short for --no-verify: it skips the git hooks.";
      }
      if ($sub eq "push") {
        my @pos = grep { !/^-/ } @args;    # the remote and the refspecs
        if (grep { m{(^|:)\+?(refs/heads/)?(main|master)$} } @pos) {
          push @block, "pushing to main or master skips the pull request. Push a branch instead.";
        }
        if (grep { /^(-f|--force|--force-with-lease.*|--force-if-includes|-[a-zA-Z]*f[a-zA-Z]*)$/ } @args
            or grep { /^\+/ } @pos) {
          push @ask, "force-push rewrites history on the remote.";
        }
      }
    }

    if ($prog eq "gh") {
      my $sub = join " ", grep { defined } @t[1, 2];
      push @block, "gh pr merge: merging is a human decision." if $sub eq "pr merge";
      if (($t[1] // "") eq "api") {
        my $s = join " ", @t;
        my $writes = $s =~ /(?:^|\s)(?:-X\s*|--method[=\s]+)(?!GET\b)\w+/i
                  || grep { /^(-f|-F|--field|--raw-field|--input)$/ || /^--(raw-)?field=/ } @t;
        push @ask, "gh api with a write (PUT, POST, PATCH, DELETE or fields) can change repo settings." if $writes;
      }
      push @ask, "gh $sub changes the repo itself." if $sub =~ /^repo (edit|delete|rename|archive|unarchive)$/;
      push @ask, "gh $sub changes secrets or variables." if $sub =~ /^(secret|variable) (set|delete|remove)$/;
    }
  }

  print STDERR "risky-command: blocked. $_\n" for @block;
  print STDERR "risky-command: needs a human yes. $_\n" for @ask;
  exit(@block ? 1 : @ask ? 3 : 0);
' "$1"
