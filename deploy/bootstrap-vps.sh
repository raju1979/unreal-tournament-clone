#!/usr/bin/env bash
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo 'Run this script as root.' >&2
  exit 1
fi

public_key="${1:-}"
if [[ "$public_key" != ssh-ed25519\ * ]]; then
  echo 'Pass the GitHub Actions Ed25519 public key as the first argument.' >&2
  exit 1
fi

getent group unreal-arena >/dev/null
test -d /opt/unreal-arena

if ! id unreal-deploy >/dev/null 2>&1; then
  useradd --create-home --home-dir /home/unreal-deploy --shell /bin/bash --gid unreal-arena unreal-deploy
else
  usermod --gid unreal-arena --shell /bin/bash unreal-deploy
fi

install -d -o unreal-deploy -g unreal-arena -m 0700 /home/unreal-deploy/.ssh
touch /home/unreal-deploy/.ssh/authorized_keys
if ! grep -Fqx -- "$public_key" /home/unreal-deploy/.ssh/authorized_keys; then
  printf '%s\n' "$public_key" >> /home/unreal-deploy/.ssh/authorized_keys
fi
chown unreal-deploy:unreal-arena /home/unreal-deploy/.ssh/authorized_keys
chmod 0600 /home/unreal-deploy/.ssh/authorized_keys

# The deploy account can update the game files and restart only this service.
chown -R unreal-arena:unreal-arena /opt/unreal-arena
chmod -R g+rwX /opt/unreal-arena
find /opt/unreal-arena -type d -exec chmod g+s {} +
printf '%s\n' 'unreal-deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart unreal-arena.service' > /etc/sudoers.d/unreal-deploy
chmod 0440 /etc/sudoers.d/unreal-deploy
visudo -cf /etc/sudoers.d/unreal-deploy

if ! command -v rsync >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y rsync
fi

echo 'GitHub Actions deploy account is ready.'
