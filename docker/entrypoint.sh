#!/bin/sh
set -e

# Copy default resources if not present in /data
if [ ! -d "/data/resources" ]; then
    echo "[entrypoint] Copying default resources to /data/resources..."
    cp -r /app/resources /data/resources
fi

# Copy default config if not present
if [ ! -f "/data/conf/config.yaml" ]; then
    echo "[entrypoint] Copying default config to /data/conf/config.yaml..."
    mkdir -p /data/conf
    cp /app/conf/config.yaml /data/conf/config.yaml
fi

# Ensure runtime directory exists
mkdir -p /data/runtime

# Preserve existing keys before hbbs potentially overwrites them
if [ -f "/data/id_ed25519" ] && [ -f "/data/id_ed25519.pub" ]; then
    echo "[entrypoint] Backing up existing key pair..."
    cp -p /data/id_ed25519 /data/.id_ed25519.preserve
    cp -p /data/id_ed25519.pub /data/.id_ed25519.pub.preserve
fi

echo "[entrypoint] Starting services..."

# Start hbbs (ID/rendezvous server) in background
hbbs -r ${RELAY:-rev.dicad.cn} &

# Start hbbr (relay server) in background
hbbr -k _ &

# Start luoda-api (Go API server) in background
luoda-api &

# Wait a moment then check if hbbs overwrote the keys
sleep 3
if [ -f "/data/.id_ed25519.preserve" ]; then
    # Compare if the key was replaced (hbbs generated new ones)
    if ! cmp -s /data/.id_ed25519.preserve /data/id_ed25519 2>/dev/null; then
        echo "[entrypoint] WARNING: hbbs regenerated new keys! Restoring original key pair..."
        cp -p /data/.id_ed25519.preserve /data/id_ed25519
        cp -p /data/.id_ed25519.pub.preserve /data/id_ed25519.pub
    else
        echo "[entrypoint] Key pair preserved."
    fi
fi

# Wait for all background processes
wait
