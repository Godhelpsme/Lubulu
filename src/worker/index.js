/**
 * Cloudflare Worker 入口
 * 处理 API 请求 + 静态资源
 */

import { handleSpin } from './handlers/spin.js';
import { handleHistory } from './handlers/history.js';
import { handleSettings } from './handlers/settings.js';
import { handleStats } from './handlers/stats.js';
import { getUserId } from './auth.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS 处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-User-ID',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // API 路由
    if (url.pathname.startsWith('/api/')) {
      // 获取用户 ID
      const userId = getUserId(request);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const context = { env, userId, request };

      try {
        // 支持版本化和无版本路径(向后兼容)
        const path = url.pathname
          .replace(/^\/api\/v1/, '/api')  // v1 映射到当前实现
          .replace(/^\/api/, '');

        switch (path) {
          case '/spin':
            return await handleSpin(context);
          case '/history':
            return await handleHistory(context);
          case '/settings':
            return await handleSettings(context);
          case '/stats':
            return await handleStats(context);
          default:
            return jsonResponse({ error: 'Not Found' }, 404);
        }
      } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: error.message }, 500);
      }
    }

    // 静态资源 (Pages Functions)
    return env.ASSETS.fetch(request);
  }
};

// JSON 响应辅助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
