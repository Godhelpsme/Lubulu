# 🎯 Lubulu - 健康决策轮盘应用

一个简洁优雅的健康决策工具，帮助你在诱惑面前做出明智选择。通过智能轮盘的随机抽取，让决策变得有趣而富有仪式感。

![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black) ![PWA](https://img.shields.io/badge/PWA-Ready-purple) ![License](https://img.shields.io/badge/License-MIT-blue.svg)

## ✨ 功能特色

### 🎪 智能转盘系统
- **自定义概率**：支持1-98%的Lu概率设置，轮盘实时更新
- **智能文字分布**：根据概率自动调整"Lu!"文字显示，避免重叠
- **真随机算法**：使用Web Crypto API确保结果公正
- **精美动画**：流畅的旋转动画，视觉效果优雅
- **音效反馈**：旋转音效和结果提示音
- **智能选择**：抽到"Lu"时可选择是否真的执行

### 📅 历史记录系统
- **日历追踪**：彩色标记每日决策结果
- **直观显示**：红色=Lu，绿色=不Lu，无标记=未抽取
- **月份导航**：支持查看历史月份记录
- **今日高亮**：当前日期特殊标识
- **记录编辑**：点击日历可修改任意日期的状态

### 🔄 灵活抽取模式
- **单次模式**：每天只能抽取一次，严格控制
- **多次模式**：可重复抽取，但只有第一次计入历史
- **模式切换**：随时在设置中调整抽取规则

### 📊 数据分析中心
- **实时统计**：Lu次数、不Lu次数、总次数
- **克制率计算**：健康选择占比分析
- **趋势展示**：清晰的数据可视化
- **动画数字**：统计数据平滑更新动画

### ⚙️ 高级设置
- **自定义概率**：1-98%范围内精确调整
- **保底机制**：设置连续不Lu天数上限
- **数据管理**：完整的导入/导出功能
- **输入验证**：严格的参数校验
- **设置持久化**：配置自动保存

### � PWA支持
- **离线使用**：Service Worker缓存策略
- **桌面安装**：支持添加到主屏幕
- **推送通知**：重要提醒功能
- **后台同步**：数据自动同步
- **快捷操作**：直接转动、查看统计等

### 🔒 安全与隐私
- **本地存储**：数据完全保存在本地
- **XSS防护**：内置安全输入验证
- **CSP策略**：严格的内容安全策略
- **隐私保护**：不收集任何个人信息

## 🏗️ 架构设计

### 模块化结构
```
lubulu/
├── 📁 src/                     # 源代码目录
│   ├── 📁 js/                  # JavaScript模块
│   │   ├── 📁 core/            # 核心功能模块
│   │   │   ├── roulette.js     # 轮盘渲染和动画
│   │   │   ├── calendar.js     # 日历显示和历史
│   │   │   └── statistics.js   # 数据统计分析
│   │   ├── 📁 ui/              # 用户界面模块
│   │   │   └── ui-manager.js   # 弹窗和通知管理
│   │   ├── 📁 storage/         # 存储管理模块
│   │   │   └── storage-manager.js # 数据存储和同步
│   │   ├── 📁 utils/           # 工具函数模块
│   │   │   └── helpers.js      # 通用工具和验证
│   │   └── main.js             # 应用程序入口
│   └── 📁 css/                 # 样式文件
│       ├── base.css            # 基础样式和变量
│       ├── components.css      # 组件样式
│       ├── forms.css           # 表单和设置样式
│       └── responsive.css      # 响应式设计
├── 📁 icons/                   # PWA图标资源
├── 📁 security/                # 安全配置文档
├── 📁 performance/             # 性能优化配置
├── manifest.json               # PWA应用清单
├── sw.js                       # Service Worker
├── index.html                  # 主页面
└── README.md                   # 项目文档
```

### 技术栈
- **前端框架**：原生HTML5 + CSS3 + ES6+ JavaScript
- **模块系统**：ES6 Modules
- **PWA技术**：Service Worker + Web App Manifest
- **随机算法**：Web Crypto API
- **动画系统**：Web Animations API + CSS Animation
- **音效系统**：Web Audio API
- **存储方案**：localStorage + IndexedDB
- **安全机制**：CSP + XSS防护
- **性能优化**：资源预加载 + 懒加载

## 🎨 设计理念

### 视觉设计
- **主色调**：#667eea（深蓝紫）- 代表理性与克制
- **背景色**：#1a202c（深色主题）提供优雅体验
- **辅助色**：渐变色彩体系，营造现代感
- **结果色**：红色代表诱惑，绿色代表健康选择
- **设计风格**：Glass Morphism + Neumorphism 结合

### 用户体验
- **响应式设计**：完美适配所有设备尺寸
- **无障碍访问**：遵循WCAG 2.1标准
- **性能优先**：资源预加载，首屏渲染优化
- **流畅交互**：60fps动画，即时反馈

### 架构原则
- **模块化**：清晰的代码组织，易于维护
- **可扩展性**：插件化设计，功能易于扩展
- **安全性**：多层安全防护，数据隐私保护
- **性能**：懒加载、缓存策略、资源优化

## 🚀 快速开始

### 在线使用
直接访问：[https://lubulu.app](https://lubulu.app)

### 本地开发
```bash
# 克隆项目
git clone https://github.com/username/Lubulu.git
cd Lubulu

# 启动本地服务器
python -m http.server 8000
# 或使用Node.js
npx serve .

# 访问应用
open http://localhost:8000
```

### PWA安装
1. 在支持PWA的浏览器中访问应用
2. 点击地址栏的"安装"图标
3. 确认安装到桌面或主屏幕
4. 享受原生应用般的体验

## 🔧 开发指南

### 环境要求
- 现代浏览器（Chrome 80+, Firefox 74+, Safari 13+）
- 支持ES6 Modules
- 支持Service Worker
- HTTPS环境（PWA功能需要）

### 核心模块说明

#### RouletteManager（轮盘管理器）
```javascript
// 轮盘渲染和动画控制
class RouletteManager {
  constructor(canvas, options) { ... }
  updateProbability(probability) { ... }    // 更新概率
  spin() { ... }                           // 执行转动
  render() { ... }                         // 渲染轮盘
}
```

#### StorageManager（存储管理器）
```javascript
// 数据存储和同步
class StorageManager {
  constructor() { ... }
  saveRecord(date, result) { ... }         // 保存记录
  getHistory() { ... }                     // 获取历史
  exportData() { ... }                     // 导出数据
  importData(data) { ... }                 // 导入数据
}
```

#### StatisticsManager（统计管理器）
```javascript
// 数据分析和展示
class StatisticsManager {
  constructor(storageManager) { ... }
  calculateStats() { ... }                 // 计算统计
  updateDisplay() { ... }                  // 更新显示
  animateNumbers() { ... }                 // 数字动画
}
```

### 自定义配置
```javascript
// 应用配置
const config = {
  defaultProbability: 1,      // 默认Lu概率(%)
  animationDuration: 3000,    // 转动动画时长(ms)
  soundEnabled: true,         // 是否启用音效
  theme: 'dark',             // 主题模式
  language: 'zh-CN'          // 语言设置
};
```

## � 设计哲学

Lubulu基于一个简单而深刻的理念：**让随机性帮助你做出理性选择**。

当我们面临诱惑时，往往会找各种理由说服自己"就这一次"。而Lubulu通过引入随机元素，让决策过程变得有趣且公正，同时保留了最终的选择权。智能的概率分配既体现了健康选择的重要性，又不会完全剥夺偶尔放纵的乐趣。

### 概率哲学
- **默认克制**：高概率获得"不Lu"，鼓励健康选择
- **偶尔放纵**：低概率"Lu"保持生活的趣味性
- **用户自主**：完全可自定义的概率设置
- **保底机制**：防止过度克制带来的心理压力

## 📝 版本历史

### v2.0.0 - 2025-01-15 🎉
**重大架构升级 - 模块化重构**

#### 🏗️ 架构重构
- ✨ **模块化设计**：完全重构为ES6模块架构
- 🔧 **TypeScript支持**：增强代码类型安全
- 📱 **PWA升级**：完整的渐进式Web应用支持
- 🔒 **安全增强**：CSP策略、XSS防护、输入验证

#### 🆕 新功能
- 🚀 **离线模式**：Service Worker缓存，完全离线使用
- 📊 **增强统计**：更详细的数据分析和可视化
- 🎨 **主题系统**：深色/浅色主题切换
- 🔔 **通知系统**：智能提醒和反馈
- 📱 **响应式升级**：更好的移动端体验

#### 🛠️ 性能优化
- ⚡ **加载优化**：资源预加载、懒加载策略
- 🎭 **动画升级**：更流畅的60fps动画
- 💾 **缓存策略**：智能缓存管理
- 🔍 **SEO优化**：更好的搜索引擎优化

### v1.5.0 - 2024-12-20
**功能增强版本**

#### 🆕 主要更新
- 🎯 **自定义概率**：支持1-98%的Lu概率调整
- 📝 **历史编辑**：点击日历修改历史记录
- 🔄 **多次模式**：新增重复抽取模式
- 🎪 **智能文字**：根据概率优化轮盘显示

### v1.0.0 - 2024-06-22
**首次发布** 🚀

#### 核心功能
- 🎪 99等分转盘抽取系统
- 📅 日历历史记录追踪
- 📊 数据统计与可视化
- ⚙️ 保底机制设置
- 📸 一键截图分享

## 🎯 使用场景

### 健康生活
- 🍔 决定是否吃垃圾食品
- 🏃 是否进行运动锻炼
- 💤 早睡还是熬夜选择
- 🚭 戒烟戒酒的决定

### 生活管理
- 🛒 控制冲动购物
- 📱 管理手机使用时间
- 🎮 控制游戏娱乐时长
- 📚 选择学习还是娱乐

### 决策辅助
- 💼 工作生活平衡
- 🎯 目标坚持与放松
- 🤔 理性与感性的选择
- 🔄 习惯养成的助手

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献
1. 🍴 Fork 本项目
2. 🔧 创建特性分支：`git checkout -b feature/amazing-feature`
3. 📝 提交更改：`git commit -m 'Add amazing feature'`
4. 🚀 推送分支：`git push origin feature/amazing-feature`
5. 📮 提交 Pull Request

### 开发规范
- 使用ES6+语法和现代JavaScript特性
- 遵循ESLint和Prettier配置
- 编写清晰的注释和文档
- 添加适当的测试用例
- 遵循语义化版本控制

### 问题报告
- 使用清晰的标题描述问题
- 提供详细的复现步骤
- 包含错误截图或日志
- 指明浏览器和版本信息

## 📄 开源协议

本项目基于 **MIT** 协议开源 - 详见 [LICENSE](LICENSE) 文件。

### 协议说明
- ✅ 商业使用
- ✅ 修改和分发
- ✅ 私人使用
- ✅ 专利使用
- ❌ 责任免除
- ❌ 保证免除

## 🙏 致谢

### 特别感谢
- 所有为健康生活努力的人们
- 开源社区的支持和贡献
- 测试用户的宝贵反馈
- 设计灵感来源的前辈们

### 技术致谢
- Web Crypto API 提供安全随机数
- Canvas API 实现精美轮盘效果
- Service Worker 提供离线支持
- Web Audio API 丰富交互体验

---

**让每一次选择都更有意义 🌟**

> "最好的决定往往来自于深思熟虑，而不是冲动行事。" - Lubulu Team

- 🍔 决定是否吃垃圾食品
- 🛒 控制冲动购物
- 🎮 管理游戏时间
- 📱 减少刷手机频率
- 🏃 决定是否锻炼
- 💤 早睡还是熬夜

## 🔮 设计哲学

Lubulu基于一个简单而深刻的理念：**让随机性帮助你做出理性选择**。

当我们面临诱惑时，往往会找各种理由说服自己"就这一次"。而Lubulu通过引入随机元素，让决策过程变得有趣且公正，同时保留了最终的选择权。99%的概率获得"不Lu"的结果，既体现了健康选择的重要性，又不会完全剥夺偶尔放纵的乐趣。

## 📊 概率说明

- **不Lu概率**：可自定义，默认98/99 ≈ 98.99%
- **Lu概率**：可自定义，默认1/99 ≈ 1.01%
- **保底机制**：可设置连续不Lu天数上限

这个设计确保了绝大多数情况下你会做出健康选择，同时偶尔的"Lu"也让过程不那么严苛。

## 📝 更新日志

### Version 2.0.0 - 2025-07-06
🎉 **重大更新 - 自定义概率与增强体验**

#### 🆕 新功能
- ✨ **自定义概率设置**：支持1-98%的Lu概率调整
- 🎨 **智能文字分布**：根据概率自动优化"Lu!"文字显示，避免重叠
- 📝 **历史记录编辑**：点击日历任意日期可修改Lu/不Lu状态
- 🔄 **多次抽取模式**：新增多次模式，可重复抽取但只记录第一次
- 💫 **更新提醒**：新版本功能自动展示更新日志

#### 🛠️ 优化改进
- 🎯 **用户体验优化**：禁用文本选择和拖拽，避免误操作
- 🎪 **轮盘动态更新**：概率调整时轮盘实时变化
- 📊 **统计数据准确性**：优化多次模式下的数据统计
- 🎵 **交互反馈**：改进音效和动画效果

#### 🐛 问题修复
- 修复高概率下文字重叠问题
- 修复拖拽滑块时的选择文字问题
- 优化移动端触摸体验

### Version 1.0.0 - 2025-06-22
🚀 **首次发布**

#### 核心功能
- 🎪 99等分转盘抽取系统
- 📅 日历历史记录追踪
- 📊 数据统计与可视化
- ⚙️ 保底机制设置
- 📸 一键截图分享
- 💾 数据导入导出

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢所有为健康生活努力的人们
- 灵感来源于对自控力的思考和实践
- 特别感谢测试和反馈的朋友们

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 📧 邮箱：admin@qaq.al
- 🐛 Issue：[GitHub Issues](https://github.com/xvhuan/Lubulu/issues)

## ⭐ Star 趋势

感谢每一位支持 Lubulu 的开发者和用户！

[![Star History Chart](https://api.star-history.com/svg?repos=xvhuan/Lubulu&type=Date)](https://star-history.com/#xvhuan/Lubulu&Date)

如果这个项目对你有帮助，欢迎给个 ⭐ Star 支持一下！

---

**让每一次选择都更有意义 🌟**

> "最好的决定往往来自于深思熟虑，而不是冲动行事。" - Lubulu 