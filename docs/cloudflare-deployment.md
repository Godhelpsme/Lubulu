# Cloudflare Pages 部署教程

本教程将指导你如何将 Lubulu 部署到 Cloudflare Pages 平台。

## 为什么选择 Cloudflare Pages？

- 🚀 全球 CDN 加速，访问速度快
- 💰 免费额度充足（500次构建/月，100GB带宽/月）
- 🔄 与 GitHub 集成，自动 CI/CD
- 🛡️ 内置安全防护和 DDoS 保护
- 📱 完美支持 PWA 应用
- 🔒 自动 SSL 证书

## 方式一：GitHub 集成部署（推荐）

### 步骤 1：准备代码仓库

确保你的代码已经推送到 GitHub：

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 步骤 2：连接 Cloudflare Pages

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在左侧导航中点击 **"Pages"**
3. 点击 **"创建项目"** → **"连接到 Git"**
4. 授权 Cloudflare 访问你的 GitHub 账号
5. 选择 `Lubulu` 仓库
6. 点击 **"开始设置"**

### 步骤 3：配置构建设置

填写以下配置信息：

```yaml
项目名称: lubulu-app （或其他你喜欢的名称）
生产分支: main
根目录: /
构建命令: （留空，因为是纯静态项目）
构建输出目录: /
环境变量: （无需设置）
```

### 步骤 4：部署项目

1. 点击 **"保存并部署"**
2. 等待首次构建完成（通常需要1-2分钟）
3. 部署成功后，你会得到一个类似 `https://lubulu-app.pages.dev` 的域名

## 方式二：直接上传部署

如果你不想连接 GitHub，可以直接上传文件：

### 步骤 1：准备文件

确保项目根目录包含以下文件：
```
Lubulu/
├── index.html
├── manifest.json
├── sw.js
├── _headers
├── src/
├── icons/
└── 其他静态文件...
```

### 步骤 2：创建项目

1. 在 Cloudflare Pages 中点击 **"创建项目"**
2. 选择 **"上传资源"**
3. 将项目文件夹打包为 ZIP 文件
4. 上传并等待部署完成

## 自定义域名配置

### 添加自定义域名

1. 在 Pages 项目中点击 **"自定义域"** 选项卡
2. 点击 **"设置自定义域"**
3. 输入你的域名，例如：`lubulu.yourdomain.com`
4. 选择激活方式：
   - **CNAME 记录**（推荐）：添加 CNAME 记录指向你的 Pages 域名
   - **A 记录**：使用 Cloudflare 的 IP 地址

### DNS 配置示例

如果你的域名在 Cloudflare：
```
类型: CNAME
名称: lubulu
目标: lubulu-app.pages.dev
代理状态: 已代理（橙色云朵）
```

如果域名在其他服务商：
```
类型: CNAME  
主机记录: lubulu
记录值: lubulu-app.pages.dev
```

## 高级配置

### 环境变量设置

如果需要设置环境变量（如 API 密钥等）：

1. 进入项目设置页面
2. 点击 **"环境变量"** 选项卡
3. 添加所需的环境变量

### 构建钩子

设置构建钩子以在特定事件时触发部署：

1. 进入项目设置
2. 点击 **"构建和部署"**
3. 在 **"构建钩子"** 部分创建钩子
4. 复制 Webhook URL 用于外部触发

### 重定向规则

创建 `_redirects` 文件来配置 URL 重定向：

```bash
# 强制使用 HTTPS
http://yourdomain.com/* https://yourdomain.com/:splat 301!

# SPA 路由支持
/app/* /index.html 200

# API 重定向
/api/* https://api.yourdomain.com/:splat 200
```

## 性能优化配置

### 缓存设置

在 Cloudflare Dashboard 中配置缓存规则：

1. 进入域名管理页面
2. 点击 **"缓存"** 选项卡
3. 设置浏览器缓存 TTL：**4 小时**
4. 启用 **"始终在线"** 功能

