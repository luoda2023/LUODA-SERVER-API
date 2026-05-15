Source: luoda-api-server
Section: net
Priority: optional
Maintainer: LUODA Team <luoda@luoda-api.com>
Build-Depends: debhelper (>= 10), pkg-config
Standards-Version: 4.5.0
Homepage: https://github.com/luoda2023/luoda-api/

Package: luoda-api-server
Architecture: {{ ARCH }}
Depends: systemd ${misc:Depends}
Description: LUODA api server
 LUODA api server, it is free and open source.
