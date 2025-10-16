# Lubulu

[English](README.md) | [简体中文](README.zh-CN.md)

**基于边缘计算的概率决策轮盘**

通过游戏化机制做出更好的决策。Lubulu 是一个极简的 Web 应用,使用可自定义的概率机制和云端同步,帮助你打破决策困难并追踪行为模式。

---

## Lubulu 是什么?

Lubulu 将决策过程转变为互动体验:

- **转动轮盘** - 可调节概率 (1%-98%)
- **跨设备追踪** - 自动同步你的选择记录
- **保底机制** - 连续特定次数后保证结果
- **可视化分析** - 日历视图和统计数据

基于 Cloudflare 全球边缘网络构建,全球范围内即时响应。

---

## 使用场景

- **打破拖延症** - 让概率帮你开始行动
- **习惯游戏化** - 追踪连续记录和成功率
- **公平随机化** - 用透明的概率做出无偏选择
- **行为分析** - 研究你的决策模式随时间的变化

---

## 功能特性

### 核心机制
- **🎲 可调概率** - 精细调整 1% 到 98% 的概率
- **🎯 保底系统** - 连续 N 次结果后保证触发
- **📊 智能统计** - 成功率、总数和连续记录追踪
- **📅 日历历史** - 所有抽取的可视化时间线
- **🔄 多种模式** - 每日单次抽取或无限练习模式

### 技术优势
- **⚡ 亚百毫秒响应** - 部署在 300+ 全球边缘节点
- **🌐 跨设备同步** - 匿名认证的云端存储
- **🔒 零注册** - 基于 UUID,符合 GDPR 规范
- **📦 极小体积** - ~3KB gzip 压缩后,无框架依赖
- **🎨 Canvas 动画** - 流畅的 60fps 轮盘渲染

---

## 快速开始

### 前置要求

```bash
Node.js 18+
Cloudflare 账号 (免费版即可)
```

### 安装

```bash
# 克隆并安装
git clone <your-repo>
cd lubulu
npm install

# 认证
npx wrangler login
```

### 配置基础设施

```bash
# 创建 D1 数据库
npx wrangler d1 create lubulu-db
# → 复制 database_id 到 wrangler.toml

# 运行迁移
npx wrangler d1 migrations apply lubulu-db --remote

# 创建 KV 命名空间
npx wrangler kv:namespace create SETTINGS
# → 复制 id 到 wrangler.toml

# 创建预览命名空间
npx wrangler kv:namespace create SETTINGS --preview
# → 复制 preview_id 到 wrangler.toml
```

### 部署

```bash
npm run build
npm run deploy
```

访问 `https://your-project.pages.dev` 即可使用 🚀

---

## 架构设计

### 边缘优先架构

```
┌─────────────┐
│   浏览器     │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────┐
│   Cloudflare 边缘 (300+ 节点)   │
├─────────────┬───────────────────┤
│   Worker    │   Pages (静态)    │
│   (API)     │   (HTML/CSS/JS)   │
└──────┬──────┴───────────────────┘
       │
       ↓
┌──────────────────┐
│    存储层        │
├──────────────────┤
│ KV: 配置         │ ← 快速读取
│ D1: 历史记录     │ ← SQL 查询
└──────────────────┘
```

### 存储策略

**为什么要分层存储?**

| 层级 | 用途 | 延迟 |
|-------|---------|---------|
| **KV** | 用户设置、保底计数器 | ~10ms (缓存) |
| **D1** | 抽取历史、统计数据 | ~50ms (SQL) |

**原则**: 热数据 (配置) 放 KV,冷数据 (历史) 放 D1。

---

## API 文档

### `POST /api/spin`
执行轮盘抽取

**响应:**
```json
{
  "result": "lu",
  "isLu": true,
  "sliceIndex": 23,
  "isPityTriggered": false,
  "pityCounter": 4,
  "date": "2025-01-15"
}
```

### `GET /api/history`
获取抽取记录

**查询参数:**
- `limit` - 最大记录数 (默认: 100)

**响应:**
```json
{
  "history": {
    "2025-01-15": {
      "result": "no_lu",
      "isPityTriggered": false,
      "timestamp": "2025-01-15T12:34:56Z"
    }
  }
}
```

### `GET /api/settings`
获取用户配置

**响应:**
```json
{
  "settings": {
    "luProbability": 5,
    "pityDays": 7,
    "multiMode": false
  },
  "pityCounter": {
    "consecutiveFails": 4,
    "threshold": 7
  }
}
```

