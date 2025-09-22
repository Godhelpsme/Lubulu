# Lubulu - 健康决策轮盘

一个简洁的健康决策工具，通过转盘抽取帮助你在面临诱惑时做出明智选择。

![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue.svg) ![PWA](https://img.shields.io/badge/PWA-Ready-purple)

## 功能特点

- **智能轮盘**: 支持自定义概率(1-98%)，使用Web Crypto API保证随机性
- **历史记录**: 日历形式追踪每日决策，支持编辑历史记录
- **数据统计**: 实时统计分析，计算健康选择比例
- **多种模式**: 单次模式(每日一次)或多次模式
- **PWA支持**: 可离线使用，支持安装到桌面
- **数据安全**: 本地存储，支持数据导入导出

## 技术栈

- **前端**: HTML5 + CSS3 + ES6 JavaScript
- **架构**: ES6 Modules + 组件化设计
- **PWA**: Service Worker + Web App Manifest
- **存储**: localStorage + 数据导入导出
- **安全**: CSP策略 + XSS防护
## 快速开始

### 本地运行
```bash
# 克隆仓库
git clone https://github.com/Godhelpsme/Lubulu.git
cd Lubulu

# 启动本地服务器
python -m http.server 8000
# 或使用其他方式
npx serve .

# 访问应用
open http://localhost:8000
```

### 部署
项目是纯静态应用，可部署到任何支持静态托管的平台：
- GitHub Pages
- Netlify  
- Vercel
- Cloudflare Pages

## 使用说明

1. **设置概率**: 在设置中调整"Lu"的概率(1-98%)
2. **转动轮盘**: 点击SPIN按钮开始转动
3. **查看结果**: 根据结果决定是否执行行动
4. **查看统计**: 在统计页面查看历史数据和趋势

## 开发指南

### 核心模块

- `RouletteManager`: 处理轮盘渲染、动画和结果计算
- `CalendarManager`: 管理日历显示和历史记录
- `StatisticsManager`: 数据统计和分析
- `StorageManager`: 本地数据存储和管理
- `UIManager`: 界面组件和交互管理

### 项目结构
```
src/
├── js/
│   ├── core/          # 核心功能模块
│   ├── ui/            # UI管理模块  
│   ├── storage/       # 存储管理
│   ├── utils/         # 工具函数
│   └── main.js        # 应用入口
└── css/               # 样式文件
```

## 更新日志

### v2.0.0 (2024-12)
- 添加自定义概率设置(1-98%)
- 支持历史记录编辑
- 新增多次抽取模式
- 优化轮盘文字显示算法
- 改进PWA支持

### v1.0.0 (2024-06)  
- 基础转盘功能
- 日历历史记录
- 数据统计
- PWA支持
- 本地数据存储

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -am 'Add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

让每一次选择都更有意义 🌟 