# LUODA-server 🖥️

LUODA 自建中继服务器，基于 rustdesk-server 源码 rebrand，由 GitHub Actions 交叉编译为 Docker 多架构镜像（amd64 + arm64）。

## 🚀 部署

### 前置：拉取镜像

镜像包 `ghcr.io/luoda2023/LUODA-server` 默认私有，需要先登录 GHCR：

```bash
# 去 GitHub 创建一个 classic token，勾上 read:packages
# Settings → Developer settings → Personal access tokens → Tokens (classic)
echo "你的token" | docker login ghcr.io -u luoda2023 --password-stdin
```

> 或者去 [GitHub Packages 页面](https://github.com/luoda2023/packages) 把 LUODA-server 包设成 Public，之后 docker pull 就不需要登录了。

### 1. 获取仓库

```bash
# 公开仓库
git clone https://github.com/luoda2023/LUODA-server.git
cd LUODA-server

# 如果是私有仓库，用 GitHub CLI：
gh auth login
git clone https://github.com/luoda2023/LUODA-server.git
cd LUODA-server
```

### 2. 密钥

仓库 `data/` 目录已包含 `id_ed25519` + `id_ed25519.pub`，无需额外操作。

如果要替换为自己的密钥：

```bash
cp /path/to/your/id_ed25519 data/
cp /path/to/your/id_ed25519.pub data/
```

### 3. 启动

```bash
docker compose up -d
```

服务端口：
- hbbs：`21115`(TCP) `21116`(TCP+UDP) `21118`(TCP)
- hbbr：`21117`(TCP) `21119`(TCP)

### 4. 客户端配置

| 配置项 | 值 |
|--------|-----|
| ID 服务器 | `rev.dicad.cn` |
| 中继服务器 | `rev.dicad.cn` |
| Key | `id_ed25519.pub` 文件内容 |

## 📦 镜像

```bash
docker pull ghcr.io/luoda2023/LUODA-server:latest
```

## 🔧 手动运行（不用 docker compose）

```bash
# hbbs
docker run -d --name LUODA-hbbs \
  --network host \
  -v ./data/id_ed25519:/root/id_ed25519:ro \
  -v ./data/id_ed25519.pub:/root/id_ed25519.pub:ro \
  -v ./data:/root \
  ghcr.io/luoda2023/LUODA-server:latest \
  hbbs -r rev.dicad.cn

# hbbr
docker run -d --name LUODA-hbbr \
  --network host \
  -v ./data:/root \
  ghcr.io/luoda2023/LUODA-server:latest \
  hbbr
```

## 🔑 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELAY` | `rev.dicad.cn` | 中继服务器地址 |
| `ENCRYPTED_ONLY` | `0` | 设为 `1` 强制加密连接 |

## 🛡️ 安全

- 仓库设为 **Private**
- 密钥通过 volume 挂载（`./data:/root`），不在镜像内
- 密钥文件以 `:ro` 只读挂载，防止被 hbbs 覆盖
- fork 或公开仓库前务必删除 `data/` 中的密钥并恢复 `.gitignore`

## 🏗️ 自行构建

需要 cross（musl 交叉编译）：

```bash
cargo install cross
cross build --release --target x86_64-unknown-linux-musl
cross build --release --target aarch64-unknown-linux-musl
docker build -t luoda-server .
```