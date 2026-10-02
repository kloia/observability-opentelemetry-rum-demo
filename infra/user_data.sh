#!/bin/bash
set -e
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# AL2023's dnf-packaged docker ships buildx 0.12, too old for `docker compose build`
# (needs 0.17+). Replace it with a current release.
curl -sSL "https://github.com/docker/buildx/releases/download/v0.37.2/buildx-v0.37.2.linux-amd64" \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx
chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
