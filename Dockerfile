FROM just-containers/s6-overlay:latest

COPY docker/rootfs/ /
COPY build/hbbs build/hbbr build/luoda-utils /usr/bin/
COPY build/luoda-api /usr/bin/

LABEL org.opencontainers.image.source="https://github.com/luoda2023/LUODA-SERVER-API"
LABEL org.opencontainers.image.description="LUODA Self-Hosted Remote Desktop Server and API"
LABEL maintainer="LUODA"

ENV RELAY=rev.dicad.cn
ENV ENCRYPTED_ONLY=0

EXPOSE 21114 21115 21116 21116/udp 21117 21118 21119

HEALTHCHECK --interval=10s --timeout=5s CMD /usr/bin/healthcheck.sh

WORKDIR /data
VOLUME /data

ENTRYPOINT ["/init"]