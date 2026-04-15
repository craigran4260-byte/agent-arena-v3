# Agent Arena V3 - Quick Deploy (10分钟快速部署)

## 服务器要求
- 2核+ CPU, 4GB+ 内存
- Ubuntu 20.04/22.04 或类似 Linux
- 域名已指向服务器 IP

---

## 一键部署命令

```bash
# 1. SSH 登录服务器
ssh root@your-server-ip

# 2. 安装 Docker (如未安装)
curl -fsSL https://get.docker.com | sh && apt install docker-compose-plugin -y

# 3. 克隆代码
mkdir -p /opt/agent-arena && cd /opt/agent-arena
git clone https://github.com/craigran4260-byte/agent-arena-v3.git .

# 4. 运行部署脚本
cd deploy && ./deploy.sh --init
```

---

## 需要输入的信息
- 域名: `yourdomain.com`
- SSL 邮箱: `admin@yourdomain.com`
- 管理员邮箱: `admin@yourdomain.com`

---

## 验证部署
```bash
# 查看状态
./deploy.sh --status

# 查看日志
./deploy.sh --logs

# 测试健康检查
curl https://yourdomain.com/api/health
```

---

## 更新部署
```bash
./deploy.sh --update
```

---

## 完整文档
详见 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)