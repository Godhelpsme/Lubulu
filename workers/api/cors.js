/**
 * CORS 配置
 * 只允许特定域名访问API
 */

// 允许的源列表
const ALLOWED_ORIGINS = [
  'https://lubulu.app',
  'https://www.lubulu.app',
  'https://lubulu.pages.dev',
  'http://localhost:3000', // 本地开发
  'http://localhost:5173', // Vite默认端口
];

/**
 * 获取CORS响应头
 * @param {Request} request - 请求对象
 * @returns {Object} CORS响应头
 */
export function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * 处理OPTIONS预检请求
 * @param {Request} request - 请求对象
 * @returns {Response} CORS响应
 */
export function handleCors(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

/**
 * 为响应添加CORS头
 * @param {Response} response - 原始响应
 * @param {Request} request - 请求对象
 * @returns {Response} 添加了CORS头的响应
 */
export function addCorsHeaders(response, request) {
  const corsHeaders = getCorsHeaders(request);
  const newHeaders = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
