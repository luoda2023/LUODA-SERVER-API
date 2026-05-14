# LUODA-server 🖥️

LUODA 自建中继服务器，基于 rustdesk-server 源码 rebrand，**从源码编译**，完全不依赖官方预构建镜像。

## 架构

```
源码 (Rust) → GitHub Actions cross 交叉编译 → Docker 镜像 (amd64 + arm64) → ghcr.io/luoda2023/LUODA-server
```

- 支持架构：`linux/amd64` `linux/arm64`
- 首次构建：~20 分钟（Rust 编译）
- 后续构建：~8 分钟（cargo 缓存命中）

## 🚀 安装

### 1. 克隆仓库

```bash
git clone https://github.com/luoda2023/LUODA-server.git
cd LUODA-server
```

### 2. 准备密钥

仓库 `data/` 目录已包含密钥文件。如果自用请替换为你的密钥：

### 3. 启动服务

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
- 如果你 fork 或公开仓库，务必删除 `data/` 中的密钥并恢复 `.gitignore`

## 🏗️ 自行构建

需要 cross（musl 交叉编译）：

```bash
cargo install cross
cross build --release --target x86_64-unknown-linux-musl
cross build --release --target aarch64-unknown-linux-musl
docker build -t luoda-server .
```