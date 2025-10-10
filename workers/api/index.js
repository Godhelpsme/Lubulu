/**
 * Lubulu Cloudflare Workers API
 * 提供用户认证、数据存储和同步服务
 */

import { Router } from 'itty-router';
import { validateToken, generateToken, hashPassword, verifyPassword } from './auth-utils';
import { getCorsHeaders, handleCors, addCorsHeaders } from './cors';

const router = Router();

/**
 * 健康检查端点
 */
router.get('/api/health', (request) => {
  const response = new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
  return response;
});

/**
 * 用户注册
 */
router.post('/api/auth/register', async (request, env) => {
  try {
    const { username, password, email } = await request.json();

    // 输入验证
    if (!username || username.length < 3 || username.length > 20) {
      return jsonResponse(request, { error: '用户名需要3-20个字符' }, 400);
    }
    if (!password || password.length < 8) {
      return jsonResponse(request, { error: '密码至少需要8个字符' }, 400);
    }
    if (!email || !isValidEmail(email)) {
      return jsonResponse(request, { error: '请输入有效的邮箱地址' }, 400);
    }

    // 检查用户是否已存在
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existingUser) {
      return jsonResponse(request, { error: '用户名或邮箱已被使用' }, 409);
    }

    // 创建用户
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      'INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, username, email, passwordHash, new Date().toISOString()).run();

    // 生成令牌
    const token = await generateToken(userId, username, env.JWT_SECRET);

    return jsonResponse(request, {
      user: { id: userId, username, email },
      token
    }, 201);

  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse(request, { error: '注册失败，请稍后重试' }, 500);
  }
});

/**
 * 用户登录
 */
router.post('/api/auth/login', async (request, env) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return jsonResponse(request, { error: '请输入用户名和密码' }, 400);
    }

    // 查找用户
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) {
      return jsonResponse(request, { error: '用户名或密码错误' }, 401);
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse(request, { error: '用户名或密码错误' }, 401);
    }

    // 更新最后登录时间
    await env.DB.prepare(
      'UPDATE users SET last_login = ? WHERE id = ?'
    ).bind(new Date().toISOString(), user.id).run();

    // 生成令牌
    const token = await generateToken(user.id, user.username, env.JWT_SECRET);

    return jsonResponse(request, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(request, { error: '登录失败，请稍后重试' }, 500);
  }
});

/**
 * 验证令牌
 */
router.post('/api/auth/validate', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const user = await env.DB.prepare(
      'SELECT id, username, email FROM users WHERE id = ?'
    ).bind(authResult.userId).first();

    if (!user) {
      return jsonResponse(request, { error: '用户不存在' }, 404);
    }

    return jsonResponse(request, { user });

  } catch (error) {
    console.error('Validate error:', error);
    return jsonResponse(request, { error: '验证失败' }, 500);
  }
});

/**
 * 用户注销
 */
router.post('/api/auth/logout', async (request) => {
  // Workers 使用无状态JWT，注销主要在客户端完成
  return jsonResponse(request, { message: '注销成功' });
});

/**
 * 获取用户设置
 */
router.get('/api/settings', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const settings = await env.DB.prepare(
      'SELECT settings FROM user_settings WHERE user_id = ?'
    ).bind(authResult.userId).first();

    if (!settings) {
      // 返回默认设置
      return jsonResponse(request, {
        pityDays: 0,
        luProbability: 1,
        multiMode: false,
        soundEnabled: true,
        animationEnabled: true
      });
    }

    return jsonResponse(request, JSON.parse(settings.settings));

  } catch (error) {
    console.error('Get settings error:', error);
    return jsonResponse(request, { error: '获取设置失败' }, 500);
  }
});

/**
 * 保存用户设置
 */
router.post('/api/settings', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const settings = await request.json();

    // 验证设置
    if (!validateSettings(settings)) {
      return jsonResponse(request, { error: '无效的设置参数' }, 400);
    }

    // 保存或更新设置
    await env.DB.prepare(
      `INSERT INTO user_settings (user_id, settings, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET settings = ?, updated_at = ?`
    ).bind(
      authResult.userId,
      JSON.stringify(settings),
      new Date().toISOString(),
      JSON.stringify(settings),
      new Date().toISOString()
    ).run();

    return jsonResponse(request, settings);

  } catch (error) {
    console.error('Save settings error:', error);
    return jsonResponse(request, { error: '保存设置失败' }, 500);
  }
});

