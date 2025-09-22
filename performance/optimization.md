# 性能优化配置

## 资源预加载策略

### 关键CSS预加载
```html
<!-- 关键CSS预加载 -->
<link rel="preload" href="/src/css/base.css" as="style" />
<link rel="preload" href="/src/css/components.css" as="style" />

<!-- 非关键CSS延迟加载 -->
<link rel="preload" href="/src/css/forms.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
<link rel="preload" href="/src/css/responsive.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
```

### JavaScript模块预加载
```html
<!-- ES模块预加载 -->
<link rel="modulepreload" href="/src/js/main.js" />
<link rel="modulepreload" href="/src/js/core/roulette.js" />
<link rel="modulepreload" href="/src/js/core/calendar.js" />
<link rel="modulepreload" href="/src/js/storage/storage-manager.js" />
```

### 字体优化
```html
<!-- 字体预加载和显示策略 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" href="/fonts/Poppins-400.woff2" as="font" type="font/woff2" crossorigin />
```

## Canvas性能优化

### Canvas配置
```javascript
// 高DPI屏幕优化
const canvas = document.getElementById('rouletteCanvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;
canvas.style.width = rect.width + 'px';
canvas.style.height = rect.height + 'px';

ctx.scale(dpr, dpr);
```

### Canvas渲染优化
```javascript
// 使用离屏Canvas预渲染静态内容
const offscreenCanvas = new OffscreenCanvas(width, height);
const offscreenCtx = offscreenCanvas.getContext('2d');

// 预渲染轮盘背景
function prerenderBackground() {
  // 渲染静态背景到离屏Canvas
  // 主Canvas只需要绘制动态内容
}

// 使用requestAnimationFrame优化动画
function animate() {
  if (isAnimating) {
    // 清除并重绘
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绘制预渲染的背景
    ctx.drawImage(offscreenCanvas, 0, 0);
    // 绘制动态内容
    
    requestAnimationFrame(animate);
  }
}
```

## 内存管理

### 事件监听器管理
```javascript
class EventManager {
  constructor() {
    this.listeners = new Map();
  }
  
  add(element, event, handler, options) {
    const key = `${element.id || 'anonymous'}-${event}`;
    if (this.listeners.has(key)) {
      this.remove(element, event);
    }
    
    element.addEventListener(event, handler, options);
    this.listeners.set(key, { element, event, handler });
  }
  
  remove(element, event) {
    const key = `${element.id || 'anonymous'}-${event}`;
    const listener = this.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this.listeners.delete(key);
    }
  }
  
  removeAll() {
    for (const [key, listener] of this.listeners) {
      listener.element.removeEventListener(listener.event, listener.handler);
    }
    this.listeners.clear();
  }
}
```

### 定时器管理
```javascript
class TimerManager {
  constructor() {
    this.timers = new Set();
    this.intervals = new Set();
  }
  
  setTimeout(callback, delay) {
    const id = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    this.timers.add(id);
    return id;
  }
  
  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }
  
  clearTimeout(id) {
    clearTimeout(id);
    this.timers.delete(id);
  }
  
  clearInterval(id) {
    clearInterval(id);
    this.intervals.delete(id);
  }
  
  clearAll() {
    this.timers.forEach(id => clearTimeout(id));
    this.intervals.forEach(id => clearInterval(id));
    this.timers.clear();
    this.intervals.clear();
  }
}
```

## 图像压缩和优化

### WebP支持检测
```javascript
function supportsWebP() {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

// 根据支持情况选择图像格式
async function getOptimalImageUrl(baseName) {
  const isWebPSupported = await supportsWebP();
  return isWebPSupported ? `${baseName}.webp` : `${baseName}.png`;
}
```

## 懒加载实现

### Intersection Observer
```javascript
class LazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      { rootMargin: '50px 0px', threshold: 0.01 }
    );
  }
  
  observe(element) {
    this.observer.observe(element);
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        this.loadContent(element);
        this.observer.unobserve(element);
      }
    });
  }
  
  loadContent(element) {
    // 加载图片或其他资源
    if (element.dataset.src) {
      element.src = element.dataset.src;
    }
  }
}
```

## 缓存策略

### 浏览器缓存配置
```javascript
// Service Worker缓存策略
const CACHE_STRATEGIES = {
  static: 'cache-first',      // 静态资源
  api: 'network-first',       // API请求
  images: 'stale-while-revalidate'  // 图片资源
};

// 缓存时间配置
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60 * 1000,    // 7天
  dynamic: 24 * 60 * 60 * 1000,       // 1天
  api: 5 * 60 * 1000                  // 5分钟
};
```

## 性能监控

### 核心Web指标监控
```javascript
function measureWebVitals() {
  // First Contentful Paint
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        console.log('FCP:', entry.startTime);
      }
    }
  }).observe({ entryTypes: ['paint'] });
  
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });
  
  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    console.log('CLS:', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}
```

## 资源优化清单

- ✅ 启用Gzip/Brotli压缩
- ✅ 使用CDN加速静态资源  
- ✅ 实现资源预加载和预连接
- ✅ 优化图片格式(WebP)和尺寸
- ✅ 延迟加载非关键资源
- ✅ 启用浏览器缓存
- ✅ 压缩CSS/JS文件
- ✅ 移除未使用的代码
- ✅ 使用HTTP/2推送关键资源
- ✅ 实现Service Worker缓存策略