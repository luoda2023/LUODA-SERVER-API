FROM alpine:latest

# Install required tools
RUN apk add --no-cache wget xz bash tzdata

# Install s6-overlay for process supervision
ARG S6_OVERLAY_VERSION=3.2.0.0
RUN wget -q -O /tmp/s6-noarch.tar.xz "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz" && \
    wget -q -O /tmp/s6-arch.tar.xz "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-x86_64.tar.xz" && \
    tar -C / -Jxpf /tmp/s6-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-arch.tar.xz && \
    rm -f /tmp/s6-*.tar.xz && \
    ln -sf /run /var/run

# Copy rootfs (s6 service definitions)
COPY docker/rootfs/ /

# Copy pre-built binaries
COPY build/hbbs build/hbbr build/luoda-utils /usr/bin/
COPY build/luoda-api /usr/bin/

RUN chmod +x /usr/bin/hbbs /usr/bin/hbbr /usr/bin/luoda-utils /usr/bin/luoda-api /usr/bin/healthcheck.sh

LABEL org.opencontainers.image.source="https://github.com/luoda2023/LUODA-SERVER-API"
LABEL org.opencontainers.image.description="LUODA Self-Hosted Remote Desktop Server &amp; API"
LABEL maintainer="LUODA"

ENV RELAY=rev.dicad.cn
ENV ENCRYPTED_ONLY=0

EXPOSE 21114 21115 21116 21116/udp 21117 21118 21119

HEALTHCHECK --interval=10s --timeout=5s CMD /usr/bin/healthcheck.sh

WORKDIR /data
VOLUME /data

ENTRYPOINT ["/init"]