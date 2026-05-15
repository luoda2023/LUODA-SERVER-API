# LUODA API — 1Panel 详细安装指南

> **文档版本：** v2.0.0 | **适用版本：** LUODA API ≥ 2.0.0 | **1Panel 要求：** ≥ v1.10

---

## 目录

1. [前置准备](#前置准备)
2. [方式一：Docker 容器部署（推荐）](#方式一docker-容器部署推荐)
3. [方式二：系统服务部署](#方式二系统服务部署)
4. [方式三：1Panel 应用商店部署](#方式三1panel-应用商店部署)
5. [初始化配置](#初始化配置)
6. [配置 RustDesk 客户端](#配置-rustdesk-客户端)
7. [常见问题排查](#常见问题排查)
8. [升级指南](#升级指南)

---

## 前置准备

### 1. 安装 1Panel

```bash
# 在线安装（推荐）
curl -sSL https://resource.fit2cloud.com/1panel/package/quick_start.sh -o quick_start.sh
bash quick_start.sh

# 安装完成后，牢记面板地址、账号和密码
```

安装完成后访问面板：`http://<你的服务器IP>:目标端口>`

### 2. 安装 Docker

在 1Panel 面板中：
1. 进入「容器」→「Docker」
2. 点击「安装 Docker」按钮
3. 等待安装完成

### 3. 准备 RustDesk Server

LUODA API 需要配合 RustDesk Server（ID 服务器 + Relay 服务器）使用。

如果你还没有部署 RustDesk Server，参考：
- 官方文档：https://rustdesk.com/docs/zh-cn/self-host/
- 或使用 Docker 快速部署：

```bash
docker run -d \
  --name hbbs \
  --network host \
  --restart unless-stopped \
  -v /opt/rustdesk:/root \
  rustdesk/rustdesk-server:latest hbbs

docker run -d \
  --name hbbr \
  --network host \
  --restart unless-stopped \
  -v /opt/rustdesk:/root \
  rustdesk/rustdesk-server:latest hbbr
```

获取 Key（用于客户端连接）：
```bash
cat /opt/rustdesk/id_ed25519.pub
```

---

## 方式一：Docker 容器部署（推荐）

### 步骤 1：创建数据目录

在 1Panel「主机」→「文件」中，进入 `/opt`，创建目录：

```bash
mkdir -p /opt/luoda-api/data
mkdir -p /opt/luoda-api/runtime
```

### 步骤 2：创建配置文件

在 `/opt/luoda-api/` 下创建 `config.yaml`：

```yaml
# LUODA API 配置文件
# 详细说明：https://github.com/luoda2023/luoda-api/wiki

# 语言设置
lang: "zh-CN"

# 应用配置
app:
  web-client: 1                # 启用 Web Client
  register: false              # 关闭公开注册
  register-status: 1           # 注册用户默认启用
  captcha-threshold: 3         # 登录失败 3 次后显示验证码
  ban-threshold: 0             # IP 封禁阈值（0=禁用）
  show-swagger: 0              # 不显示 Swagger 文档
  token-expire: 168h           # Token 有效期 7 天
  web-sso: true                # 启用 SSO
  disable-pwd-login: false     # 不禁用密码登录

# 管理后台配置
admin:
  title: "LUODA API Admin"
  hello-file: "./conf/admin/hello.html"
  id-server-port: 21116
  relay-server-port: 21117

# Gin 服务配置
gin:
  api-addr: "0.0.0.0:21114"
  mode: "release"
  resources-path: "resources"

# 数据库配置（默认 SQLite，无需额外配置）
gorm:
  type: "sqlite"
  max-idle-conns: 10
  max-open-conns: 100

# LUODA/RustDesk 配置（重点！）
luoda:
  id-server: "你的服务器IP:21116"      # ← 修改为你的 ID 服务器地址
  relay-server: "你的服务器IP:21117"    # ← 修改为你的 Relay 服务器地址
  api-server: "http://你的服务器IP:21114"
  key: "你的RustDesk Key"              # ← 修改为你的 Key
  key-file: "/data/id_ed25519.pub"     # Docker 环境用这个路径
  personal: 1

# 日志配置
logger:
  path: "./runtime/log.txt"
  level: "info"
```

> ⚠️ **必须修改**：将 `你的服务器IP` 和 `你的RustDesk Key` 替换为实际值！

### 步骤 3：创建 Docker Compose 编排

在 1Panel 中：「应用商店」→「创建编排」，粘贴以下内容（或直接写到 `/opt/luoda-api/docker-compose.yaml`）：

```yaml
version: '3.8'

services:
  luoda-api:
    image: luoda2023/luoda-api:latest
    container_name: luoda-api
    restart: unless-stopped
    # 使用 host 网络模式（推荐），或自定义端口映射
    network_mode: host
    # 如果不能用 host 模式，改用 ports 映射：
    # ports:
    #   - "21114:21114"
    environment:
      - TZ=Asia/Shanghai
    volumes:
      # 配置文件
      - /opt/luoda-api/config.yaml:/app/conf/config.yaml:ro
      # 数据持久化（SQLite 数据库）
      - /opt/luoda-api/data:/app/data
      # 日志目录
      - /opt/luoda-api/runtime:/app/runtime
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:21114/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 步骤 4：启动容器

在 1Panel「容器」→「编排」中：
1. 找到刚创建的编排
2. 点击「启动」
3. 等待容器状态变为「运行中」

或通过 SSH 执行：
```bash
cd /opt/luoda-api
docker-compose up -d
docker-compose logs -f  # 查看启动日志
```

### 步骤 5：获取初始管理员密码

```bash
docker logs luoda-api 2>&1 | grep -i "admin"
# 输出示例：
# Admin username: admin, password: Abc12345
```

> 🔒 **安全提示**：首次登录后请立即修改管理员密码！

### 步骤 6：访问管理后台

浏览器访问：`http://<你的服务器IP>:21114/_admin/`

- 用户名：`admin`
- 密码：（上一步获取的初始密码）

---

## 方式二：系统服务部署

适用于希望在宿主机直接运行（不使用 Docker）的场景。

### 步骤 1：下载二进制文件

在 1Panel「终端」中执行：

```bash
# 创建目录
mkdir -p /opt/luoda-api
cd /opt/luoda-api

# 下载最新版本（以 Linux amd64 为例，其他平台请到 Releases 页查看）
LUODA_VERSION=$(curl -s https://api.github.com/repos/luoda2023/luoda-api/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
wget "https://github.com/luoda2023/luoda-api/releases/download/${LUODA_VERSION}/linux-amd64.tar.gz"
tar -xzf linux-amd64.tar.gz
mv release/* ./
rm -rf release linux-amd64.tar.gz
```

### 步骤 2：创建配置文件

同上方式一的步骤 2，在 `/opt/luoda-api/conf/config.yaml` 创建配置。

### 步骤 3：创建 systemd 服务

在 1Panel「终端」中执行：

```bash
cat > /etc/systemd/system/luoda-api.service << 'EOF'
[Unit]
Description=LUODA API Server
Documentation=https://github.com/luoda2023/luoda-api
After=network.target

[Service]
Type=simple
User=root
Group=root
LimitNOFILE=1000000
ExecStart=/opt/luoda-api/apimain
WorkingDirectory=/opt/luoda-api
Restart=always
RestartSec=10
StandardOutput=append:/var/log/luoda-api/api.log
StandardError=append:/var/log/luoda-api/error.log

# 安全加固
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/luoda-api /var/log/luoda-api

[Install]
WantedBy=multi-user.target
EOF

# 创建日志目录
mkdir -p /var/log/luoda-api

# 重载并启动
systemctl daemon-reload
systemctl enable luoda-api
systemctl start luoda-api
systemctl status luoda-api
```

---

## 方式三：1Panel 应用商店部署

如果 1Panel 应用商店中有 LUODA API（或 RustDesk API），可直接一键部署：

1. 进入 1Panel「应用商店」
2. 搜索 `luoda` 或 `rustdesk`
3. 找到对应应用，点击「安装」
4. 填写参数（端口、数据目录等）
5. 点击「确认」，等待部署完成

> 📝 如果应用商店中没有，可使用方式一（Docker Compose 编排）。

---

## 初始化配置

### 1. 修改管理员密码

登录后台后：
1. 点击右上角用户名 → 「个人设置」
2. 输入新密码，保存

或通过 CLI 修改：
```bash
cd /opt/luoda-api
./apimain reset-admin-pwd <新密码>
```

### 2. 配置 OAuth 登录（可选）

支持 GitHub / Google / OIDC 登录：

1. 以管理员身份登录后台
2. 进入「系统设置」→「OAuth 管理」
3. 点击「添加 OAuth」
4. 填写对应平台的 Client ID 和 Secret

#### GitHub OAuth 配置示例：

1. 访问：https://github.com/settings/developers
2. 点击「New OAuth App」
3. 填写：
   - **Application name**：`LUODA API`
   - **Homepage URL**：`http://你的服务器IP:21114`
   - **Authorization callback URL**：`http://你的服务器IP:21114/api/oauth/callback`
4. 创建后获取 Client ID 和 Client Secret
5. 填入 LUODA API 后台

### 3. 配置 LDAP / AD 登录（可选）

编辑 `conf/config.yaml`：

```yaml
ldap:
  enable: true
  url: "ldap://ldap.example.com:389"
  tls-ca-file: ""
  tls-verify: false
  base-dn: "dc=example,dc=com"
  bind-dn: "cn=admin,dc=example,dc=com"
  bind-password: "password"
  user:
    base-dn: "ou=users,dc=example,dc=com"
    enable-attr: "userAccountControl"   # AD 环境
    enable-attr-value: "512"
    filter: "(objectClass=user)"
    username: "sAMAccountName"          # AD 用这个
    email: "mail"
    first-name: "givenName"
    last-name: "sn"
    sync: true
    admin-group: "cn=admins,dc=example,dc=com"
```

重启服务后生效。

---

## 配置 RustDesk 客户端

部署完成后，需要配置 RustDesk 客户端连接到你的服务器：

### Windows / macOS / Linux 桌面端

1. 打开 RustDesk 客户端
2. 点击「设置」→「网络」
3. 填写：
   - **ID 服务器**：`你的服务器IP`（或域名）
   - **中继服务器**：`你的服务器IP`（或域名）
   - **API 服务器**：`http://你的服务器IP:21114`
   - **Key**：`（你的 RustDesk Key）`
4. 点击「应用」

### 移动端（Android / iOS）

1. 打开 RustDesk App
2. 点击右上角「⋮」→「设置」
3. 进入「网络设置」
4. 填写同上

---

## 常见问题排查

### 1. 容器无法启动

```bash
# 查看日志
docker logs luoda-api

# 常见问题：
# - 端口被占用：lsof -i :21114
# - 配置文件格式错误：检查 config.yaml 缩进
# - Key 格式错误：确保是 256-bit 的 base64 字符串
```

### 2. 无法获取地址簿 / 设备列表

检查 `luoda.id-server` 和 `luoda.key` 配置是否正确，且 RustDesk Server（hbbs）正在运行。

### 3. Web Client 无法连接

```bash
# 检查防火墙是否放行端口
ufw status
ufw allow 21114/tcp
ufw allow 21116/tcp
ufw allow 21116/udp
ufw allow 21117/tcp
```

### 4. 忘记管理员密码

```bash
cd /opt/luoda-api
./apimain reset-admin-pwd <新密码>
```

### 5. 数据库连接错误

如果使用 MySQL，确认：
- MySQL 服务正常运行
- 数据库 `luoda` 已创建
- 用户权限正确
- `gorm.type` 设置为 `mysql`

---

## 升级指南

### Docker 方式升级

```bash
cd /opt/luoda-api
docker-compose pull          # 拉取最新镜像
docker-compose down          # 停止并删除旧容器
docker-compose up -d         # 启动新容器
docker image prune -f        # 清理旧镜像
```

### 二进制方式升级

```bash
cd /opt/luoda-api
# 备份
cp -r conf/ conf.bak/
cp -r data/ data.bak/

# 下载新版本
LUODA_VERSION=$(curl -s https://api.github.com/repos/luoda2023/luoda-api/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
wget "https://github.com/luoda2023/luoda-api/releases/download/${LUODA_VERSION}/linux-amd64.tar.gz"
tar -xzf linux-amd64.tar.gz

# 停止服务
systemctl stop luoda-api

# 替换二进制
cp release/apimain .

# 重启
systemctl start luoda-api
systemctl status luoda-api
```

---

## 端口说明

| 端口 | 协议 | 用途 | 是否必须开放 |
|------|------|------|-------------|
| 21114 | TCP | LUODA API 服务 | ✅ 必须 |
| 21115 | TCP | RustDesk NAT 类型测试 | 推荐 |
| 21116 | TCP/UDP | RustDesk ID 服务器 | ✅ 必须 |
| 21117 | TCP | RustDesk Relay 服务器 | ✅ 必须 |
| 21118 | TCP | RustDesk WebSocket | 推荐 |
| 21119 | TCP | RustDesk WebClient | 推荐 |

---

## 相关链接

- 📖 [LUODA API Wiki](https://github.com/luoda2023/luoda-api/wiki)
- 🐛 [问题反馈](https://github.com/luoda2023/luoda-api/issues)
- 📦 [Release 下载](https://github.com/luoda2023/luoda-api/releases)
- 🎨 [管理前端源码](https://github.com/luoda2023/luoda-api-web)
- 🖥️ [RustDesk 官方文档](https://rustdesk.com/docs/)

---

*文档版本：v2.0.0 | 最后更新：2026-05-15*
