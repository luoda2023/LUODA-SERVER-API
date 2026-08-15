FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache bash tzdata ca-certificates

# Create /run symlink (some services expect /var/run)
RUN ln -sf /run /var/run

# Copy pre-built binaries
COPY build/hbbs /usr/bin/hbbs
COPY build/hbbr /usr/bin/hbbr
COPY build/luoda-utils /usr/bin/luoda-utils
COPY build/luoda-api /usr/bin/luoda-api

# Copy healthcheck
COPY docker/rootfs/usr/bin/healthcheck.sh /usr/bin/healthcheck.sh

# Copy API resources (i18n, web UI assets) and default config to /app (NOT /data)
# /data is a mounted volume that would override files; /app serves as defaults backup
COPY api/resources /app/resources
COPY api/conf /app/conf

# Entrypoint: copy defaults to /data on first run, then start services
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /usr/bin/hbbs /usr/bin/hbbr /usr/bin/luoda-utils /usr/bin/luoda-api /usr/bin/healthcheck.sh /entrypoint.sh

# Create data volume
VOLUME /data
WORKDIR /data

# Expose ports
EXPOSE 21114 21115 21116 21116/udp 21117 21118 21119

# Health check
HEALTHCHECK --interval=10s --timeout=5s CMD /usr/bin/healthcheck.sh

# Entrypoint: copy defaults then start all services
ENTRYPOINT ["/entrypoint.sh"]

LABEL org.opencontainers.image.source="https://github.com/luoda2023/LUODA-SERVER-API"
LABEL org.opencontainers.image.description="LUODA Self-Hosted Remote Desktop Server & API"
LABEL maintainer="LUODA"

ENV RELAY=dotchat.dicad.cn
ENV ENCRYPTED_ONLY=0