/**
 * 获取历史记录
 */
router.get('/api/history', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const records = await env.DB.prepare(
      'SELECT * FROM spin_history WHERE user_id = ? ORDER BY date DESC LIMIT 365'
    ).bind(authResult.userId).all();

    const history = {};
    records.results.forEach(record => {
      history[record.date] = {
        result: record.result,
        spinCount: record.spin_count,
        isPityTriggered: record.is_pity_triggered === 1,
        timestamp: record.timestamp
      };
    });

    return jsonResponse(request, history);

  } catch (error) {
    console.error('Get history error:', error);
    return jsonResponse(request, { error: '获取历史记录失败' }, 500);
  }
});

/**
 * 保存历史记录
 */
router.post('/api/history', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const { date, result, isPityTriggered } = await request.json();

    if (!date || !result) {
      return jsonResponse(request, { error: '缺少必需参数' }, 400);
    }

    await env.DB.prepare(
      `INSERT INTO spin_history (user_id, date, result, spin_count, is_pity_triggered, timestamp)
       VALUES (?, ?, ?, 1, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         result = ?,
         is_pity_triggered = ?,
         timestamp = ?`
    ).bind(
      authResult.userId,
      date,
      result,
      isPityTriggered ? 1 : 0,
      new Date().toISOString(),
      result,
      isPityTriggered ? 1 : 0,
      new Date().toISOString()
    ).run();

    return jsonResponse(request, { success: true });

  } catch (error) {
    console.error('Save history error:', error);
    return jsonResponse(request, { error: '保存历史记录失败' }, 500);
  }
});

/**
 * 删除历史记录
 */
router.delete('/api/history/:date', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const { date } = request.params;

    await env.DB.prepare(
      'DELETE FROM spin_history WHERE user_id = ? AND date = ?'
    ).bind(authResult.userId, date).run();

    return jsonResponse(request, { success: true });

  } catch (error) {
    console.error('Delete history error:', error);
    return jsonResponse(request, { error: '删除历史记录失败' }, 500);
  }
});

/**
 * 保存每日抽取次数
 */
router.post('/api/daily-count', async (request, env) => {
  try {
    const authResult = await authenticateRequest(request, env);
    if (!authResult.valid) {
      return jsonResponse(request, { error: authResult.error }, 401);
    }

    const { date, count } = await request.json();

    await env.DB.prepare(
      `UPDATE spin_history SET spin_count = ?
       WHERE user_id = ? AND date = ?`
    ).bind(count, authResult.userId, date).run();

    return jsonResponse(request, { success: true });

  } catch (error) {
    console.error('Save daily count error:', error);
    return jsonResponse(request, { error: '保存次数失败' }, 500);
  }
});

// 404 处理
router.all('*', (request) => jsonResponse(request, { error: 'Not Found' }, 404));

/**
 * 主处理函数
 */
export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    try {
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Unhandled error:', error);
      return jsonResponse(request, { error: '服务器内部错误' }, 500);
    }
  }
};

/**
 * 辅助函数
 */

// 认证请求
async function authenticateRequest(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: '缺少认证令牌' };
  }

  const token = authHeader.substring(7);
  const payload = await validateToken(token, env.JWT_SECRET);

  if (!payload) {
    return { valid: false, error: '无效的认证令牌' };
  }

  return { valid: true, userId: payload.userId };
}

// JSON响应
function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request)
    }
  });
}

// 邮箱验证
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 设置验证
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;

  if (typeof settings.luProbability === 'number') {
    if (settings.luProbability < 1 || settings.luProbability > 98) {
      return false;
    }
  }

  if (typeof settings.pityDays === 'number') {
    if (settings.pityDays < 0 || settings.pityDays > 365) {
      return false;
    }
  }

  return true;
}
