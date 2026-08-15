#!/bin/sh
set -e

# dotchat 独立端口部署支持：默认用标准端口，环境变量可覆盖
#   HBBS_PORT    ID/rendezvous 端口 (默认 21116)
#   HBBR_PORT    relay 端口        (默认 21117)
#   API_ADDR     luoda-api 监听    (默认 0.0.0.0:21114)
#   RELAY        relay 服务器地址  (默认 dotchat.dicad.cn:${HBBR_PORT})
HBBS_PORT="${HBBS_PORT:-21116}"
HBBR_PORT="${HBBR_PORT:-21117}"
API_ADDR="${API_ADDR:-0.0.0.0:21114}"
RELAY="${RELAY:-dotchat.dicad.cn:${HBBR_PORT}}"

echo "[entrypoint] dotchat: hbbs_port=${HBBS_PORT} hbbr_port=${HBBR_PORT} api_addr=${API_ADDR} relay=${RELAY}"

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

# Ensure required directories exist
mkdir -p /data/runtime
mkdir -p /data/data

# Preserve existing keys before hbbs potentially overwrites them
if [ -f "/data/id_ed25519" ] && [ -f "/data/id_ed25519.pub" ]; then
    echo "[entrypoint] Backing up existing key pair..."
    cp -p /data/id_ed25519 /data/.id_ed25519.preserve
    cp -p /data/id_ed25519.pub /data/.id_ed25519.pub.preserve
fi

# Rewrite API listen address (luoda-api reads gin.api-addr from config.yaml)
if [ -f "/data/conf/config.yaml" ]; then
    # sed: replace `api-addr: "0.0.0.0:21114"` with the desired addr.
    # Works for both quoted and unquoted values.
    sed -i "s|^\(\s*api-addr:\s*\).*|\1\"${API_ADDR}\"|" /data/conf/config.yaml
    echo "[entrypoint] api-addr set to ${API_ADDR}"
fi

echo "[entrypoint] Starting services..."

# Start hbbs (ID/rendezvous server) in background
hbbs -p ${HBBS_PORT} -r ${RELAY} &

# Start hbbr (relay server) in background
hbbr -p ${HBBR_PORT} -k _ &

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
