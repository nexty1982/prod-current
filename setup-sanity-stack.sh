#!/bin/bash
# Setup Docker Compose Sanity Stack
# Run as root to create in /opt/compose_sanity, or run as user to create in ~/compose_sanity

set -e

# Determine directory based on user
if [ "$EUID" -eq 0 ]; then
    SANITY_DIR="/opt/compose_sanity"
else
    SANITY_DIR="$HOME/compose_sanity"
fi

mkdir -p "$SANITY_DIR"
cd "$SANITY_DIR"

cat > docker-compose.yml << 'EOF'
services:
  whoami:
    image: traefik/whoami:latest
    container_name: compose-sanity-whoami
    restart: unless-stopped
    ports:
      - "127.0.0.1:18080:80"

  nginx:
    image: nginx:alpine
    container_name: compose-sanity-nginx
    restart: unless-stopped
    ports:
      - "127.0.0.1:18081:80"
EOF

echo "Created docker-compose.yml in $SANITY_DIR"
echo "To start: cd $SANITY_DIR && docker compose up -d"
echo "To test: curl http://127.0.0.1:18080/ && curl -I http://127.0.0.1:18081/"
echo "To stop: cd $SANITY_DIR && docker compose down"
