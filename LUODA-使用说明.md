# LUODA 服务器管理后台使用说明

## 1. 访问地址

管理后台：

```text
http://LD.DICAD.CN:21114/_admin/
```

备用 IP 访问：

```text
http://106.54.219.147:21114/_admin/
```

API 服务地址：

```text
http://LD.DICAD.CN:21114/
```

## 2. 初始登录

当前管理员账号：

```text
用户名：admin
临时密码：Luoda@2026Admin
```

登录后请立即进入用户管理或个人密码功能修改密码，避免继续使用临时密码。

## 3. 客户端连接配置

客户端网络配置建议填写：

```text
ID 服务器：LD.DICAD.CN
中继服务器：LD.DICAD.CN
API 服务器：http://LD.DICAD.CN:21114
Key：OQnLEvt6xjfPCUc1ozpTUiAxijwnn624zy0GH9IxX90=
```

说明：

- `ID 服务器` 对应端口 `21116`。
- `中继服务器` 对应端口 `21117`。
- `API 服务器` 对应管理后台和接口服务端口 `21114`。
- `Key` 必须保持不变，否则已安装客户端会出现 KEY 不匹配或无法连接。

## 4. 管理后台功能

### 总览

用于查看服务器核心状态，包括：

- ID 服务器地址
- 中继服务器地址
- API 地址
- 设备数量
- 用户数量
- 最近设备

### 服务器配置

用于查看客户端需要使用的连接信息：

- ID Server
- Relay Server
- API Server
- WebClient 状态
- 客户端 Key

页面内有“复制客户端配置”按钮，可直接复制给客户端使用。

### 设备管理

用于查看远程设备列表，包括：

- 设备 ID
- 主机名
- 登录用户
- 操作系统
- 最近 IP
- 最后在线时间

设备相关删除、更新能力沿用后端接口，后续可继续扩展批量操作按钮。

### 用户管理

用于查看和管理后台用户，包括：

- 用户名
- 昵称
- 邮箱
- 是否管理员
- 启用/禁用状态

建议至少保留一个管理员账号，避免误删导致无法进入后台。

### 用户分组 / 设备分组 / 标签管理

用于维护后台基础分类数据：

- 用户分组：管理人员或账号归属。
- 设备分组：按业务、区域或用途划分设备。
- 标签管理：给设备或通讯录记录提供标识。

支持新增、编辑、删除。

### 审计日志

用于查看：

- 连接审计
- 文件审计

用于追踪远程连接和文件操作记录。

### 登录令牌

用于查看当前登录令牌记录，可用于排查账号是否有异常登录。

### 服务器指令

用于查看服务器指令列表。该功能涉及服务器命令，使用时需要谨慎。

## 5. 服务器部署状态

当前 VPS：

```text
106.54.219.147
```

当前容器：

```text
luoda
```

部署目录：

```text
/opt/luoda-server
```

Docker Compose 文件：

```text
/opt/luoda-server/docker-compose.yml
```

运行状态检查：

```bash
docker ps
cd /opt/luoda-server && docker compose ps
curl http://127.0.0.1:21114/api/admin/config/admin
```

当前服务端口：

| 端口 | 用途 |
|---|---|
| 21114 | API 与管理后台 |
| 21115 | NAT 测试 |
| 21116 | ID 服务器，TCP/UDP |
| 21117 | 中继服务器 |
| 21118 | WebSocket |
| 21119 | WebClient |

## 6. 密钥保护要求

服务器密钥文件位于 VPS：

```text
/opt/luoda-server/data/id_ed25519
/opt/luoda-server/data/id_ed25519.pub
```

当前公钥：

```text
OQnLEvt6xjfPCUc1ozpTUiAxijwnn624zy0GH9IxX90=
```

禁止删除或替换这两个文件。否则会导致：

- 原客户端 KEY 不匹配。
- 已部署客户端需要重新配置或确认。
- 中继连接出现认证失败。

## 7. 更新部署

GitHub 仓库：

```text
https://github.com/luoda2023/LUODA-SERVER-API
```

推送到 `main` 后会触发 GitHub Actions 自动构建镜像：

```text
ghcr.io/luoda2023/luoda-server:latest
```

VPS 更新命令：

```bash
cd /opt/luoda-server
docker compose pull
docker compose up -d --force-recreate
docker ps
```

如果镜像拉取慢，可等待后重试，不要删除 `/opt/luoda-server/data`。

## 8. 常见问题

### 后台打不开

先在 VPS 上检查：

```bash
curl http://127.0.0.1:21114/_admin/
docker ps
```

如果本机能访问但外网不能访问，检查安全组、防火墙或域名解析。

### 图标或样式没刷新

浏览器强制刷新：

```text
Ctrl + F5
```

或者清理浏览器缓存后重新打开后台。

### 客户端提示 KEY 不匹配

确认客户端填写的 Key 是否为：

```text
OQnLEvt6xjfPCUc1ozpTUiAxijwnn624zy0GH9IxX90=
```

确认 VPS 上 `/opt/luoda-server/data/id_ed25519.pub` 内容一致。

### 忘记后台密码

在 VPS 执行：

```bash
docker exec luoda luoda-api reset-admin-pwd 新密码
```

然后用账号 `admin` 和新密码登录。

## 9. 当前改版说明

本次已完成：

- 内置管理后台，不再依赖失效的外部前端仓库。
- 扁平化后台界面。
- 本地图标资源，离线可运行。
- 左侧菜单紧凑化。
- 图标颜色统一跟随菜单文字。
- 配置中心可查看服务器、Key、API 和客户端配置。
- GitHub Actions 构建成功。
- VPS 已部署并运行健康。
