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

# Copy API resources (i18n, web UI assets) and default config
COPY api/resources /data/resources
COPY api/conf /data/conf

RUN chmod +x /usr/bin/hbbs /usr/bin/hbbr /usr/bin/luoda-utils /usr/bin/luoda-api /usr/bin/healthcheck.sh
RUN mkdir -p /data/runtime

# Create data volume
VOLUME /data
WORKDIR /data

# Expose ports
EXPOSE 21114 21115 21116 21116/udp 21117 21118 21119

# Health check
HEALTHCHECK --interval=10s --timeout=5s CMD /usr/bin/healthcheck.sh

# Simple entrypoint: start all services
CMD ["/bin/sh", "-c", "hbbs -r $RELAY & hbbr -k _ & luoda-api & wait"]

LABEL org.opencontainers.image.source="https://github.com/luoda2023/LUODA-SERVER-API"
LABEL org.opencontainers.image.description="LUODA Self-Hosted Remote Desktop Server & API"
LABEL maintainer="LUODA"

ENV RELAY=rev.dicad.cn
ENV ENCRYPTED_ONLY=0