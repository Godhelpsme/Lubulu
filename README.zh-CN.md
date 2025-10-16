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

- Node.js 18+
- Cloudflare 账号 (免费版即可)
- Git (用于仓库管理)

### 安装

```bash
# 1. Fork 或克隆仓库
git clone <your-repo>
cd lubulu

# 2. 安装依赖
npm install

# 3. 认证 Cloudflare
npx wrangler login
```

### 部署到 Cloudflare Pages

部署 Lubulu 需要三个步骤:**创建资源 → 部署代码 → 绑定资源**

---

#### **步骤 1: 创建 Cloudflare 资源**

使用 Wrangler CLI 创建所需的 KV 和 D1 资源:

```bash
# 创建 D1 数据库
npx wrangler d1 create lubulu-db
```

**重要**: 记录输出中的 `database_id`,稍后需要用到:
```
✅ Successfully created DB 'lubulu-db'
📋 Database ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

```bash
# 创建 KV 命名空间
npx wrangler kv:namespace create SETTINGS
```

**重要**: 记录输出中的 `id`:
```
✅ Successfully created KV namespace 'SETTINGS'
📋 ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

#### **步骤 2: 初始化数据库**

运行迁移脚本创建数据表:

```bash
# 将 YOUR_DB_ID 替换为步骤 1 中的 database_id
npx wrangler d1 execute lubulu-db --remote --file=./migrations/0001_init.sql
npx wrangler d1 execute lubulu-db --remote --file=./migrations/0002_remove_user_settings.sql
npx wrangler d1 execute lubulu-db --remote --file=./migrations/0003_change_is_pity_to_boolean.sql
```

如果提示找不到数据库,请检查 `database_id` 是否正确。

---

#### **步骤 3: 部署代码到 Cloudflare Pages**

**方式 A: 使用 Cloudflare Dashboard (推荐)** 🎯

1. **推送代码到 GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **在 Cloudflare 创建 Pages 项目**:
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 **Workers & Pages** → 点击 **Create application**
   - 选择 **Pages** → **Connect to Git**
   - 授权并选择你的 GitHub 仓库

3. **配置构建设置**:
   - **项目名称**: `lubulu` (或任意名称)
   - **生产分支**: `main`
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - 点击 **Save and Deploy**

4. **首次部署会失败** - 这是正常的!因为还没有绑定 KV 和 D1。

---

**方式 B: 使用 Wrangler CLI** ⌨️

```bash
# 构建并部署
npm run build
npx wrangler pages deploy dist --project-name=lubulu
```

如果提示创建新项目,输入 `y` 确认。

---

#### **步骤 4: 绑定 KV 和 D1 到 Pages 项目**

部署完成后,必须在 Dashboard 中手动绑定资源:

1. **进入项目设置**:
   - 在 Cloudflare Dashboard 中打开 **Workers & Pages**
   - 选择你的 `lubulu` 项目
   - 进入 **Settings** 标签页

2. **绑定 D1 数据库**:
   - 滚动到 **Functions** 部分
   - 找到 **D1 database bindings** 区域
   - 点击 **Add binding**
   - 配置:
     - **Variable name**: `DB` (必须精确匹配)
     - **D1 database**: 选择 `lubulu-db`
   - 点击 **Save**

3. **绑定 KV 命名空间**:
   - 在同一页面找到 **KV namespace bindings** 区域
   - 点击 **Add binding**
   - 配置:
     - **Variable name**: `SETTINGS` (必须精确匹配)
     - **KV namespace**: 选择你创建的 `SETTINGS` 命名空间
   - 点击 **Save**

4. **重新部署**:
   - 进入 **Deployments** 标签页
   - 点击最新部署右侧的 **⋯** 菜单
   - 选择 **Retry deployment**

---

#### **步骤 5: 验证部署**

部署成功后,访问 `https://lubulu.pages.dev` (或你的自定义域名)。

