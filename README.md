# LUODA-server 🖥️

LUODA 自建中继服务器，基于 rustdesk-server 源码 rebrand，由 GitHub Actions 交叉编译为 Docker 多架构镜像（amd64 + arm64）。

## 部署

```bash
# 1. 登录 GHCR（私有包需要，公开包跳过）
echo "ghp_xxx" | docker login ghcr.io -u luoda2023 --password-stdin

# 2. 克隆（私有仓库用 token 代替密码）
git clone https://ghp_xxx@github.com/luoda2023/LUODA-server.git
cd LUODA-server

# 3. 启动
docker compose up -d
```

端口：`21115-21119`

客户端配置：ID 服务器 / 中继服务器 均填 `rev.dicad.cn`，Key 为 `data/id_ed25519.pub` 内容。

> 密钥在 `data/` 下。仓库务必私有。