# 内容安全策略配置

## CSP Headers 配置
以下是推荐的CSP头配置，应在Web服务器或Cloudflare Workers中设置：

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://api.lubulu.app;
  worker-src 'self';
  manifest-src 'self';
  media-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

## 安全头配置
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff  
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Cloudflare Workers实现示例
```javascript
// 在worker.js中添加安全头
const securityHeaders = {
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;
    connect-src 'self' https://api.lubulu.app;
    worker-src 'self';
    manifest-src 'self';
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s+/g, ' ').trim(),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

// 在响应中添加安全头
Object.entries(securityHeaders).forEach(([key, value]) => {
  response.headers.set(key, value);
});
```

## 注意事项
- `unsafe-inline` 仅用于兼容性，生产环境建议移除并使用nonce
- 根据实际API域名调整 `connect-src`
- 可以根据需要调整字体和CDN域名
- 定期审查和更新CSP策略