### `PUT /api/settings`
更新配置

**请求体:**
```json
{
  "settings": {
    "luProbability": 10,
    "pityDays": 5,
    "multiMode": true
  }
}
```

### `GET /api/stats`
获取聚合统计

**响应:**
```json
{
  "stats": {
    "total": 150,
    "luCount": 18,
    "noLuCount": 132,
    "successRate": "88.0"
  }
}
```

---

## 开发

### 本地环境

```bash
# 前端开发服务器
npm run dev
# → http://localhost:5173

# 生产构建
npm run build

# 使用 Workers 本地测试
npm run preview
# → http://localhost:8788
```

### 项目结构

```
lubulu/
├── src/worker/              # 边缘后端
│   ├── index.js            # 请求路由器
│   ├── auth.js             # UUID 认证
│   ├── storage.js          # D1 + KV 封装
│   ├── game-logic.js       # 概率引擎
│   └── handlers/           # API 端点
│       ├── spin.js         # 抽取逻辑
│       ├── history.js      # CRUD 操作
│       ├── settings.js     # 配置管理
│       └── stats.js        # 统计分析
├── public/                  # 前端
│   ├── index.html
│   ├── main.js             # 应用入口
│   ├── styles.css
│   └── js/
│       ├── api/client.js   # HTTP 客户端
│       └── core/
│           ├── roulette-renderer.js
│           └── calendar.js
├── migrations/
│   └── 0001_init.sql       # 数据库模式
├── wrangler.toml           # Cloudflare 配置
└── vite.config.js          # 构建配置
```

---

## 配置

### 环境设置

创建资源后编辑 `wrangler.toml`:

```toml
name = "lubulu"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "SETTINGS"
id = "YOUR_KV_ID"
preview_id = "YOUR_PREVIEW_KV_ID"

[[d1_databases]]
binding = "DB"
database_name = "lubulu-db"
database_id = "YOUR_DB_ID"

[vars]
ENVIRONMENT = "production"
```

---

## 数据库结构

### `spin_history` 表

```sql
CREATE TABLE spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  result TEXT CHECK(result IN ('lu', 'no_lu')),
  is_pity INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,   -- Unix 时间戳
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_date ON spin_history(user_id, date);
CREATE INDEX idx_user_timestamp ON spin_history(user_id, timestamp);
```

---

## 认证机制

### 匿名 UUID 系统

```
首次访问 → 生成 UUID → 存储到 Cookie (1年有效期)
                    ↓
          所有请求 → 在 Header/Cookie 中包含 UUID
                    ↓
              后端 → 根据 UUID 隔离数据
```

**权衡考虑:**
- ✅ 零摩擦 (无需注册)
- ✅ 符合 GDPR (无个人信息)
- ✅ 实现快速
- ❌ 清除 Cookie = 数据丢失
- ❌ 无跨浏览器同步

---

## 性能

### 基准测试

| 指标 | 目标 | 实际 |
|--------|--------|--------|
| 首次内容渲染 | < 1s | ~400ms |
| API 延迟 (P95) | < 200ms | ~80ms |
| 打包大小 | < 5KB | 2.8KB (gzip) |
| 构建时间 | < 5s | ~1s |

### 优化技术

1. **边缘缓存** - KV 数据在 300+ 节点缓存
2. **SQL 索引** - 热路径上的复合索引
3. **Tree Shaking** - Vite 移除未使用代码
4. **代码分割** - 非关键模块懒加载

---

## 部署

### 方式一: GitHub Actions (推荐) 🤖

推送到 `main` 分支自动部署。

**配置 (一次性):**

1. 获取 Cloudflare 凭证:
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - **API Token**: 个人资料 → API Tokens → 创建 Token (使用 "Edit Cloudflare Workers" 模板)
   - **Account ID**: 从 Dashboard 首页复制

2. 添加 Secrets 到 GitHub 仓库:
   - 进入 **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**
   - 添加:
     - `CLOUDFLARE_API_TOKEN` - 你的 API token
     - `CLOUDFLARE_ACCOUNT_ID` - 你的 account ID

3. 推送代码触发部署:
   ```bash
   git push origin main
   ```

**就这样!** 每次推送到 `main` 分支会自动:
- ✅ 构建项目
- ✅ 部署到 Cloudflare Pages
- ✅ 运行数据库迁移 (仅生产环境)

查看部署状态:
- GitHub: **Actions** 标签页
- Cloudflare: **Workers & Pages** → **lubulu** → **Deployments**

