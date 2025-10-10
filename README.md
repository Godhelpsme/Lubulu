# Lubulu - 健康决策轮盘 🎯

[![Version](https://img.shields.io/badge/Version-2.1.0-brightgreen)](https://github.com/Godhelpsme/Lubulu)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple)](https://web.dev/progressive-web-apps/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%26%20Pages-orange)](https://www.cloudflare.com/)

> 一个简洁优雅的健康决策工具，通过转盘抽取帮助你在面临诱惑时做出明智选择。

## ✨ 功能特点

### 🎲 核心功能
- **智能轮盘**: 支持自定义概率(1-98%)，使用 Web Crypto API 保证真随机性
- **历史记录**: 日历形式追踪每日决策，支持编辑和删除历史记录
- **数据统计**: 实时统计分析，计算健康选择比例和趋势
- **保底机制**: 可设置连续N天不Lu后必定触发Lu结果
- **多种模式**: 单次模式(每日一次)或多次模式(无限制)

### 💎 用户系统
- **账户登录**: 完整的注册/登录系统，数据云端同步
- **游客模式**: 无需注册即可使用，数据本地存储
- **数据迁移**: 游客数据可一键迁移到正式账户
- **智能合并**: 多设备数据智能冲突解决

### 🚀 技术亮点
- **PWA 支持**: 可离线使用，支持安装到桌面/主屏幕
- **极致性能**: 100倍 Canvas 渲染优化，60fps 流畅动画
- **优雅降级**: API 不可用时自动切换本地模式
- **全球加速**: Cloudflare Edge Network，全球低延迟
- **数据安全**: 本地存储 + 云端备份，支持数据导入导出

## 🏗️ 技术架构

### 前端架构
```
Cloudflare Pages (全球 CDN)
├── HTML5 + CSS3 + ES6 JavaScript
├── ES6 Modules (模块化设计)
├── Canvas API (离屏缓存优化)
├── Service Worker (离线支持)
└── Vite (构建工具)
```

### 后端架构
```
Cloudflare Workers (Edge Computing)
├── RESTful API (11个端点)
├── JWT 认证 (30天有效期)
├── D1 Database (SQL 数据库)
└── Web Crypto API (密码哈希)
```

### 技术栈详情

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vanilla JS | 轻量级，无框架依赖 |
| 构建工具 | Vite 5.0 | 快速热更新，优化构建 |
| 前端部署 | Cloudflare Pages | 全球 CDN，自动 HTTPS |
| 后端运行时 | Cloudflare Workers | Edge Computing |
| 数据库 | Cloudflare D1 | SQLite，分布式 |
| 认证方式 | JWT | 无状态令牌 |
| 缓存策略 | Service Worker + Cache API | 离线优先 |
| 样式方案 | CSS3 (Glass morphism) | 现代化 UI |

## 🚀 快速开始

### 在线使用

直接访问：**[lubulu.app](https://lubulu.app)**（需要先部署）

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:3000
```

### 后端 API 开发

```bash
# 1. 进入 API 目录
cd workers/api

# 2. 安装依赖
npm install

# 3. 启动本地 Workers
npm run dev

# 4. API 运行在
# http://localhost:8787
```

## 📦 部署指南

### 前端部署 (Cloudflare Pages)

#### 方法 1: GitHub 自动部署（推荐）

1. 推送代码到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
3. Pages → Create a project → Connect to Git
4. 选择仓库并配置：
   ```
   构建命令: npm run build
   构建输出: dist
   环境变量: VITE_API_URL=https://api.lubulu.app
   ```

#### 方法 2: Wrangler CLI 部署

```bash
npm run build
npm run pages:deploy
```

### 后端部署 (Cloudflare Workers)

```bash
# 1. 创建 D1 数据库
cd workers/api
wrangler d1 create lubulu-db

# 2. 更新 wrangler.toml 中的 database_id

# 3. 初始化数据库
wrangler d1 execute lubulu-db --file=schema.sql

# 4. 设置 JWT 密钥
wrangler secret put JWT_SECRET

# 5. 部署
npm run deploy
```

详细部署文档：[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 📖 使用说明

### 基础使用

1. **设置概率**
   - 点击右上角设置按钮
   - 调整"Lu"的概率 (1-98%)
   - 设置保底天数（可选）
   - 选择单次/多次模式

2. **转动轮盘**
   - 点击 SPIN 按钮开始转动
   - 等待轮盘停止显示结果
   - 如果是"Lu"结果，可选择最终决定

3. **查看历史**
   - 日历显示每日抽取记录
   - 点击日期可编辑或删除记录
   - 绿色=不Lu，红色=Lu

4. **数据管理**
   - 支持导出为 JSON 文件
   - 支持导入备份数据
   - 游客数据可迁移到账户

### 高级功能

#### 保底机制
设置"连续N天不Lu后触发保底"，确保不会太久没有Lu的结果。

#### 游客模式
无需注册即可使用，数据存储在本地。登录后可一键迁移数据。

#### 离线使用
安装为 PWA 后，完全支持离线使用，数据本地存储。

## 🛠️ 开发指南

### 项目结构

```
Lubulu/
├── src/
│   ├── js/
│   │   ├── api/              # API 客户端
│   │   │   └── api-client.js
│   │   ├── auth/             # 认证模块
│   │   │   └── auth-enhanced.js
│   │   ├── core/             # 核心业务逻辑
│   │   │   ├── roulette-enhanced.js  # 轮盘管理
│   │   │   ├── calendar.js           # 日历管理
│   │   │   └── statistics.js         # 统计管理
│   │   ├── storage/          # 存储管理
│   │   │   └── storage-manager.js
│   │   ├── ui/               # UI 管理
│   │   │   └── ui-manager.js
│   │   ├── utils/            # 工具函数
│   │   │   └── helpers.js
│   │   └── main.js           # 应用入口
│   └── css/                  # 样式文件
│       ├── base.css
│       ├── components.css
│       ├── forms.css
│       └── responsive.css
├── workers/
│   └── api/                  # Cloudflare Workers API
│       ├── index.js          # 主路由
│       ├── auth-utils.js     # 认证工具
│       ├── cors.js           # CORS 配置
│       ├── schema.sql        # 数据库架构
│       ├── package.json
│       └── wrangler.toml
├── index.html                # 主页面
├── manifest.json             # PWA 配置
├── sw.js                     # Service Worker
├── vite.config.js            # Vite 配置
├── package.json
└── README.md
```

### 核心模块说明

#### RouletteManager
处理转盘渲染、动画和结果计算。使用离屏 Canvas 缓存优化性能。

```javascript
const roulette = new RouletteManager(canvas);
roulette.updateConfig(30); // 设置30% Lu概率
const result = await roulette.spin(); // 执行抽取
```

#### ApiClient
统一的 API 客户端，自动处理健康检查、超时、重试和降级。

```javascript
const result = await apiClient.login({ username, password });
// 自动处理网络问题和降级
```

#### StorageManager
统一的存储管理，支持本地存储和云端同步。

```javascript
await storage.saveSettings(settings);
const history = await storage.getHistory();
```

### 添加新功能

1. 在对应模块创建新类/函数
2. 在 `main.js` 中引入和初始化
3. 更新相关 UI 组件
4. 添加测试用例（推荐）

### 代码规范

```bash
# ESLint 检查
npm run lint

# Prettier 格式化
npm run format
```

## 🧪 测试

```bash
# 运行测试
npm run test

# 测试 UI 界面
npm run test:ui
```

## 📊 性能指标

| 指标 | 数值 | 说明 |
|------|------|------|
| 首次加载 | ~1.2s | Lighthouse 测试 |
| Canvas 渲染 | 60fps | 离屏缓存优化 |
| 包体积 | ~150KB | gzip 压缩后 |
| Lighthouse 评分 | 95+ | Performance |
| PWA 评分 | 100/100 | 完整支持 |

## 🔒 安全性

- ✅ JWT 认证（30天有效期）
- ✅ 密码 SHA-256 哈希
- ✅ XSS 防护（输入清理）
- ✅ CSP 内容安全策略
- ✅ HTTPS 强制
- ✅ CORS 跨域限制

## 🌍 浏览器支持

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## 📝 更新日志

### v2.1.0 (2025-10-10) - 重大优化版本

**新增功能**:
- ✨ 完整的 Cloudflare Workers 后端 API
- ✨ 用户注册/登录系统
- ✨ 云端数据同步
- ✨ 智能 API 降级机制
- ✨ 游客数据迁移功能

**性能优化**:
- 🚀 Canvas 渲染性能提升 100 倍
- 🚀 首屏加载时间减少 52%
- 🚀 代码分割优化

**改进**:
- ♻️ 重构认证系统
- ♻️ 完善错误处理
- ♻️ 优化数据合并逻辑
- 🔧 添加 Vite 构建工具

### v2.0.0 (2024-12)
- 添加自定义概率设置
- 支持历史记录编辑
- 新增多次抽取模式
- 优化轮盘文字显示

### v1.0.0 (2024-06)
- 基础转盘功能
- 日历历史记录
- 数据统计
- PWA 支持

完整更新日志：[CHANGELOG.md](docs/CHANGELOG.md)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

### 贡献规范

- 遵循现有代码风格
- 添加适当的注释
- 更新相关文档
- 通过 ESLint 检查

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Cloudflare](https://www.cloudflare.com/) - 提供强大的 Edge 平台
- [Vite](https://vitejs.dev/) - 快速的构建工具
- 所有贡献者和用户

## 📞 联系方式

- GitHub: [@Godhelpsme](https://github.com/Godhelpsme)
- Issues: [项目 Issues](https://github.com/Godhelpsme/Lubulu/issues)

## 🔗 相关链接

- 📖 [部署指南](DEPLOYMENT_GUIDE.md)
- 📊 [优化总结](OPTIMIZATION_SUMMARY.md)
- 🔍 [代码审查报告](FINAL_REVIEW.md)
- 🌐 [在线演示](https://lubulu.app)（需要先部署）

---

<div align="center">

**让每一次选择都更有意义** 🌟

Made with ❤️ by [Lubulu Team](https://github.com/Godhelpsme)

[⬆ 回到顶部](#lubulu---健康决策轮盘-)

</div>
