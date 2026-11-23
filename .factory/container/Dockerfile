# The factory's agent box: a small Linux computer with only what an agent
# needs. No Mac keychain, no home folder, no host files: the code is cloned
# inside, and the only credential is the agent's limited GitHub token.
# The full image (not -slim): it has root certificates, so packages can come
# over HTTPS. The slim one only had plain HTTP, which timed out on our network.
FROM node:26-bookworm@sha256:b7087bc4d973034b30854b378ba107f9fab622b47514cb7e2592e41b8bab8d49

# Pinned with a cooldown (about two weeks old or more): the base image by
# digest, the GitHub CLI and Claude Code by version.
# Tools inside the box only. The firewall tools need root at start; the
# agent itself runs as the unprivileged "node" user.
RUN sed -i "s|http://deb.debian.org|https://deb.debian.org|g" /etc/apt/sources.list.d/debian.sources \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      jq iptables ipset dnsutils gosu \
 && rm -rf /var/lib/apt/lists/*

# GitHub CLI: an exact release from GitHub, checked against its published
# checksums (the apt repository keeps only recent versions, so it can't pin).
ARG GH_VERSION=2.103.3
RUN arch="$(dpkg --print-architecture)" \
 && cd /tmp \
 && curl -fsSLO "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${arch}.tar.gz" \
 && curl -fsSLO "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_checksums.txt" \
 && grep " gh_${GH_VERSION}_linux_${arch}.tar.gz$" "gh_${GH_VERSION}_checksums.txt" | sha256sum -c - \
 && tar -xzf "gh_${GH_VERSION}_linux_${arch}.tar.gz" \
 && install -m 755 "gh_${GH_VERSION}_linux_${arch}/bin/gh" /usr/local/bin/gh \
 && rm -rf /tmp/gh_*

# Pinned, like everything else in the factory.
RUN npm install -g @anthropic-ai/claude-code@2.1.330

COPY allowed-hosts.txt /etc/factory/allowed-hosts.txt
COPY firewall.sh probe.sh entry.sh agent-task.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/firewall.sh /usr/local/bin/probe.sh /usr/local/bin/entry.sh /usr/local/bin/agent-task.sh \
 && mkdir -p /work /home/node/.claude && chown -R node:node /work /home/node/.claude \
 && git config --system credential.https://github.com.helper "" \
 && git config --system --add credential.https://github.com.helper "!gh auth git-credential"

WORKDIR /work
ENTRYPOINT ["/usr/local/bin/entry.sh"]
CMD ["bash"]
