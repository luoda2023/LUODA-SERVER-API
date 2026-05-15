# LUODA-SERVER-API 🖥️

LUODA 自建远程桌面一体化方案 —— 中继服务器 + Web API 管理后台二合一。

LUODA 远程桌面自建解决方案，GitHub Actions 交叉编译为 Docker 多架构镜像（amd64 + arm64）。

> **一个 `docker compose up -d`，中继服务器、Web 客户端、管理后台全部就绪。**

## 快速安装

```bash
# 1. 克隆仓库
git clone https://github.com/luoda2023/LUODA-SERVER-API.git
cd LUODA-SERVER-API

# 2. 启动（一行搞定）
docker compose up -d
```

## 服务端口

| 端口 | 服务 | 说明 |
|------|------|------|
| 21114 | LUODA API | Web 管理后台 + Web 客户端 |
| 21115 | NAT 测试 | NAT 类型测试 |
| 21116 | ID 服务器 (hbbs) | TCP + UDP，设备注册与发现 |
| 21117 | 中继服务器 (hbbr) | 数据中继转发 |
| 21118 | WebSocket | Web 客户端信令 |
| 21119 | WebClient | Web 客户端连接 |

## 访问地址

- **管理后台**：`http://你的服务器IP:21114/_admin/`
- **Web 客户端**：`http://你的服务器IP:21114/`
- **API 文档**：`http://你的服务器IP:21114/swagger/index.html`

> 示例：`http://rev.dicad.cn:21114/_admin/`

## 客户端配置

客户端 → 设置 → 网络：

| 字段 | 值 |
|------|-----|
| ID 服务器 | `rev.dicad.cn` |
| 中继服务器 | `rev.dicad.cn` |
| API 服务器 | `http://rev.dicad.cn:21114` |
| Key | `data/id_ed25519.pub` 文件内容 |

## 目录结构

```
LUODA-SERVER-API/
├── api/            # Go API 源码（luoda-api）
├── src/            # Rust 中继服务器源码（hbbs/hbbr）
├── docker/         # Docker 相关（s6-overlay 配置）
├── data/           # 密钥与持久数据
├── Dockerfile      # 多服务合一镜像构建
├── docker-compose.yml
└── README.md
```

## 构建

### Docker 构建

```bash
# 编译 Rust 二进制
cross build --release --target x86_64-unknown-linux-musl

# 编译 Go API
cd api && CGO_ENABLED=0 go build -o ../build/luoda-api ./cmd/apimain.go && cd ..

# 构建镜像
docker build -t luoda-server-api .
```

### GitHub Actions 自动构建

代码推送到 `main` 分支或创建 `v*` 标签即自动触发交叉编译并推送镜像到 `ghcr.io/luoda2023/luoda-server-api`。

## 初始管理员密码

首次启动后查看日志：

```bash
docker logs LUODA-hbbs 2>&1 | grep -i "admin"
```

登录后立即修改密码。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RELAY` | `rev.dicad.cn` | 中继服务器地址 |
| `ENCRYPTED_ONLY` | `0` | 仅加密连接（1=仅加密） |

API 配置通过 `api/conf/config.yaml` 设置，或通过 Docker 卷挂载覆盖。

## 许可证

LUODA 定制版，保留上游开源协议。