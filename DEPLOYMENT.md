# 部署指南

本项目包含前端（Cloudflare Pages）和后端（Cloudflare Workers）两部分，需要分别部署。

## 前端部署 (Cloudflare Pages)

### 1. 准备文件
确保包含以下文件：
- `index.html` - 主页面
- `style.css` - 样式文件  
- `script.js` - 核心脚本
- `auth-manager.js` - 认证管理
- `data-adapter.js` - 数据适配器
- `_headers` - HTTP头配置（可选）

### 2. 创建 _headers 文件
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.workers.dev https://api.example.com
```

### 3. 部署步骤
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 Pages 部分
3. 点击 "Create a project"
4. 连接你的 Git 仓库或直接上传文件
5. 设置构建配置：
   - Build command: (留空)
   - Build output directory: /
6. 点击 "Save and Deploy"

### 4. 配置自定义域名（可选）
1. 在 Pages 项目设置中点击 "Custom domains"
2. 添加你的域名
3. 配置 DNS 记录

## 后端部署 (Cloudflare Workers)

### 1. 环境准备
```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler auth login
```

### 2. 创建 D1 数据库
```bash
# 创建生产环境数据库
wrangler d1 create lubulu-prod

# 创建开发环境数据库
wrangler d1 create lubulu-dev
```

### 3. 更新 wrangler.toml
将创建的数据库 ID 替换到 `wrangler.toml` 中：
```toml
[[env.production.d1_databases]]
binding = "D1_DATABASE"
database_name = "lubulu-prod"
database_id = "your-actual-database-id-here"
```

### 4. 设置环境变量
```bash
# 设置 JWT 密钥
wrangler secret put JWT_SECRET --env production
# 输入一个强随机密钥，例如: your-very-secure-jwt-secret-key-here

# 设置开发环境
wrangler secret put JWT_SECRET --env development
```

### 5. 部署 Workers
```bash
# 部署到生产环境
wrangler deploy --env production

# 或部署到开发环境
wrangler deploy --env development
```

### 6. 获取 Worker URL
部署成功后，记下 Worker 的 URL，格式类似：
`https://lubulu-api.your-username.workers.dev`

### 7. 更新前端配置
修改 `auth-manager.js` 中的 API 基础 URL：
```javascript
constructor() {
  this.baseURL = 'https://your-worker-url.workers.dev';
  this.token = localStorage.getItem('auth_token');
}
```

## 环境变量说明

### Workers 环境变量
- `JWT_SECRET`: JWT 令牌签名密钥
- `ALLOWED_ORIGINS`: 允许的 CORS 来源（可选）

### Pages 环境变量（可选）
Pages 部署通常不需要环境变量，但可以在构建设置中添加：
- `API_BASE_URL`: API 基础 URL
- `VERSION`: 应用版本

## 数据库初始化

数据库表会在首次访问时自动创建。如果需要手动初始化：

```bash
# 查看数据库状态
wrangler d1 execute lubulu-prod --command "SELECT name FROM sqlite_master WHERE type='table';"

# 如果需要重置数据库
wrangler d1 execute lubulu-prod --command "DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS user_settings; DROP TABLE IF EXISTS spin_history; DROP TABLE IF EXISTS daily_spin_counts;"
```

## 测试部署

### 1. 测试前端
访问你的 Pages 域名，确保：
- 页面正常加载
- 轮盘可以正常显示和旋转
- 本地功能正常工作

### 2. 测试后端
```bash
# 测试健康检查
curl https://your-worker-url.workers.dev/api/ping

# 测试注册
curl -X POST https://your-worker-url.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### 3. 测试集成
在前端页面：
1. 尝试注册新用户
2. 登录账户
3. 测试数据同步
4. 检查离线功能

## 监控和日志

### Workers 日志
```bash
# 查看实时日志
wrangler tail --env production

# 查看指定时间范围的日志
wrangler tail --env production --since 2024-01-01T00:00:00Z
```

### 性能监控
在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages
2. 选择你的 Worker
3. 查看 Analytics 标签

## 故障排除

### 常见问题
1. **CORS 错误**: 检查 Worker 中的 CORS 配置
2. **数据库连接错误**: 确认 D1 数据库 ID 正确
3. **认证失败**: 检查 JWT_SECRET 是否设置
4. **部署失败**: 检查 wrangler.toml 配置

### 调试命令
```bash
# 测试本地开发
wrangler dev

# 检查配置
wrangler whoami
wrangler d1 list

# 重新部署
wrangler deploy --env production --compatibility-date 2024-01-15
```

## 更新部署

### 更新前端
1. 推送代码到 Git 仓库
2. Pages 会自动重新部署

### 更新后端
```bash
# 重新部署 Worker
wrangler deploy --env production
```

### 数据迁移
如果需要修改数据库结构：
```bash
# 备份数据
wrangler d1 execute lubulu-prod --command "SELECT * FROM users;" --output backup.sql

# 应用新结构（根据需要修改）
wrangler d1 execute lubulu-prod --file migration.sql
```

## 安全建议

1. **定期轮换 JWT 密钥**
2. **设置强密码策略**
3. **监控异常访问**
4. **启用 Cloudflare 安全功能**
5. **定期备份数据**

## 支持

如有问题，请检查：
1. Cloudflare 服务状态
2. Worker 日志
3. 浏览器控制台错误
4. 网络连接