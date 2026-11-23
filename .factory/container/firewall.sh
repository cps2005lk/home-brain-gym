#!/usr/bin/env bash
# Closes the network except for the hosts in /etc/factory/allowed-hosts.txt,
# then proves it: an allowed host must work, an unknown one must not. If the
# proof fails, the box doesn't start (could not check is not OK).
set -euo pipefail

iptables -F OUTPUT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
# GitHub publishes its address ranges; fetch them while the network is still
# open. A single looked-up address can change during a long run.
ipset create factory-nets hash:net -exist
ipset flush factory-nets
curl -fsS -m 20 https://api.github.com/meta | jq -r '(.web + .api + .git)[] | select(test(":") | not)' \
  | while read -r net; do ipset add factory-nets "$net" -exist; done
[[ $(ipset list factory-nets | grep -cE '^[0-9]') -gt 0 ]] || { echo "firewall: could not get GitHub's address ranges. Stopping." >&2; exit 1; }
ipset create factory-allowed hash:ip -exist
ipset flush factory-allowed
while read -r host; do
  [[ -z "$host" || "$host" == \#* ]] && continue
  for ip in $(dig +short A "$host" | grep -E '^[0-9.]+$'); do ipset add factory-allowed "$ip" -exist; done
done < /etc/factory/allowed-hosts.txt
iptables -A OUTPUT -p tcp --dport 443 -m set --match-set factory-allowed dst -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -m set --match-set factory-nets dst -j ACCEPT
iptables -P OUTPUT DROP
ip6tables -P OUTPUT DROP 2>/dev/null || true

if curl -sS -m 5 -o /dev/null https://example.com 2>/dev/null; then
  echo "firewall: example.com is reachable, so the firewall does not work. Stopping." >&2; exit 1
fi
if ! curl -sS -m 10 -o /dev/null https://api.github.com; then
  echo "firewall: api.github.com is not reachable, so the box can't do its job. Stopping." >&2; exit 1
fi
# Look the allowed names up again every minute, so a changed address still
# works. Only names on the list are ever added.
(while sleep 60; do
  while read -r host; do
    [[ -z "$host" || "$host" == \#* ]] && continue
    for ip in $(dig +short A "$host" | grep -E '^[0-9.]+$'); do ipset add factory-allowed "$ip" -exist; done
  done < /etc/factory/allowed-hosts.txt
done) >/dev/null 2>&1 &
echo "firewall: closed, except $(ipset list factory-allowed | grep -cE '^[0-9]') addresses for the allowed hosts and $(ipset list factory-nets | grep -cE '^[0-9]') GitHub ranges."
