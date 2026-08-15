# dotchat.dicad.cn 服务器部署指南（VPS: 47.114.75.115）

> 目标：在 VPS `47.114.75.115` 上部署独立的「点聊」服务器（dotchat.dicad.cn），
> 与现有 rev.dicad.cn 老服务**隔离运行、互不干扰**。

## 0. 前置说明

- 服务器端代码库：`J:\codex-work\dotchat.dicad.cn`（rev.dicad.cn 已全部改为 dotchat.dicad.cn）
- 服务器镜像：`ghcr.io/luoda2023/luoda-server:latest`（现成镜像，无需重新构建；
  `docker-compose.yml` 中 `hbbs -r dotchat.dicad.cn` 已直接指定新域名，覆盖镜像内默认值）
- 登录：`ssh root@47.114.75.115`（root 密码：Lkw-666999）
- ⚠️ 部署前必须先确认端口占用情况，**避免与 rev.dicad.cn 老服务冲突**（见第 1 步）

## 1. 先查服务器现状（重要！避让老服务）

```bash
ssh root@47.114.75.115

# 1) 现有容器（rev 老服务是谁、跑在哪）
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

# 2) 端口占用情况（21114-21119 是否被 rev 老服务占用）
ss -lntup | grep -E '2111[4-9]'

# 3) 现有 LUODA 部署目录
ls -la /opt/
ls -la /opt/luoda* 2>/dev/null

# 4) 老服务密钥（确认 KEY，避免误用）
find / -name 'id_ed25519.pub' 2>/dev/null | head -5
```

### 端口冲突判定

| 情况 | 结论 |
|------|------|
| rev 老服务占用 21114-21119 且**在这台 VPS 上运行** | 两个 LUODA 服务端无法同机同端口共存（客户端固定使用 21115-21119），需与用户确认：停掉老服务再部署，或 dotchat 换机器 |
| rev 老服务**不在这台 VPS**（如 106.54.219.147） | 端口空闲，可直接部署 |
| 老容器已停止、端口已释放 | 可直接部署 |

> LUODA/RustDesk 协议端口固定：21114(API) 21115(NAT) 21116(ID TCP/UDP) 21117(中继) 21118(WS) 21119(WebClient)，客户端无法自定义。

## 2. 准备部署目录与文件

```bash
mkdir -p /opt/dotchat-server
cd /opt/dotchat-server
```

将本仓库以下文件上传到 `/opt/dotchat-server/`：
- `docker-compose.yml`（已改：`hbbs -r dotchat.dicad.cn`）

上传方式（本地执行，终端恢复后）：
```bash
scp /j/codex-work/dotchat.dicad.cn/docker-compose.yml root@47.114.75.115:/opt/dotchat-server/
```

## 3. 密钥（dotchat 专用，不与 rev 共用）

> ⚠️ 不要复制 rev 老服务的密钥！dotchat 客户端必须使用自己的密钥，
> 否则两台服务器的 KEY 会串（客户端无法区分服务器）。

```bash
cd /opt/dotchat-server
mkdir -p data
# 生成 dotchat 专属密钥对（或本地生成后上传）
docker run --rm -v $(pwd)/data:/data -w /data \
  ghcr.io/luoda2023/luoda-server:latest hbbs -r dotchat.dicad.cn --generate-key 2>/dev/null || true
# 若上面方式不生效，用 openssl 生成：
#   openssl genpkey ...  # 或直接首次启动让 hbbs 自动生成，然后立即备份
cat data/id_ed25519.pub   # 记下公钥，给客户端配置用
```

## 4. 配置 API（/data/conf/config.yaml）

首次启动会自动复制默认配置到 `/data/conf/config.yaml`，然后修改：

```bash
cd /opt/dotchat-server
mkdir -p data/conf
cat > data/conf/config.yaml << 'EOF'
lang: "zh-CN"
app:
  web-client: 1
  register: false
  register-status: 1
  captcha-threshold: 3
  ban-threshold: 0
  show-swagger: 0
  token-expire: 168h
  web-sso: true
  disable-pwd-login: false
admin:
  title: "点聊服务器管理后台"
gin:
  api-addr: "0.0.0.0:21114"
  mode: "release"
  resources-path: 'resources'
gorm:
  type: "sqlite"
  max-idle-conns: 10
  max-open-conns: 100
luoda:
  id-server: "dotchat.dicad.cn:21116"
  relay-server: "dotchat.dicad.cn:21117"
  api-server: "http://dotchat.dicad.cn:21114"
  key: "【第3步生成的公钥】"
  key-file: "/data/id_ed25519.pub"
  personal: 1
logger:
  path: "./runtime/log.txt"
  level: "info"
  report-caller: true
EOF
```

> `id-server` / `relay-server` / `api-server` 全部使用 `dotchat.dicad.cn`，
> 客户端（PC/手机点聊）在网络设置里也填 `dotchat.dicad.cn`。

## 5. 启动

```bash
cd /opt/dotchat-server
docker compose up -d
docker compose ps
```

## 6. 防火墙放行

```bash
# 阿里云安全组（控制台）+ 本机防火墙：
firewall-cmd --permanent --add-port=21114/tcp --add-port=21115/tcp \
  --add-port=21116/tcp --add-port=21116/udp --add-port=21117/tcp \
  --add-port=21118/tcp --add-port=21119/tcp
firewall-cmd --reload
# 或
ufw allow 21114:21119/tcp && ufw allow 21116/udp
```

## 7. DNS

确保 `dotchat.dicad.cn` 已解析到 `47.114.75.115`：
```bash
dig +short dotchat.dicad.cn
# 期望输出: 47.114.75.115
```

## 8. 验证

```bash
# 管理后台
curl -I http://dotchat.dicad.cn:21114/_admin/
# API 健康
curl -s http://dotchat.dicad.cn:21114/api/admin/config | head -5
# 密钥确认
docker logs LUODA-hbbs 2>&1 | grep -i "Key:" | tail -1
# 应与第 3 步生成的公钥一致
```

## 9. 客户端连接配置（PC 点聊 / 手机点聊）

| 字段 | 值 |
|------|-----|
| ID 服务器 | `dotchat.dicad.cn` |
| 中继服务器 | `dotchat.dicad.cn` |
| API 服务器 | `http://dotchat.dicad.cn:21114` |
| Key | 第 3 步生成的公钥 |

## 10. 与 rev.dicad.cn 老服务隔离要点

- 老服务（rev.dicad.cn）保持原样运行，**不做任何改动**
- dotchat 使用独立目录 `/opt/dotchat-server`、独立容器名 `LUODA-hbbs`/`LUODA-hbbr`
  （若与老容器重名，部署前 `docker rename` 老容器或调整 compose 的 container_name）
- dotchat 使用独立密钥（第 3 步），客户端密钥与 rev 不混用
- ⚠️ 若两台服务必须同机同端口（21114-21119 全冲突），则无法共存，
  需与用户确认停用/迁移 rev 老服务后再部署 dotchat
