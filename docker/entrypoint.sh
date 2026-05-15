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

echo "[entrypoint] Starting services..."

# Start hbbs (ID/rendezvous server) in background
hbbs -r ${RELAY:-rev.dicad.cn} &

# Start hbbr (relay server) in background
hbbr -k _ &

# Start luoda-api (Go API server) in background
luoda-api &

# Wait for all background processes
wait
