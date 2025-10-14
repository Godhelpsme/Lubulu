# Lubulu - 精简版

决策转盘应用 - 基于概率的Lu/不Lu抽取工具

**版本: 3.0.0-slim** - 遵循KISS原则精简版

---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 安装依赖(仅需Vite)
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173`

---

## 核心功能

- ✅ 可自定义概率的转盘抽取 (1%-98%)
- ✅ 保底机制 (连续N天不Lu后触发保底)
- ✅ 单次/多次模式
- ✅ 历史记录和统计
- ✅ 数据导入/导出
- ✅ 纯本地存储 (localStorage)

---

## 项目结构

```
Lubulu/
├── index.html              # 主页面
├── src/
│   ├── js/
│   │   ├── main.js                    # 主应用
│   │   ├── core/
│   │   │   ├── app-state.js          # 应用状态管理
│   │   │   ├── game-logic.js         # 游戏逻辑
│   │   │   ├── roulette-renderer.js  # 转盘渲染
│   │   │   ├── roulette-controller.js # 转盘控制器
│   │   │   ├── calendar.js           # 日历组件
│   │   │   └── statistics.js         # 统计组件
│   │   ├── storage/
│   │   │   └── storage-manager.js    # 存储管理
│   │   ├── ui/
│   │   │   └── ui-manager.js         # UI组件
│   │   ├── utils/
│   │   │   └── helpers.js            # 工具函数
│   │   └── config/
│   │       └── constants.js          # 配置常量
│   └── css/                           # 样式文件
├── package.json            # 项目配置(仅Vite依赖)
└── vite.config.js          # Vite配置
```

---

## 技术栈

- Vanilla JavaScript (ES6 Modules)
- Vite 5.0 (构建工具)
- Canvas API (转盘绘制)
- localStorage (数据持久化)

**无框架 | 无后端 | 无复杂依赖**

---

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
```

---

## 数据说明

所有数据存储在浏览器 localStorage 中:

| 键名 | 说明 |
|------|------|
| `lubulu_settings` | 用户设置(概率、保底天数、模式等) |
| `lubulu_spinHistory` | 抽取历史记录 |
| `lubulu_pityCounter` | 保底计数器 |
| `lubulu_dailySpinCounts` | 每日抽取次数 |

---

## 精简说明

### 从v2.1.0到v3.0.0-slim的变化

**删除的功能** (过度设计):
- ❌ 用户认证系统 (JWT + PBKDF2)
- ❌ 云端同步 (Cloudflare Workers + D1)
- ❌ 复杂的存储策略模式
- ❌ PWA + Service Worker
- ❌ 性能监控工具
- ❌ 分析追踪系统

**保留的核心**:
- ✅ 转盘抽取逻辑
- ✅ 概率控制
- ✅ 保底机制
- ✅ 本地存储
- ✅ 历史统计

**代码量变化**:
- 旧版: ~6000行 + 后端API
- 新版: ~2000行 (精简67%)

**依赖数量**:
- 旧版: 8个npm包
- 新版: 1个(仅Vite)

---

## 设计理念

遵循 Linus Torvalds 的"好品味"(Good Taste)原则:

1. **简单优于复杂** - 移除所有不必要的功能
2. **数据结构优先** - 保底系统O(n)→O(1)优化
3. **消除特殊情况** - 用策略替代if/else地狱
4. **实用主义** - 只解决真实存在的问题

---

## 常见问题

### Q: 数据会丢失吗?

A: 数据存储在浏览器localStorage中,除非主动清除浏览器数据,否则会一直保留。建议定期使用"导出数据"功能备份。

### Q: 可以在多设备同步吗?

A: 不支持。精简版移除了云端同步功能。如需跨设备,请使用导入/导出功能手动迁移数据。

### Q: 概率准确吗?

A: 使用`crypto.getRandomValues()`生成真随机数,比`Math.random()`更可靠。

### Q: 保底机制如何工作?

A: 连续N天(可设置)未抽中Lu后,下次必定抽中Lu。保底触发后计数器重置。

---

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## License

MIT License

---

## 联系方式

- GitHub: [@Godhelpsme](https://github.com/Godhelpsme)
- Issues: [提交问题](https://github.com/Godhelpsme/Lubulu/issues)

---

**"Simple is better than complex."** - 精简版Lubulu