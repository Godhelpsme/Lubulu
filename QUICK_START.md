# Lubulu 快速开始指南

欢迎使用 Lubulu！这份指南将帮助你在 5 分钟内完成项目的本地运行或部署。

## 📋 目录

- [本地开发](#-本地开发)
- [云端部署](#-云端部署)
- [常见问题](#-常见问题)

---

## 🚀 本地开发

### 方式一：仅前端开发（推荐新手）

如果你只想体验前端功能，无需后端：

```bash
# 1. 克隆项目
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 2. 使用简单的 HTTP 服务器
# 方式 A: Python（如果已安装）
python -m http.server 8000

# 方式 B: Node.js npx
npx serve .

# 方式 C: VS Code Live Server 插件
# 在 VS Code 中右键 index.html → Open with Live Server

# 3. 打开浏览器访问
# http://localhost:8000
```

**注意**: 此方式仅支持游客模式，数据存储在本地。

### 方式二：完整开发（前端 + 后端）

```bash
# 1. 克隆项目
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 2. 安装前端依赖
npm install

# 3. 启动前端开发服务器
npm run dev
# 前端运行在 http://localhost:3000

# 4. 新开一个终端，启动后端 API
cd workers/api
npm install
npm run dev
# 后端运行在 http://localhost:8787

# 5. 打开浏览器访问前端
# http://localhost:3000
```

**功能**: 支持完整功能，包括用户注册、登录和云端同步。

---

## ☁️ 云端部署

### 前置准备

1. 注册 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
2. 安装 Node.js (v18+)
3. 安装 Wrangler CLI:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

### 步骤 1: 部署后端 API (5分钟)

```bash
# 1. 进入 API 目录
cd workers/api

# 2. 安装依赖
npm install

# 3. 创建 D1 数据库
wrangler d1 create lubulu-db
# 输出: Created database with ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 4. 复制数据库 ID，编辑 wrangler.toml
# 找到 database_id 字段，替换为你的 ID

# 5. 初始化数据库
wrangler d1 execute lubulu-db --file=schema.sql

# 6. 设置 JWT 密钥
wrangler secret put JWT_SECRET
# 提示输入时，输入一个随机字符串，例如: my-super-secret-jwt-key-12345

# 7. 部署！
npm run deploy

# 8. 复制输出的 URL
# Published lubulu-api
#   https://lubulu-api.your-name.workers.dev
```

**测试 API:**
```bash
curl https://lubulu-api.your-name.workers.dev/api/health
# 应返回: {"status":"healthy",...}
```

### 步骤 2: 部署前端 (3分钟)

#### 方式 A: GitHub 自动部署（推荐）

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "feat: add Cloudflare backend"
git push origin main

# 2. 登录 Cloudflare Dashboard
# https://dash.cloudflare.com/

# 3. 进入 Pages → Create a project → Connect to Git

# 4. 选择你的 Lubulu 仓库

# 5. 配置构建设置:
#    项目名称: lubulu
#    生产分支: main
#    构建命令: npm run build
#    构建输出目录: dist
#    环境变量: VITE_API_URL = https://lubulu-api.your-name.workers.dev

# 6. 点击 "Save and Deploy"

# 7. 等待构建完成（约 1-2 分钟）

# 8. 访问你的应用！
#    https://lubulu.pages.dev
```

#### 方式 B: 命令行部署

```bash
# 1. 在项目根目录

# 2. 创建 .env.production 文件
echo "VITE_API_URL=https://lubulu-api.your-name.workers.dev" > .env.production

# 3. 构建项目
npm install
npm run build

# 4. 部署
npm run pages:deploy

# 5. 按提示操作，完成！
```

### 步骤 3: 配置自定义域名（可选）

#### 后端域名

1. Cloudflare Dashboard → Workers & Pages → lubulu-api
2. Settings → Domains & Routes → Add Custom Domain
3. 输入: `api.lubulu.app`（或你的域名）
4. 等待 DNS 验证

#### 前端域名

1. Pages → lubulu → Custom domains → Add a custom domain
2. 输入: `lubulu.app`
3. 按提示配置 DNS（自动）

**更新前端环境变量:**
```bash
# 在 Pages 项目设置中
VITE_API_URL = https://api.lubulu.app
```

---

## ✅ 验证部署

### 测试后端 API

```bash
# 健康检查
curl https://api.lubulu.app/api/health

# 注册测试账号
curl -X POST https://api.lubulu.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# 登录
curl -X POST https://api.lubulu.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### 测试前端应用

访问你的应用，检查以下功能：

- [ ] 页面正常加载
- [ ] 转盘可以旋转
- [ ] 游客模式可用
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] 数据云端同步
- [ ] 离线模式工作

---

## ❓ 常见问题

### Q: 本地运行时 API 连接失败？

**A**: 检查后端是否启动：
```bash
cd workers/api
npm run dev
# 确保运行在 http://localhost:8787
```

### Q: 部署后前端无法连接 API？

**A**: 检查 CORS 配置：
1. 编辑 `workers/api/cors.js`
2. 将 `Access-Control-Allow-Origin` 改为你的前端域名：
   ```javascript
   'Access-Control-Allow-Origin': 'https://lubulu.app'
   ```
3. 重新部署 API: `npm run deploy`

### Q: D1 数据库创建失败？

**A**: 确保已登录 Wrangler：
```bash
wrangler whoami
# 如果未登录，运行: wrangler login
```

### Q: 构建时提示 "module not found"？

**A**: 清除缓存重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Q: Service Worker 更新不生效？

**A**: 清除浏览器缓存：
- Chrome: DevTools → Application → Clear storage
- 或强制刷新: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

### Q: 离线模式不工作？

**A**: 确保：
1. 使用 HTTPS (localhost 除外)
2. Service Worker 已注册
3. 检查浏览器控制台是否有错误

### Q: 如何查看 API 日志？

**A**: 使用 Wrangler tail：
```bash
cd workers/api
wrangler tail
# 实时查看请求日志
```

### Q: 忘记 JWT_SECRET 怎么办？

**A**: 重新设置即可：
```bash
wrangler secret put JWT_SECRET
# 输入新的密钥
```

### Q: 如何回滚到之前的版本？

**A**:
- **Workers**: `wrangler rollback [deployment-id]`
- **Pages**: 在 Dashboard 中选择之前的部署并点击 "Rollback"

### Q: 需要付费吗？

**A**: 免费版足够使用：
- Workers: 100,000 次请求/天
- Pages: 无限制
- D1: 100,000 读取/天，50,000 写入/天

---

## 📚 下一步

恭喜！你已经成功运行 Lubulu。接下来你可以：

1. 📖 阅读完整文档
   - [README.md](../README.md) - 项目概览
   - [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - 详细部署指南
   - [FINAL_REVIEW.md](../FINAL_REVIEW.md) - 代码审查报告

2. 🎨 自定义应用
   - 修改 CSS 样式
   - 添加新功能
   - 调整概率算法

3. 🐛 报告问题
   - [GitHub Issues](https://github.com/Godhelpsme/Lubulu/issues)

4. 🤝 参与贡献
   - Fork 项目
   - 提交 Pull Request

---

## 🆘 获取帮助

遇到问题？

- 📖 [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- 💬 [Cloudflare Discord](https://discord.gg/cloudflaredev)
- 🐛 [GitHub Issues](https://github.com/Godhelpsme/Lubulu/issues)

---

**祝你使用愉快！** 🎉

如果本指南对你有帮助，欢迎给项目点个 ⭐ Star！
