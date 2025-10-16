/**
 * 设置接口
 * GET /api/settings
 * PUT /api/settings
 */

import { KVStorage } from '../storage.js';

export async function handleSettings(context) {
  const { env, userId, request } = context;
  const kv = new KVStorage(env.SETTINGS);

  // GET - 获取设置
  if (request.method === 'GET') {
    const settings = await kv.getSettings(userId);
    const pityCounter = await kv.getPityCounter(userId);

    return jsonResponse({
      settings,
      pityCounter
    });
  }

  // PUT - 更新设置
  if (request.method === 'PUT') {
    const body = await request.json();

    // 验证参数
    if (body.settings) {
      const { luProbability, pityDays, multiMode } = body.settings;

      if (luProbability !== undefined) {
        if (luProbability < 1 || luProbability > 98) {
          return jsonResponse({ error: 'Invalid luProbability (1-98)' }, 400);
        }
      }

      if (pityDays !== undefined) {
        if (pityDays < 0 || pityDays > 365) {
          return jsonResponse({ error: 'Invalid pityDays (0-365)' }, 400);
        }
      }

      await kv.saveSettings(userId, body.settings);
    }

    // 更新保底计数器
    if (body.pityCounter) {
      await kv.savePityCounter(userId, body.pityCounter);
    }

    return jsonResponse({ success: true });
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
