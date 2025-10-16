/**
 * 抽取接口
 * POST /api/spin
 */

import { KVStorage, D1Storage } from '../storage.js';
import { GameLogic } from '../game-logic.js';

export async function handleSpin(context) {
  const { env, userId, request } = context;

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const kv = new KVStorage(env.SETTINGS);
  const db = new D1Storage(env.DB);

  // 0. 解析请求体获取客户端日期
  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    // 空请求体或解析失败,使用默认值
  }

  // 1. 获取用户设置
  const settings = await kv.getSettings(userId);
  const pityCounter = await kv.getPityCounter(userId);

  // 2. 检查今日是否已抽取 - 优先使用客户端传递的日期
  const today = body.date || getTodayDate();
  const history = await db.getHistory(userId, 1);

  // 如果今日已抽取(单模式),返回缓存结果
  if (!settings.multiMode && history[today]) {
    const cached = history[today];
    return jsonResponse({
      alreadySpun: true,
      cached: true,
      result: cached.result,
      isLu: cached.result === 'lu',
      isPityTriggered: cached.isPityTriggered,
      date: today
    }, 200);  // 200 而不是 400 - 这不是错误
  }

  // 3. 判断是否触发保底
  const shouldTriggerPity = settings.pityDays > 0 &&
    pityCounter.consecutiveFails >= settings.pityDays;

  // 4. 执行抽取
  const game = new GameLogic(settings.luProbability);
  const spinResult = shouldTriggerPity
    ? game.forceResult(true)  // 保底强制 Lu
    : game.roll();

  // 5. 更新保底计数器
  if (spinResult.isLu) {
    pityCounter.consecutiveFails = 0;
  } else {
    pityCounter.consecutiveFails++;
  }
  pityCounter.threshold = settings.pityDays;
  await kv.savePityCounter(userId, pityCounter);

  // 6. 保存历史记录
  const result = spinResult.isLu ? 'lu' : 'no_lu';
  await db.saveHistoryRecord(userId, today, result, shouldTriggerPity);

  // 7. 返回结果
  return jsonResponse({
    result,
    isLu: spinResult.isLu,
    sliceIndex: spinResult.sliceIndex,
    isPityTriggered: shouldTriggerPity,
    pityCounter: pityCounter.consecutiveFails,
    date: today
  });
}

/**
 * 获取今日日期 (UTC fallback)
 * 注意: 优先使用客户端传递的日期以避免时区问题
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
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
