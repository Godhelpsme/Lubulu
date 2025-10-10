# Lubulu 部署指南

## 📋 前置准备

### 1. 账号准备
- Cloudflare 账号
- GitHub 账号
- 域名（可选）

### 2. 工具安装
```bash
# 安装 Node.js (v18+)
node --version

# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

---

## 🚀 后端部署 (Cloudflare Workers)

### 步骤 1: 创建 D1 数据库

```bash
cd workers/api

# 创建数据库
wrangler d1 create lubulu-db

# 输出示例:
# Created lubulu-db database with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 步骤 2: 更新配置

编辑 `workers/api/wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "lubulu-db"
database_id = "你的数据库ID"  # 替换为上一步的ID
```

### 步骤 3: 初始化数据库

```bash
# 执行数据库架构
wrangler d1 execute lubulu-db --file=schema.sql

# 验证表已创建
wrangler d1 execute lubulu-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### 步骤 4: 设置密钥

```bash
# 设置 JWT 密钥（使用强随机字符串）
wrangler secret put JWT_SECRET
# 提示输入时，输入类似: your-super-secret-jwt-key-here-change-this
```

### 步骤 5: 部署 API

```bash
# 安装依赖
npm install

# 部署到生产环境
npm run deploy

# 输出示例:
# Published lubulu-api (x.xx sec)
#   https://lubulu-api.your-subdomain.workers.dev
```

### 步骤 6: 测试 API

```bash
# 测试健康检查
curl https://lubulu-api.your-subdomain.workers.dev/api/health

# 应返回:
# {"status":"healthy","timestamp":"2025-10-10T...","version":"2.0.0"}
```

### 步骤 7: 配置自定义域名（可选）

在 Cloudflare Dashboard:
1. Workers & Pages → lubulu-api → Settings → Domains & Routes
2. Add Custom Domain
3. 输入: `api.lubulu.app`
4. 等待DNS验证完成

---

## 🌐 前端部署 (Cloudflare Pages)

### 方法 1: 通过 GitHub 自动部署（推荐）

#### 步骤 1: 推送代码到 GitHub

```bash
# 在项目根目录
git add .
git commit -m "feat: add Cloudflare Workers backend and optimizations"
git push origin main
```

#### 步骤 2: 连接 Cloudflare Pages

1. 登录 Cloudflare Dashboard
2. Pages → Create a project → Connect to Git
3. 选择你的 GitHub 仓库 `Lubulu`
4. 配置构建设置:

```
项目名称: lubulu
生产分支: main
框架预设: None
构建命令: npm run build
构建输出目录: dist
根目录: /
```

#### 步骤 3: 配置环境变量

在 Pages 项目设置中添加:
```
VITE_API_URL=https://api.lubulu.app
```

#### 步骤 4: 触发部署

点击 "Save and Deploy"，等待构建完成。

#### 步骤 5: 配置自定义域名

1. Pages 项目 → Custom domains
2. Add a custom domain
3. 输入: `lubulu.app` 和 `www.lubulu.app`
4. 按照提示配置 DNS

### 方法 2: 通过 Wrangler CLI 部署

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 部署到 Pages
npm run pages:deploy

# 首次部署会提示创建项目
# 后续部署会自动更新
```

---

## 🔧 配置说明

### 环境变量

#### 生产环境 (.env.production)
```env
VITE_API_URL=https://api.lubulu.app
```

#### 开发环境 (.env.development)
```env
VITE_API_URL=http://localhost:8787
```

### CORS 配置

编辑 `workers/api/cors.js`:
```javascript
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lubulu.app', // 改为你的域名
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
```

---

## 🧪 测试部署

### 1. 测试 API

```bash
# 健康检查
curl https://api.lubulu.app/api/health

# 注册测试用户
curl -X POST https://api.lubulu.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 登录
curl -X POST https://api.lubulu.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 2. 测试前端

访问: `https://lubulu.app`

检查:
- ✅ 页面正常加载
- ✅ 转盘可以旋转
- ✅ 游客模式可用
- ✅ 用户注册/登录正常
- ✅ 离线模式工作正常

---

## 📊 监控和日志

### Cloudflare Dashboard

1. **Workers 日志**:
   - Workers & Pages → lubulu-api → Logs
   - 实时查看API请求和错误

2. **Pages 部署日志**:
   - Pages → lubulu → Deployments
   - 查看构建日志和部署历史

3. **Analytics**:
   - Workers & Pages → Analytics
   - 查看流量、性能指标

### 本地查看日志

```bash
# 实时查看 Workers 日志
cd workers/api
wrangler tail

# 查看特定部署的日志
wrangler tail --env production
```

---

## 🔄 CI/CD 自动化

### GitHub Actions 配置

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Deploy API
        working-directory: workers/api
        run: |
          npm install
          npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-pages:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Build and Deploy
        run: |
          npm install
          npm run build
          npx wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 设置 GitHub Secrets

1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit Cloudflare Workers
3. 复制 Token
4. GitHub 仓库 → Settings → Secrets → New repository secret
5. Name: `CLOUDFLARE_API_TOKEN`
6. Value: 粘贴 Token

---

## 🛠️ 故障排查

### API 无法访问

```bash
# 1. 检查 Workers 状态
wrangler whoami
wrangler deployments list

# 2. 检查数据库连接
wrangler d1 execute lubulu-db --command="SELECT 1"

# 3. 查看实时日志
wrangler tail
```

### 前端构建失败

```bash
# 1. 清除缓存重新构建
rm -rf node_modules dist
npm install
npm run build

# 2. 检查环境变量
echo $VITE_API_URL

# 3. 本地测试
npm run preview
```

### CORS 错误

检查 `workers/api/cors.js` 中的域名设置是否正确。

---

## 📝 更新和回滚

### 更新部署

```bash
# API
cd workers/api
npm run deploy

# Pages (自动，每次 git push)
git push origin main
```

### 回滚版本

```bash
# Workers
wrangler rollback [deployment-id]

# Pages
# 在 Cloudflare Dashboard 中选择之前的部署并 "Rollback"
```

---

## 🔐 安全检查清单

- [ ] JWT_SECRET 已设置且足够强
- [ ] CORS 配置了正确的域名（不是 `*`）
- [ ] API 速率限制已配置
- [ ] HTTPS 强制启用
- [ ] 数据库访问权限正确
- [ ] 环境变量不包含在代码中
- [ ] CSP 策略已配置

---

## 💰 成本估算

### Cloudflare Workers (API)
- Free: 100,000 requests/day
- Paid: $5/month for 10M requests

### Cloudflare Pages (前端)
- Free: Unlimited requests
- Unlimited bandwidth

### D1 Database
- Free: 100,000 reads/day, 50,000 writes/day
- Paid: $5/month for 25M reads

**预估**: 对于中小型应用，免费套餐完全够用 🎉

---

## 📞 支持

遇到问题？
- 📖 查看 [Cloudflare Docs](https://developers.cloudflare.com/)
- 💬 Cloudflare Discord 社区
- 🐛 提交 Issue 到项目仓库

---

**部署完成！访问你的应用** 🚀
