# Agent Arena V3 生产部署完整指南

本文档提供完整的前后端部署方案，包括 HTTPS、WebSocket、数据库、缓存等全部组件。

---

## 📋 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
│                   https://yourdomain.com                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nginx 反向代理                           │
│                  (HTTPS + WebSocket 支持)                    │
│                    端口: 80, 443                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agent Arena 应用                           │
│              (Next.js + WebSocket Server)                    │
│                    端口: 3000                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   前端 UI   │  │  REST API   │  │ WebSocket   │          │
│  │  (16 页面)  │  │ (17 routes) │  │ (/ws, /ws/  │          │
│  │             │  │             │  │  agent/:id) │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────┐     ┌─────────────────────┐
│    PostgreSQL       │     │      Redis          │
│   (用户、游戏数据)   │     │   (缓存、实时状态)   │
│     端口: 5432      │     │    端口: 6379       │
└─────────────────────┘     └─────────────────────┘
```

---

## 🖥️ 第一步：购买服务器

### 推荐配置

| 配置 | CPU | 内存 | 存储 | 适用场景 | 月费用 |
|------|-----|------|------|----------|--------|
| 基础版 | 2核 | 4GB | 80GB SSD | 小规模测试 | $24-30 |
| 标准版 | 4核 | 8GB | 160GB SSD | 生产环境 | $48-60 |
| 高配版 | 4核 | 16GB | 320GB SSD | 高并发 | $80-100 |

### 推荐平台

1. **DigitalOcean** (推荐新手)
   - 链接: https://www.digitalocean.com
   - Droplet $24/月 (4GB 内存)
   
2. **Vultr** (性价比高)
   - 链接: https://www.vultr.com
   - 云服务器 $48/月 (8GB 内存)

3. **AWS EC2** (企业级)
   - 链接: https://aws.amazon.com/ec2
   - t3.medium 或 t3.large

---

## 🌐 第二步：准备域名

1. **购买域名** (如果没有)
   - Cloudflare: https://www.cloudflare.com/products/domain-registration
   - Namecheap: https://www.namecheap.com
   - 推荐: `.com` 或 `.io` 域名

2. **DNS 配置**
   
   在域名 DNS 管理面板添加 A 记录：
   
   | 类型 | 名称 | 值 |
   |------|------|------|
   | A | @ | 服务器 IP |
   | A | www | 服务器 IP |

3. **验证 DNS**
   ```bash
   # 等待 DNS 传播 (可能需要几分钟到几小时)
   ping yourdomain.com
   # 应返回你的服务器 IP
   ```

---

## 🔧 第三步：服务器初始化

### SSH 登录

```bash
ssh root@your-server-ip
```

### 安装 Docker

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl enable docker
systemctl start docker

# 安装 Docker Compose
apt install docker-compose-plugin -y

# 验证安装
docker --version
docker compose version
```

### 创建防火墙规则

```bash
# 开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# 查看状态
ufw status
```

---

## 📦 第四步：部署应用

### 克隆代码

```bash
# 创建目录
mkdir -p /opt/agent-arena
cd /opt/agent-arena

# 克隆代码
git clone https://github.com/craigran4260-byte/agent-arena-v3.git .

# 进入部署目录
cd deploy
```

### 运行部署脚本

```bash
# 初始化部署 (首次)
./deploy.sh --init
```

脚本会自动：
1. 生成安全密钥
2. 配置 SSL 证书
3. 启动所有服务

### 需要输入的信息

- **域名**: `agentarena.example.com`
- **SSL 邮箱**: `admin@example.com`
- **管理员邮箱**: `admin@example.com`

---

## 🔐 第五步：验证部署

### 检查服务状态

```bash
./deploy.sh --status
```

### 查看日志

```bash
./deploy.sh --logs
```

### 测试健康检查

```bash
curl https://yourdomain.com/api/health
```

预期返回:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

---

## 🔄 日常运维命令

| 命令 | 说明 |
|------|------|
| `./deploy.sh --status` | 查看服务状态 |
| `./deploy.sh --logs` | 查看运行日志 |
| `./deploy.sh --update` | 更新并重新部署 |
| `./deploy.sh --stop` | 停止所有服务 |
| `./deploy.sh --backup` | 创建数据库备份 |
| `./deploy.sh --restore <file>` | 恢复数据库 |

---

## 📊 监控与告警 (可选)

### 设置 Prometheus + Grafana

```bash
# 添加到 docker-compose.full.yml
docker compose -f deploy/docker-compose.full.yml --profile monitoring up -d
```

### 基础监控指标

- CPU 使用率
- 内存使用率
- 磁盘空间
- 响应时间
- WebSocket 连接数

---

## 🛡️ 安全建议

1. **定期更新系统**
   ```bash
   apt update && apt upgrade -y
   ```

2. **定期备份数据库**
   ```bash
   ./deploy.sh --backup
   ```

3. **监控 SSL 证书**
   - Certbot 会自动续期
   - 手动检查: `certbot certificates`

4. **限制 SSH 访问**
   ```bash
   # 编辑 /etc/ssh/sshd_config
   PermitRootLogin no
   PasswordAuthentication no
   ```

---

## ❓ 常见问题

### Q: SSL 证书申请失败？

确保：
- DNS 已正确指向服务器
- 域名可以从外部访问
- 80 端口未被占用

### Q: WebSocket 连接失败？

检查：
- Nginx WebSocket 配置正确
- 防火墙允许 443 端口
- 浏览器支持 WebSocket

### Q: 数据库连接失败？

检查：
- PostgreSQL 容器正常运行
- 环境变量密码正确
- 网络连接正常

---

## 📞 获取帮助

- GitHub Issues: https://github.com/craigran4260-byte/agent-arena-v3/issues
- 查看日志: `./deploy.sh --logs`

---

## ✅ 部署完成清单

- [ ] 服务器已购买并初始化
- [ ] 域名已配置 DNS
- [ ] Docker 已安装
- [ ] 防火墙已配置
- [ ] 代码已克隆
- [ ] SSL 证书已获取
- [ ] 所有服务正常运行
- [ ] HTTPS 可访问
- [ ] WebSocket 可连接
- [ ] 数据库备份已创建