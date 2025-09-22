// Service Worker for Lubulu PWA
// 版本控制和缓存管理

const CACHE_NAME = 'lubulu-v2.0.0';
const STATIC_CACHE_NAME = 'lubulu-static-v2.0.0';
const DYNAMIC_CACHE_NAME = 'lubulu-dynamic-v2.0.0';

// 需要预缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/base.css',
  '/src/css/components.css', 
  '/src/css/forms.css',
  '/src/css/responsive.css',
  '/src/js/main.js',
  '/src/js/core/roulette.js',
  '/src/js/core/calendar.js',
  '/src/js/core/statistics.js',
  '/src/js/storage/storage-manager.js',
  '/src/js/ui/ui-manager.js',
  '/src/js/utils/helpers.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 动态缓存的URL模式
const CACHE_PATTERNS = [
  /\/api\//,
  /\/icons\//,
  /\.(png|jpg|jpeg|svg|gif|webp)$/,
  /\.(woff|woff2|ttf|otf)$/
];

// Service Worker安装事件
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // 预缓存静态资源
        const staticCache = await caches.open(STATIC_CACHE_NAME);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('[SW] Static assets cached successfully');
        
        // 跳过等待，立即激活新版本
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache static assets:', error);
      }
    })()
  );
});

// Service Worker激活事件
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    (async () => {
      try {
        // 清理旧版本缓存
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name !== STATIC_CACHE_NAME && 
          name !== DYNAMIC_CACHE_NAME &&
          name.startsWith('lubulu-')
        );
        
        await Promise.all(
          oldCaches.map(name => caches.delete(name))
        );
        
        if (oldCaches.length > 0) {
          console.log('[SW] Cleaned up old caches:', oldCaches);
        }
        
        // 立即控制所有客户端
        self.clients.claim();
      } catch (error) {
        console.error('[SW] Failed to activate Service Worker:', error);
      }
    })()
  );
});

// 请求拦截和缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理HTTP/HTTPS请求
  if (!request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // 1. 静态资源：Cache First策略
        if (STATIC_ASSETS.includes(url.pathname)) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          const networkResponse = await fetch(request);
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
        
        // 2. API请求：Network First策略
        if (url.pathname.startsWith('/api/')) {
          try {
            const networkResponse = await fetch(request);
            
            // 只缓存成功的GET请求
            if (request.method === 'GET' && networkResponse.ok) {
              const cache = await caches.open(DYNAMIC_CACHE_NAME);
              cache.put(request, networkResponse.clone());
            }
            
            return networkResponse;
          } catch (error) {
            // 网络失败时从缓存中获取
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }
        
        // 3. 动态资源：Stale While Revalidate策略
        const shouldCache = CACHE_PATTERNS.some(pattern => 
          pattern.test(url.pathname) || pattern.test(url.href)
        );
        
        if (shouldCache) {
          const cachedResponse = await caches.match(request);
          const networkFetch = fetch(request).then(response => {
            if (response.ok) {
              const cache = caches.open(DYNAMIC_CACHE_NAME);
              cache.then(c => c.put(request, response.clone()));
            }
            return response;
          }).catch(() => null);
          
          return cachedResponse || networkFetch;
        }
        
        // 4. 其他请求：直接网络请求
        return fetch(request);
        
      } catch (error) {
        console.error('[SW] Fetch error:', error);
        
        // 返回离线页面或默认响应
        if (request.destination === 'document') {
          const offlineResponse = await caches.match('/');
          return offlineResponse || new Response(
            'Offline - Lubulu当前无法使用',
            { 
              status: 200,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }
          );
        }
        
        throw error;
      }
    })()
  );
});

// 后台同步
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

// 推送通知
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Lubulu有新的更新',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'lubulu-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: '打开应用',
        icon: '/icons/open-24x24.png'
      },
      {
        action: 'close', 
        title: '关闭',
        icon: '/icons/close-24x24.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Lubulu', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 消息通信
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(name => caches.delete(name))
          );
          event.ports[0].postMessage({ success: true });
        })()
      );
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// 后台数据同步函数
async function syncData() {
  try {
    // 获取离线期间的数据变更
    const pendingData = await getStorageData('pendingSync');
    if (!pendingData || pendingData.length === 0) {
      return;
    }
    
    // 同步到服务器
    for (const item of pendingData) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (error) {
        console.error('[SW] Failed to sync item:', item, error);
        throw error;
      }
    }
    
    // 清除已同步的数据
    await setStorageData('pendingSync', []);
    console.log('[SW] Data synced successfully');
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// 存储辅助函数
async function getStorageData(key) {
  return new Promise((resolve) => {
    // 这里应该与主应用的存储管理器保持一致
    // 简化实现，实际应用中需要更复杂的逻辑
    resolve([]);
  });
}

async function setStorageData(key, value) {
  return new Promise((resolve) => {
    // 这里应该与主应用的存储管理器保持一致
    resolve();
  });
}

// 错误处理
self.addEventListener('error', event => {
  console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');