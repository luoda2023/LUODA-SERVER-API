# LUODA API

> **LUODA Custom Edition** — Enterprise-grade remote desktop API management platform based on remote desktop protocol

<div align=center>
<img src="https://img.shields.io/badge/golang-1.22-blue"/>
<img src="https://img.shields.io/badge/gin-v1.9.0-lightBlue"/>
<img src="https://img.shields.io/badge/gorm-v1.25.7-green"/>
<img src="https://img.shields.io/badge/swag-v1.16.3-yellow"/>
<img src="https://img.shields.io/badge/LUODA-Custom%20Edition-%232b85ba"/>
<img src="https://github.com/luoda2023/luoda-api/actions/workflows/build.yml/badge.svg"/>
</div>

---

## Overview

**LUODA API** is an enterprise-grade API server implementation for the remote desktop protocol (LUODA Custom Edition). Built upon the open-source LUODA API with comprehensive rebranding, it provides:

- 🖥️ **PC Client API** — Full RESTful interface with Personal and Enterprise editions
- 🎛️ **Web Admin Panel** — Frontend-backend separated management interface
- 🌐 **Web Client** — Browser-based remote connection, no client installation needed
- 🔐 **Multiple Auth Methods** — LDAP, OAuth2 (GitHub/Google/OIDC), JWT
- 📊 **Audit Logs** — Login, connection, and file transfer logs
- 🌍 **i18n** — Built-in multi-language support

---

## Features

### API Service

Full PC client API with Personal edition support. Enable via config `luoda.personal` or env var `LUODA_API_LUODA_PERSONAL`.

### Web Admin

- Access at `http://<your-server>[:port]/_admin/`
- Default admin: `admin`, password printed in console logs
- User management with LDAP/AD integration
- Device management & grouping
- Address book with sharing support
- Tags, groups (shared & normal)
- OAuth2 (GitHub, Google, OIDC)
- Audit logs
- Web Client quick launch
- Guest sharing links

### Web Client

1. Auto-login for admin-authenticated users
2. Auto-sync ID server and KEY
3. Auto-sync address book
4. v2 Preview at `/webclient2`
5. Guest remote access via share links

### CLI

```bash
./apimain -h                          # Show help
./apimain reset-admin-pwd <password>  # Reset admin password
```

---

## Quick Deploy

### Option 1: Docker

```bash
docker run -d \
  --name luoda-api \
  --network host \
  -v /opt/luoda-api/data:/app/data \
  -e TZ=Asia/Shanghai \
  -e LUODA_API_LANG=en \
  -e LUODA_API_LUODA_ID_SERVER=192.168.1.66:21116 \
  -e LUODA_API_LUODA_RELAY_SERVER=192.168.1.66:21117 \
  -e LUODA_API_LUODA_API_SERVER=http://192.168.1.66:21114 \
  -e LUODA_API_LUODA_KEY=<your_key> \
  luoda2023/luoda-api:latest
```

### Option 2: Docker Compose

```yaml
services:
  luoda-api:
    image: luoda2023/luoda-api:latest
    container_name: luoda-api
    network_mode: host
    environment:
      - TZ=Asia/Shanghai
      - LUODA_API_LANG=en
      - LUODA_API_LUODA_ID_SERVER=192.168.1.66:21116
      - LUODA_API_LUODA_RELAY_SERVER=192.168.1.66:21117
      - LUODA_API_LUODA_API_SERVER=http://192.168.1.66:21114
      - LUODA_API_LUODA_KEY=<your_key>
    volumes:
      - /opt/luoda-api/data:/app/data
    restart: unless-stopped
```

### Option 3: Binary Release

Download from [Releases](https://github.com/luoda2023/luoda-api/releases).

### Option 4: Build from Source

```bash
git clone https://github.com/luoda2023/luoda-api.git
cd luoda-api
go mod tidy
bash build.sh  # or build.bat on Windows
cd release && ./apimain
```

---

## Environment Variables

All config items can be set via environment variables prefixed with `LUODA_API`.

| Variable | Description | Default/Example |
|----------|-------------|-----------------|
| `TZ` | Timezone | `Asia/Shanghai` |
| `LUODA_API_LANG` | Language | `en`, `zh-CN` |
| `LUODA_API_GIN_API_ADDR` | API listen address | `0.0.0.0:21114` |
| `LUODA_API_GORM_TYPE` | Database type | `sqlite`, `mysql` |
| `LUODA_API_LUODA_ID_SERVER` | ID server | `192.168.1.66:21116` |
| `LUODA_API_LUODA_RELAY_SERVER` | relay server | `192.168.1.66:21117` |
| `LUODA_API_LUODA_API_SERVER` | API server URL | `http://192.168.1.66:21114` |
| `LUODA_API_LUODA_KEY` | key | — |
| `LUODA_API_APP_REGISTER` | Enable registration | `false` |

---

## Links

- 📖 [Wiki](https://github.com/luoda2023/luoda-api/wiki)
- 🐛 [Issues](https://github.com/luoda2023/luoda-api/issues)
- 📦 [Releases](https://github.com/luoda2023/luoda-api/releases)
- 🎨 [Frontend Source](https://github.com/luoda2023/luoda-api-web)

---

## Credits

- Based on the open-source [LUODA API](https://github.com/luoda2023/LUODA-SERVER-API) project
- 

---

<div align=center>

**⭐ If LUODA API helps you, please give us a Star!**

Made with ❤️ by LUODA Team | v2.0.0

</div>