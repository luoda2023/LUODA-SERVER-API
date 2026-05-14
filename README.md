# LUODA-server 🖥️

LUODA 自建 LUODA 中继服务器，**从源码编译**，完全不依赖官方预构建镜像。

## 🔧 构建流程

```
源码 (Rust) → GitHub Actions 编译 → Docker 镜像 → ghcr.io/luoda2023/lUoda-server
```

- 支持架构：`linux/amd64` `linux/arm64`
- 首次构建：~20 分钟（Rust 编译）
- 后续构建：~8 分钟（cargo 缓存命中）

## 🚀 快速部署 (1Panel)

### 准备密钥

```bash
mkdir -p data
# 将你的 id_ed25519 和 id_ed25519.pub 放入 data/ 目录
```

### docker-compose.yml（已包含在仓库中）

```bash
docker compose up -d
```

### 客户端配置

| 配置项 | 值 |
|--------|-----|
| ID 服务器 | `rev.dicad.cn` |
| 中继服务器 | `rev.dicad.cn` |
| Key | `id_ed25519.pub` 文件内容 |

## 📦 镜像地址

```
ghcr.io/luoda2023/lUoda-server:latest
```

## 🔑 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELAY` | `rev.dicad.cn` | 中继服务器地址 |
| `ENCRYPTED_ONLY` | `0` | 设为 `1` 强制加密连接 |

## 🛡️ 安全提示

- **不要将私钥 `id_ed25519` 提交到 Git**
- `data/` 目录已加入 `.gitignore`
- 建议通过 `docker secrets` 或环境变量注入密钥