### 速度优化

启用以下优化功能：

- **自动压缩**：压缩 HTML、CSS、JS 文件
- **Rocket Loader**：异步加载 JavaScript（可选）
- **Mirage**：自适应图片加载
- **Polish**：自动图片优化

### Web Analytics

启用 Cloudflare Web Analytics 来跟踪网站访问：

1. 在 Pages 项目中启用 **"Web Analytics"**
2. 获取跟踪代码
3. 添加到 `index.html` 的 `<head>` 部分：

```html
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
```

## 部署验证清单

部署完成后，请验证以下功能：

### ✅ 基本功能验证
- [ ] 网站可正常访问
- [ ] 轮盘可以正常转动
- [ ] 历史记录功能正常
- [ ] 设置页面可以打开和保存
- [ ] 响应式设计在移动端正常

### ✅ PWA 功能验证
- [ ] PWA 安装提示正常显示
- [ ] Service Worker 正常注册
- [ ] 离线模式可以使用
- [ ] 图标在桌面/主屏幕显示正常

### ✅ 性能验证
- [ ] 页面加载速度 < 3秒
- [ ] Lighthouse 分数 > 90
- [ ] 资源正确缓存
- [ ] HTTPS 证书有效

### ✅ 安全验证
- [ ] CSP 策略正常工作
- [ ] 没有混合内容警告
- [ ] 安全头配置生效

## 常见问题解决

### 问题 1：PWA 安装提示不显示

**原因**：可能是 HTTPS 证书问题或 manifest.json 配置问题

**解决方案**：
1. 检查网站是否使用 HTTPS
2. 验证 `manifest.json` 文件路径正确
3. 确保所有必需的图标文件存在

### 问题 2：Service Worker 无法注册

**原因**：通常是路径问题或 HTTPS 环境问题

**解决方案**：
1. 确保 `sw.js` 文件在根目录
2. 检查 Service Worker 注册代码中的路径
3. 在浏览器开发者工具中查看具体错误信息

### 问题 3：自定义域名 SSL 证书错误

**原因**：DNS 配置不正确或证书尚未生成

**解决方案**：
1. 检查 DNS 记录是否正确指向 Cloudflare
2. 等待 24-48 小时让 SSL 证书自动生成
3. 在 Cloudflare SSL/TLS 设置中选择 "Full" 或 "Full (strict)"

### 问题 4：静态资源 404 错误

**原因**：文件路径配置不正确

**解决方案**：
1. 检查 HTML 中的资源路径是否使用相对路径
2. 确保 `src/` 目录结构与代码中的引用一致
3. 验证 `_headers` 文件配置

## 监控和维护

### 构建监控

设置构建失败通知：
1. 进入项目设置
2. 在 **"通知"** 部分配置邮件或 Webhook 通知
3. 可以集成到 Slack、Discord 等平台

### 性能监控

使用 Cloudflare Analytics 监控网站性能：
- 页面浏览量
- 独立访客数
- 地理分布
- 设备类型分析
- 加载时间统计

### 自动更新

每当你向 main 分支推送代码时，Cloudflare Pages 会自动触发新的构建和部署：

```bash
# 本地开发完成后
git add .
git commit -m "Update features"
git push origin main

# Cloudflare Pages 会自动开始构建
```

## 成本说明

### 免费套餐限制
- 500 次构建/月
- 100GB 带宽/月
- 100 个自定义域名
- 无限静态请求

### 付费套餐优势（$20/月）
- 5000 次构建/月  
- 无限带宽
- 高级分析
- 即时回滚功能
- 优先支持

对于个人项目和小型应用，免费套餐完全够用！

---

🎉 **恭喜！现在你的 Lubulu 应用已经成功部署到全球 CDN 网络，用户可以在世界任何地方快速访问！**

如果遇到问题，请查看 [Cloudflare Pages 官方文档](https://developers.cloudflare.com/pages/) 或在项目中提出 Issue。