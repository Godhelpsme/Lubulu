# ⚠️ Main.js 待修复问题

## 问题

main.js (src/js/main.js) 引用了已删除的模块,导致无法运行。

### 错误的导入 (需删除)

```javascript
// 第15行 - 错误的路径
import { StorageManager } from './storage/storage-manager-v2.js';
// 应改为:
import { StorageManager } from './storage/storage-manager.js';

// 第17-18行 - 模块已删除
import { AuthManager, DataMigration } from './auth/auth.js';  // ❌ auth/已删除
import { apiClient } from './api/api-client.js';              // ❌ api/已删除

// 第20-23行 - 工具函数已删除
import {
  debounce,          // ✅ 保留
  ErrorHandler,      // ❌ 已删除
  Analytics,         // ❌ 已删除
  PerformanceMonitor // ❌ 已删除
} from './utils/helpers.js';
```

### 需要删除的相关代码

1. **initializeManagers()** (83-109行)
   - AuthManager初始化
   - DataMigration初始化
   - UserManager初始化
   - handleAuthStateChange绑定

2. **所有ErrorHandler调用**
   - 搜索 `ErrorHandler.` 并删除

3. **所有Analytics调用**
   - 搜索 `Analytics.` 并删除

4. **所有PerformanceMonitor调用**
   - 搜索 `PerformanceMonitor.` 并删除

5. **UserManager相关逻辑**
   - managers.user
   - managers.auth
   - this.dataMigration

## 解决方案

### 选项A: 手动修复 (推荐)

1. 修复导入语句
2. 删除auth/api相关逻辑
3. 删除ErrorHandler/Analytics/PerformanceMonitor调用
4. 移除UserManager相关代码

### 选项B: 创建精简版main-slim.js

创建一个全新的精简main.js,只包含核心功能:
- RouletteController
- StorageManager
- 基础UI管理

## 影响

在修复前,应用**无法运行**,会在导入时报错。

## 优先级

🔴 **高优先级** - 阻止应用运行

---

**创建日期**: 2025-10-15
**状态**: 待修复
