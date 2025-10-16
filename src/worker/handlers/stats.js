/**
 * 统计接口
 * GET /api/stats
 */

import { D1Storage } from '../storage.js';

export async function handleStats(context) {
  const { env, userId, request } = context;

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const db = new D1Storage(env.DB);
  const stats = await db.getStats(userId);

  return jsonResponse({ stats });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