**测试功能**:
- ✅ 首次访问应该能看到轮盘界面
- ✅ 调整概率并点击"转"按钮
- ✅ 查看历史记录和统计数据

**如果遇到错误**,查看下方的"故障排除"章节。

---

### 本地开发

```bash
# 启动 Vite 开发服务器 (仅前端,无后端 API)
npm run dev
# → http://localhost:5173

# 使用 Wrangler 本地预览完整功能 (包含 Workers API)
npm run preview
# → http://localhost:8788
```

**注意**: `npm run preview` 需要先在本地创建 D1 和 KV:
```bash
# 创建本地 D1 数据库
npx wrangler d1 execute lubulu-db --local --file=./migrations/0001_init.sql
# ... 运行其他迁移

# 创建本地 KV (自动创建,无需手动操作)
```

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

### 资源绑定

**重要**: 对于 Cloudflare Pages 部署,**不要**在 `wrangler.toml` 中配置 KV 和 D1 绑定。

所有资源绑定必须在 Cloudflare Dashboard 中配置:

1. 前往 **Workers & Pages** → 你的项目 → **Settings** → **Functions**
2. 添加以下绑定:
   - **KV Namespace Binding**:
     - Variable name: `SETTINGS`
     - KV namespace: 选择你创建的命名空间
   - **D1 Database Binding**:
     - Variable name: `DB`
     - D1 database: 选择 `lubulu-db`

详细步骤请参考上方"快速开始"章节的步骤 4。

### 环境变量

`wrangler.toml` 中唯一需要的配置:

```toml
name = "lubulu"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[vars]
ENVIRONMENT = "production"
```

如需添加其他环境变量,在 Dashboard 的 **Settings** → **Environment variables** 中配置。

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

## 自动化部署

### GitHub Actions 自动部署 (推荐) 🤖

完成上述"快速开始"的步骤 1-4 后,可以配置 GitHub Actions 实现自动部署。

**前置条件**:
- 已完成 KV/D1 资源创建和绑定 (见上方"快速开始")
- 已在 Cloudflare Dashboard 创建 Pages 项目

**配置步骤**:

1. **获取 Cloudflare API 凭证**:
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 点击右上角头像 → **My Profile** → **API Tokens**
   - 点击 **Create Token** → 使用 "Edit Cloudflare Workers" 模板
   - 复制生成的 **API Token**
   - 返回 Dashboard 首页,复制 **Account ID** (在右侧栏)

2. **添加 GitHub Secrets**:
   - 打开你的 GitHub 仓库
   - 进入 **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**,添加:
     - `CLOUDFLARE_API_TOKEN` = 你的 API token
     - `CLOUDFLARE_ACCOUNT_ID` = 你的 account ID

3. **触发自动部署**:
   ```bash
   git add .
   git commit -m "Setup auto deployment"
   git push origin main
   ```

**工作原理**:

每次推送到 `main` 分支,GitHub Actions 会自动:
- ✅ 安装依赖
- ✅ 执行构建 (`npm run build`)
- ✅ 部署到 Cloudflare Pages
- ✅ 触发重新部署 (应用最新绑定)

查看部署状态:
- GitHub: 仓库的 **Actions** 标签页
- Cloudflare: **Workers & Pages** → 你的项目 → **Deployments**

**工作流文件**: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

---

### 其他部署方式

#### 手动 CLI 部署

```bash
npm run build
npx wrangler pages deploy dist --project-name=lubulu
```

**注意**: 仍需在 Dashboard 中手动绑定 KV 和 D1。

#### Cloudflare Git 集成

如果不使用 GitHub Actions,可以在 Cloudflare Dashboard 中配置 Git 集成:

1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 选择仓库并配置:
   - **构建命令**: `npm run build`
   - **输出目录**: `dist`
3. 每次推送自动触发构建和部署

**注意**: 仍需按照"快速开始"中的步骤手动绑定 KV 和 D1。

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
