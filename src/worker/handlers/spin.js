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

  // 1. 获取用户设置
  const settings = await kv.getSettings(userId);
  const pityCounter = await kv.getPityCounter(userId);

  // 2. 检查今日是否已抽取
  const today = getTodayDate();
  const history = await db.getHistory(userId, 1);

  if (!settings.multiMode && history[today]) {
    return jsonResponse({
      error: 'Already spun today',
      result: history[today]
    }, 400);
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

function getTodayDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