**工作流文件:**
- `.github/workflows/deploy.yml` - 简单部署
- `.github/workflows/ci-cd.yml` - 完整 CI/CD (含预览环境)

### 方式二: CLI (手动)

```bash
npm run deploy
```

### 方式三: Cloudflare Dashboard 集成

1. 推送代码到 GitHub
2. 在 Cloudflare Dashboard 连接仓库
3. 配置构建设置:
   - **构建命令**: `npm run build`
   - **输出目录**: `dist`
4. 推送时自动部署

### 方式四: 一次性手动部署

```bash
npm run build
npx wrangler pages deploy dist
```

---

## 成本分析

### Cloudflare 免费计划 (支持 10k DAU)

| 资源 | 配额 | 预估用量 |
|----------|-------|------------|
| Workers 请求 | 10万/天 | ~2k/天 |
| Pages 构建 | 无限制 | - |
| D1 存储 | 5GB | < 10MB |
| D1 读取 | 500万/天 | ~5k/天 |
| KV 读取 | 10万/天 | ~1k/天 |
| KV 写入 | 1000/天 | ~200/天 |

**总费用: 0元/月** (典型使用量)

---

## 故障排除

### "Unauthorized" 错误
```bash
# 清除 Cookie 并刷新
# 检查浏览器控制台中的 UUID 生成
```

### "Database not found" 错误
```bash
# 验证 wrangler.toml 中的 database_id 正确
npx wrangler d1 list
```

### "KV namespace not found" 错误
```bash
# 验证 wrangler.toml 中的 KV id 正确
npx wrangler kv:namespace list
```

### 构建失败
```bash
# 确保 Node.js >= 18
node -v

# 清理安装
rm -rf node_modules package-lock.json
npm install
```

---

## 监控

### 实时日志

```bash
# 流式查看所有日志
npx wrangler tail

# 仅查看错误
npx wrangler tail --status error

# 过滤特定端点
npx wrangler tail --search "/api/spin"
```

### 数据检查

```bash
# 查询抽取历史
npx wrangler d1 execute lubulu-db \
  --command "SELECT * FROM spin_history ORDER BY timestamp DESC LIMIT 10"

# 列出 KV 键
npx wrangler kv:key list --namespace-id=<YOUR_KV_ID>

# 读取 KV 值
npx wrangler kv:key get "user:abc-123:settings" \
  --namespace-id=<YOUR_KV_ID>
```

---

## 设计哲学

基于三个原则构建:

### 1. 简单优先
- Vanilla JavaScript (无框架)
- 总计 ~1,500 行代码
- 零构建时魔法

### 2. 数据结构驱动代码
- 实现前先设计 Schema
- 存储层决定 API 形状
- 无阻抗不匹配

### 3. 边缘原生思维
- 在用户附近计算
- 全球缓存热数据
- 最小化往返次数

*"好的设计消除特殊情况。" - Linus Torvalds*

---

## 局限性

- **D1 写入冲突** - 并发更新同一行可能失败 (罕见)
- **KV 一致性** - 全球传播需要 ~60 秒
- **Cookie 依赖** - 清除 Cookie = 失去访问权限
- **无密码恢复** - 匿名认证无恢复流程

---

## 路线图

### v1.1 (下一步)
- [ ] 增强抽取动画
- [ ] 暗色模式主题
- [ ] 移动端优化布局

### v1.2 (未来)
- [ ] 可选密码保护
- [ ] JSON 数据导出
- [ ] 高级统计 (图表)

### v2.0 (长期)
- [ ] 团队/协作模式
- [ ] WebSocket 实时同步
- [ ] PWA 离线支持

---

## 贡献

欢迎提交 Pull Request! 请:

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/cool-thing`)
3. 编写清晰的提交信息 (`git commit -m 'Add cool thing'`)
4. 推送到分支 (`git push origin feature/cool-thing`)
5. 开启 Pull Request

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 资源

- **设置指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Cloudflare 文档**: https://developers.cloudflare.com/workers/
- **D1 参考**: https://developers.cloudflare.com/d1/
- **问题追踪**: GitHub Issues

---

## 支持

- 🐛 **Bug 报告**: 开启 GitHub Issue
- 💡 **功能请求**: GitHub Discussions
- 📖 **文档**: 查看 DEPLOYMENT.md
- 💬 **问题**: GitHub Discussions

---

**使用 Cloudflare Workers 构建。全球部署。随处可用。**
