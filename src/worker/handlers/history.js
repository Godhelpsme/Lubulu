/**
 * 历史记录接口
 * GET /api/history
 * DELETE /api/history?date=YYYY-MM-DD
 */

import { D1Storage } from '../storage.js';

export async function handleHistory(context) {
  const { env, userId, request } = context;
  const url = new URL(request.url);
  const db = new D1Storage(env.DB);

  // DELETE - 删除指定日期记录
  if (request.method === 'DELETE') {
    const date = url.searchParams.get('date');
    if (!date) {
      return jsonResponse({ error: 'Date parameter required' }, 400);
    }

    await db.deleteHistoryRecord(userId, date);
    return jsonResponse({ success: true });
  }

  // GET - 获取历史记录
  if (request.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const history = await db.getHistory(userId, limit);
    return jsonResponse({ history });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
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
