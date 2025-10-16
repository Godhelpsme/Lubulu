# Lubulu Edge 部署指南

## 前置准备

1. **Cloudflare 账号** - 注册地址: https://dash.cloudflare.com/sign-up
2. **Wrangler CLI** - 已在 devDependencies 中,无需单独安装
3. **Node.js 18+** - https://nodejs.org/

---

## 第一步: 克隆项目并安装依赖

```bash
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu
npm install
```

---

## 第二步: 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器进行 OAuth 认证。

---

## 第三步: 创建 D1 数据库

```bash
npx wrangler d1 create lubulu-db
```

输出示例:
```
✅ Successfully created DB 'lubulu-db'!

[[d1_databases]]
binding = "DB"
database_name = "lubulu-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要**: 复制 `database_id`,替换 `wrangler.toml` 中的 `YOUR_DB_ID_HERE`

---

## 第四步: 运行数据库迁移

```bash
npx wrangler d1 migrations apply lubulu-db --remote
```

这会执行 `migrations/0001_init.sql`,创建表结构。

---

## 第五步: 创建 KV 命名空间

```bash
npx wrangler kv:namespace create SETTINGS
```

输出示例:
```
🌀 Creating namespace with title "lubulu-edge-SETTINGS"
✅ Success!
Add the following to your configuration file:
kv_namespaces = [
  { binding = "SETTINGS", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
]
```

**重要**: 复制 `id`,替换 `wrangler.toml` 中的 `YOUR_KV_ID_HERE`

同样创建预览环境:
```bash
npx wrangler kv:namespace create SETTINGS --preview
```

复制输出的 `id`,替换 `wrangler.toml` 中的 `YOUR_PREVIEW_KV_ID_HERE`

---

## 第六步: 更新 wrangler.toml

编辑 `wrangler.toml`,替换占位符:

```toml
name = "lubulu-edge"
main = "src/worker/index.js"
compatibility_date = "2024-01-01"

pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "SETTINGS"
id = "你的KV_ID"              # 替换这里
preview_id = "你的预览KV_ID"  # 替换这里

[[d1_databases]]
binding = "DB"
database_name = "lubulu-db"
database_id = "你的DB_ID"     # 替换这里

[vars]
ENVIRONMENT = "production"
```

---

## 第七步: 本地测试 (可选)

```bash
# 构建前端
npm run build

# 本地预览
npm run preview
```

访问 http://localhost:8788

**注意**: 本地预览需要先运行本地迁移:
```bash
npx wrangler d1 migrations apply lubulu-db --local
```

---

## 第八步: 部署到 Cloudflare Pages

### 方式一: 通过 CLI (推荐)

```bash
npm run deploy
```

首次部署会提示创建项目,按提示操作即可。

### 方式二: 通过 GitHub 自动部署

1. 将代码推送到 GitHub
2. 登录 Cloudflare Dashboard
3. 进入 Pages > Create a project
4. 连接 GitHub 仓库
5. 配置构建设置:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. 添加环境变量 (在 Settings > Environment variables)
7. 点击 Save and Deploy

---

## 第九步: 配置自定义域名 (可选)

1. 进入 Cloudflare Pages 项目
2. Custom domains > Set up a custom domain
3. 输入域名 (例如: lubulu.example.com)
4. 按提示配置 DNS

---

## 第十步: 验证部署

1. 访问你的 Pages URL (例如: lubulu-edge.pages.dev)
2. 打开浏览器开发者工具 > Network
3. 点击 SPIN 按钮
4. 检查 `/api/spin` 请求是否成功

如果看到 401 Unauthorized,检查:
- Cookie 是否正常设置
- Worker 是否正确部署

---

## 故障排查

### 问题1: "Unauthorized" 错误

**原因**: UUID Cookie 未生成

**解决**:
- 清除浏览器缓存和 Cookie
- 刷新页面
- 检查浏览器控制台是否有 JavaScript 错误

### 问题2: "Database not found"

**原因**: D1 绑定配置错误

**解决**:
- 确认 `wrangler.toml` 中的 `database_id` 正确
- 运行 `npx wrangler d1 list` 查看数据库列表
- 重新部署: `npm run deploy`

### 问题3: "KV namespace not found"

**原因**: KV 绑定配置错误

**解决**:
- 确认 `wrangler.toml` 中的 KV `id` 正确
- 运行 `npx wrangler kv:namespace list` 查看命名空间
- 重新部署

### 问题4: 构建失败

**原因**: Node.js 版本不兼容

**解决**:
- 升级 Node.js 到 18+
- 删除 `node_modules` 和 `package-lock.json`
- 重新 `npm install`

---

## 监控和维护

### 查看 Worker 日志

```bash
npx wrangler tail
```

### 查看 D1 数据

```bash
npx wrangler d1 execute lubulu-db --command "SELECT * FROM spin_history LIMIT 10"
```

### 查看 KV 数据

```bash
npx wrangler kv:key list --namespace-id=你的KV_ID
npx wrangler kv:key get "user:UUID:settings" --namespace-id=你的KV_ID
```

---

## 生产环境检查清单

- [ ] D1 数据库已创建并迁移
- [ ] KV 命名空间已创建
- [ ] `wrangler.toml` 所有 ID 已替换
- [ ] 本地测试通过
- [ ] 部署成功
- [ ] API 接口正常工作
- [ ] 自定义域名已配置 (可选)
- [ ] 监控已设置 (可选)

---

## 更新部署

每次代码更新后:

```bash
git pull
npm install  # 如果有依赖更新
npm run deploy
```

Cloudflare 会自动处理零停机部署。

---

## 成本估算 (Cloudflare 免费计划)

| 资源 | 免费额度 | 预估用量 (日活100人) |
|------|----------|---------------------|
| Workers | 100,000 请求/天 | ~1,000 请求/天 |
| Pages | Unlimited | 免费 |
| D1 | 5GB 存储 + 500万行读 | <1MB 存储 |
| KV | 100,000 读/天 + 1000 写/天 | ~500 读/天 + 100 写/天 |

**结论**: 免费计划完全足够!

---

## 高级配置

### 启用分析

在 `wrangler.toml` 添加:
```toml
[observability]
enabled = true
```

### 配置速率限制

创建 `functions/_middleware.js`:
```javascript
export async function onRequest(context) {
  // 实现速率限制逻辑
  return await context.next();
}
```

### 自定义错误页面

在 `public` 目录添加 `404.html` 和 `500.html`。

---

## 支持

遇到问题?

1. 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
2. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
3. 提交 [GitHub Issue](https://github.com/Godhelpsme/Lubulu/issues)

---

**祝部署顺利!** 🚀
