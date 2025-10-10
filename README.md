# Lubulu

健康决策轮盘应用 - 基于 Cloudflare Pages + Workers 的 PWA 应用

## 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173`

### 后端API本地开发

```bash
# 进入API目录
cd workers/api
npm install

# 启动Workers本地服务
npm run dev
```

API运行在 `http://localhost:8787`

---

## 部署

### 前提条件

- Node.js 18+
- Cloudflare账号
- Wrangler CLI: `npm install -g wrangler`

### 1. 部署后端API

```bash
cd workers/api

# 登录Cloudflare
wrangler login

# 创建D1数据库
wrangler d1 create lubulu-db
# 记录返回的database_id

# 编辑wrangler.toml，替换database_id
# [[d1_databases]]
# database_id = "你的database_id"

# 初始化数据库
wrangler d1 execute lubulu-db --file=schema.sql

# 设置JWT密钥
wrangler secret put JWT_SECRET
# 输入一个强密钥，如: your-super-secret-jwt-key-2025

# 部署
npm run deploy
```

记录部署后的Workers URL，如：`https://lubulu-api.你的用户名.workers.dev`

### 2. 部署前端

#### 方式A: GitHub Actions自动部署（推荐）

1. Fork此仓库到你的GitHub
2. 在GitHub仓库设置Secrets:
   - `CLOUDFLARE_API_TOKEN`: [获取Token](https://dash.cloudflare.com/profile/api-tokens)
   - `CLOUDFLARE_ACCOUNT_ID`: 在Cloudflare Dashboard URL中找到
   - `VITE_API_URL`: 你的Workers API URL
3. 推送代码，GitHub Actions自动部署

#### 方式B: 手动部署

```bash
# 根目录
npm run build

# 部署到Cloudflare Pages
wrangler pages deploy dist --project-name=lubulu
```

### 3. 配置CORS

编辑 `workers/api/cors.js`，添加你的前端域名：

```javascript
const ALLOWED_ORIGINS = [
  'https://lubulu.pages.dev',  // 你的Pages域名
  'https://你的自定义域名.com',
  'http://localhost:5173',
];
```

重新部署API：`npm run deploy`

---

## 环境变量

### 前端 (.env.production)

```bash
VITE_API_URL=https://api.lubulu.app
```

### 后端 (Cloudflare Workers Secrets)

```bash
JWT_SECRET=your-super-secret-key
```

---

## 项目结构

```
Lubulu/
├── src/                      # 前端源码
│   ├── js/
│   │   ├── api/             # API客户端
│   │   ├── auth/            # 认证模块
│   │   ├── core/            # 核心业务逻辑
│   │   ├── storage/         # 存储管理
│   │   ├── ui/              # UI管理
│   │   ├── utils/           # 工具函数
│   │   ├── config/          # 配置常量
│   │   └── main.js          # 入口文件
│   └── css/                 # 样式文件
├── workers/api/             # Cloudflare Workers API
│   ├── index.js            # API路由
│   ├── auth-utils.js       # 认证工具
│   ├── cors.js             # CORS配置
│   ├── schema.sql          # 数据库架构
│   └── wrangler.toml       # Workers配置
├── index.html              # 主页面
├── manifest.json           # PWA配置
├── sw.js                   # Service Worker
├── vite.config.js          # Vite配置
└── package.json
```

---

## API端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/validate` | POST | 令牌验证 |
| `/api/auth/logout` | POST | 用户注销 |
| `/api/settings` | GET/POST | 获取/保存设置 |
| `/api/history` | GET/POST | 获取/保存历史 |
| `/api/history/:date` | DELETE | 删除历史记录 |
| `/api/daily-count` | POST | 更新每日次数 |

---

## 技术栈

### 前端
- Vanilla JavaScript (ES6 Modules)
- Vite 5.0
- Service Worker + Cache API
- Canvas API
- PWA

### 后端
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- JWT认证
- PBKDF2密码哈希

---

## 主要功能

- ✅ 自定义概率转盘抽取
- ✅ 用户注册/登录系统
- ✅ 云端数据同步
- ✅ 游客模式(本地存储)
- ✅ 历史记录管理
- ✅ 统计数据分析
- ✅ 保底机制
- ✅ PWA离线支持
- ✅ 数据导入/导出

---

## 安全特性

- PBKDF2密码哈希(100,000次迭代)
- JWT令牌认证(7天过期)
- CORS限制特定域名
- XSS输入清理
- CSP内容安全策略
- HTTPS强制

---

## 性能优化

- Canvas离屏缓存 (100倍性能提升)
- 代码分割和懒加载
- Service Worker缓存
- Gzip压缩
- CDN全球分发

---

## 开发命令

```bash
# 开发
npm run dev                 # 启动开发服务器
npm run build              # 构建生产版本
npm run preview            # 预览构建结果

# 部署
npm run pages:deploy       # 部署前端
npm run api:deploy         # 部署后端

# 代码质量
npm run lint               # ESLint检查
npm run format             # Prettier格式化
```

---

## 常见问题

### 1. API连接失败?

检查：
- `VITE_API_URL`环境变量是否正确
- CORS配置是否包含你的域名
- Workers API是否正常部署

### 2. 登录后数据无法同步?

检查：
- JWT_SECRET是否正确设置
- D1数据库是否正确初始化
- 浏览器网络请求中的令牌是否正确

### 3. PWA无法安装?

确保：
- 使用HTTPS访问
- manifest.json配置正确
- Service Worker注册成功

### 4. 数据库错误?

重新初始化：
```bash
wrangler d1 execute lubulu-db --file=schema.sql
```

---

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 联系方式

- GitHub: [@Godhelpsme](https://github.com/Godhelpsme)
- Issues: [提交问题](https://github.com/Godhelpsme/Lubulu/issues)

---

**让每一次选择都更有意义** 🎯
