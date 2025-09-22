// Cloudflare Workers 后端 API
import bcrypt from 'bcryptjs';
import jwt from '@tsndr/cloudflare-worker-jwt';

// 数据库初始化 SQL
const DB_INIT_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pity_days INTEGER DEFAULT 0,
    lu_probability INTEGER DEFAULT 1,
    multi_mode BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Spin history table
CREATE TABLE IF NOT EXISTS spin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    result VARCHAR(20) NOT NULL,
    spin_count INTEGER DEFAULT 1,
    is_pity_triggered BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Daily spin counts table
CREATE TABLE IF NOT EXISTS daily_spin_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spin_history_user_date ON spin_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_spin_counts_user_date ON daily_spin_counts(user_id, date);
`;

// CORS 配置
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 响应帮助函数
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}

function successResponse(data, message = null) {
  return jsonResponse({ success: true, data, ...(message && { message }) });
}

// JWT 验证中间件
async function verifyToken(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未提供认证令牌');
  }

  const token = authHeader.substring(7);
  try {
    const isValid = await jwt.verify(token, env.JWT_SECRET);
    if (!isValid) {
      throw new Error('无效的认证令牌');
    }

    const payload = jwt.decode(token);
    return payload.payload;
  } catch (error) {
    throw new Error('认证令牌验证失败');
  }
}

// 用户认证相关
async function handleRegister(request, env) {
  try {
    const { username, email, password } = await request.json();
    
    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }
    
    if (username.length < 3 || username.length > 50) {
      return errorResponse('用户名长度应为3-50个字符');
    }
    
    if (password.length < 6) {
      return errorResponse('密码长度不能少于6个字符');
    }

    // 检查用户名是否已存在
    const existingUser = await env.D1_DATABASE.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first();
    
    if (existingUser) {
      return errorResponse('用户名已存在');
    }

    // 检查邮箱是否已存在（如果提供了邮箱）
    if (email) {
      const existingEmail = await env.D1_DATABASE.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();
      
      if (existingEmail) {
        return errorResponse('邮箱已存在');
      }
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await env.D1_DATABASE.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username'
    ).bind(username, email || null, passwordHash).first();

    // 创建默认设置
    await env.D1_DATABASE.prepare(
      'INSERT INTO user_settings (user_id, pity_days, lu_probability, multi_mode) VALUES (?, 0, 1, FALSE)'
    ).bind(result.id).run();

    // 生成JWT令牌
    const token = await jwt.sign(
      { userId: result.id, username: result.username },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse({
      token,
      user: { id: result.id, username: result.username }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('注册失败: ' + error.message, 500);
  }
}

async function handleLogin(request, env) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return errorResponse('用户名和密码不能为空');
    }

    // 查找用户
    const user = await env.D1_DATABASE.prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ?'
    ).bind(username).first();
    
    if (!user) {
      return errorResponse('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return errorResponse('用户名或密码错误');
    }

    // 生成JWT令牌
    const token = await jwt.sign(
      { userId: user.id, username: user.username },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse({
      token,
      user: { id: user.id, username: user.username }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('登录失败: ' + error.message, 500);
  }
}

async function handleLogout(request, env) {
  // 在无状态架构中，logout主要是客户端操作
  // 这里可以实现令牌黑名单等功能
  return successResponse(null, '登出成功');
}

// 设置相关
async function handleGetSettings(request, env) {
  try {
    const user = await verifyToken(request, env);
    
    const settings = await env.D1_DATABASE.prepare(
      'SELECT pity_days, lu_probability, multi_mode FROM user_settings WHERE user_id = ?'
    ).bind(user.userId).first();
    
    if (!settings) {
      return errorResponse('未找到用户设置', 404);
    }

    return successResponse({
      pityDays: settings.pity_days,
      luProbability: settings.lu_probability,
      multiMode: settings.multi_mode
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    return errorResponse(error.message, 401);
  }
}

async function handleSaveSettings(request, env) {
  try {
    const user = await verifyToken(request, env);
    const { pityDays, luProbability, multiMode } = await request.json();
    
    // 验证设置值
    if (typeof pityDays !== 'number' || pityDays < 0 || pityDays > 365) {
      return errorResponse('保底天数应在0-365之间');
    }
    
    if (typeof luProbability !== 'number' || luProbability < 1 || luProbability > 98) {
      return errorResponse('Lu概率应在1-98之间');
    }

    await env.D1_DATABASE.prepare(`
      UPDATE user_settings 
      SET pity_days = ?, lu_probability = ?, multi_mode = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(pityDays, luProbability, multiMode, user.userId).run();

    return successResponse({
      pityDays,
      luProbability,
      multiMode
    });
    
  } catch (error) {
    console.error('Save settings error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('保存设置失败: ' + error.message, 500);
  }
}

// 历史记录相关
async function handleGetHistory(request, env) {
  try {
    const user = await verifyToken(request, env);
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    
    let query = 'SELECT date, result FROM spin_history WHERE user_id = ?';
    let params = [user.userId];
    
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    
    const results = await env.D1_DATABASE.prepare(query).bind(...params).all();
    
    if (date) {
      const record = results.results[0];
      return successResponse(record ? { [record.date]: record.result } : {});
    }
    
    const history = {};
    results.results.forEach(record => {
      history[record.date] = record.result;
    });
    
    return successResponse(history);
    
  } catch (error) {
    console.error('Get history error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('获取历史记录失败: ' + error.message, 500);
  }
}

async function handleSaveHistory(request, env) {
  try {
    const user = await verifyToken(request, env);
    const { date, result, isPityTriggered } = await request.json();
    
    if (!date || !result) {
      return errorResponse('日期和结果不能为空');
    }
    
    if (!['success', 'failure'].includes(result)) {
      return errorResponse('结果值无效');
    }

    // 使用 INSERT OR REPLACE 来处理重复记录
    await env.D1_DATABASE.prepare(`
      INSERT OR REPLACE INTO spin_history (user_id, date, result, is_pity_triggered)
      VALUES (?, ?, ?, ?)
    `).bind(user.userId, date, result, isPityTriggered || false).run();

    return successResponse({ date, result, isPityTriggered: isPityTriggered || false });
    
  } catch (error) {
    console.error('Save history error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('保存历史记录失败: ' + error.message, 500);
  }
}

async function handleUpdateHistory(request, env, date) {
  try {
    const user = await verifyToken(request, env);
    const { result } = await request.json();
    
    if (!result || !['success', 'failure'].includes(result)) {
      return errorResponse('结果值无效');
    }

    const updateResult = await env.D1_DATABASE.prepare(
      'UPDATE spin_history SET result = ? WHERE user_id = ? AND date = ?'
    ).bind(result, user.userId, date).run();
    
    if (updateResult.changes === 0) {
      return errorResponse('未找到指定日期的记录', 404);
    }

    return successResponse({ date, result });
    
  } catch (error) {
    console.error('Update history error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('更新历史记录失败: ' + error.message, 500);
  }
}

async function handleDeleteHistory(request, env, date) {
  try {
    const user = await verifyToken(request, env);
    
    const deleteResult = await env.D1_DATABASE.prepare(
      'DELETE FROM spin_history WHERE user_id = ? AND date = ?'
    ).bind(user.userId, date).run();
    
    if (deleteResult.changes === 0) {
      return errorResponse('未找到指定日期的记录', 404);
    }

    return successResponse(null, '历史记录删除成功');
    
  } catch (error) {
    console.error('Delete history error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('删除历史记录失败: ' + error.message, 500);
  }
}

// 抽取次数相关
async function handleGetSpinCount(request, env) {
  try {
    const user = await verifyToken(request, env);
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const record = await env.D1_DATABASE.prepare(
      'SELECT date, count FROM daily_spin_counts WHERE user_id = ? AND date = ?'
    ).bind(user.userId, date).first();
    
    return successResponse({
      date,
      count: record ? record.count : 0
    });
    
  } catch (error) {
    console.error('Get spin count error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('获取抽取次数失败: ' + error.message, 500);
  }
}

async function handleUpdateSpinCount(request, env) {
  try {
    const user = await verifyToken(request, env);
    const { date, count } = await request.json();
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    if (typeof count !== 'number' || count < 0) {
      return errorResponse('抽取次数必须为非负数');
    }

    await env.D1_DATABASE.prepare(`
      INSERT OR REPLACE INTO daily_spin_counts (user_id, date, count, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(user.userId, targetDate, count).run();

    return successResponse({ date: targetDate, count });
    
  } catch (error) {
    console.error('Update spin count error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('更新抽取次数失败: ' + error.message, 500);
  }
}

// 数据同步相关
async function handleExportData(request, env) {
  try {
    const user = await verifyToken(request, env);
    
    // 获取用户设置
    const settings = await env.D1_DATABASE.prepare(
      'SELECT pity_days, lu_probability, multi_mode FROM user_settings WHERE user_id = ?'
    ).bind(user.userId).first();
    
    // 获取历史记录
    const historyResults = await env.D1_DATABASE.prepare(
      'SELECT date, result FROM spin_history WHERE user_id = ?'
    ).bind(user.userId).all();
    
    const history = {};
    historyResults.results.forEach(record => {
      history[record.date] = record.result;
    });
    
    return successResponse({
      history,
      settings: {
        pityDays: settings?.pity_days || 0,
        luProbability: settings?.lu_probability || 1,
        multiMode: settings?.multi_mode || false
      },
      exportDate: new Date().toISOString(),
      version: '2.0'
    });
    
  } catch (error) {
    console.error('Export data error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('导出数据失败: ' + error.message, 500);
  }
}

async function handleImportData(request, env) {
  try {
    const user = await verifyToken(request, env);
    const { history, settings } = await request.json();
    
    if (!history || typeof history !== 'object') {
      return errorResponse('历史记录数据格式无效');
    }
    
    // 开始事务（D1不直接支持事务，但我们尽量保持原子性）
    try {
      // 导入设置
      if (settings && typeof settings === 'object') {
        await env.D1_DATABASE.prepare(`
          UPDATE user_settings 
          SET pity_days = ?, lu_probability = ?, multi_mode = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).bind(
          settings.pityDays || 0,
          settings.luProbability || 1,
          settings.multiMode || false,
          user.userId
        ).run();
      }
      
      // 导入历史记录
      for (const [date, result] of Object.entries(history)) {
        if (['success', 'failure'].includes(result)) {
          await env.D1_DATABASE.prepare(`
            INSERT OR REPLACE INTO spin_history (user_id, date, result, is_pity_triggered)
            VALUES (?, ?, ?, FALSE)
          `).bind(user.userId, date, result).run();
        }
      }
      
      return successResponse(null, '数据导入成功');
      
    } catch (importError) {
      console.error('Import transaction error:', importError);
      return errorResponse('数据导入过程中发生错误: ' + importError.message, 500);
    }
    
  } catch (error) {
    console.error('Import data error:', error);
    if (error.message === '未提供认证令牌' || error.message.includes('认证')) {
      return errorResponse(error.message, 401);
    }
    return errorResponse('导入数据失败: ' + error.message, 500);
  }
}

// 健康检查
async function handlePing() {
  return successResponse({ message: 'pong' });
}

// 数据库初始化
async function initDatabase(env) {
  try {
    const statements = DB_INIT_SQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await env.D1_DATABASE.prepare(statement).run();
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 初始化数据库
    try {
      await initDatabase(env);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return errorResponse('数据库初始化失败', 500);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // 路由处理
      if (path === '/api/ping' && method === 'GET') {
        return handlePing();
      }
      
      // 认证相关路由
      if (path === '/api/auth/register' && method === 'POST') {
        return handleRegister(request, env);
      }
      if (path === '/api/auth/login' && method === 'POST') {
        return handleLogin(request, env);
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        return handleLogout(request, env);
      }
      
      // 设置相关路由
      if (path === '/api/settings' && method === 'GET') {
        return handleGetSettings(request, env);
      }
      if (path === '/api/settings' && method === 'PUT') {
        return handleSaveSettings(request, env);
      }
      
      // 历史记录相关路由
      if (path === '/api/history' && method === 'GET') {
        return handleGetHistory(request, env);
      }
      if (path === '/api/history' && method === 'POST') {
        return handleSaveHistory(request, env);
      }
      if (path.startsWith('/api/history/') && method === 'PUT') {
        const date = path.split('/').pop();
        return handleUpdateHistory(request, env, date);
      }
      if (path.startsWith('/api/history/') && method === 'DELETE') {
        const date = path.split('/').pop();
        return handleDeleteHistory(request, env, date);
      }
      
      // 抽取次数相关路由
      if (path === '/api/spin-count' && method === 'GET') {
        return handleGetSpinCount(request, env);
      }
      if (path === '/api/spin-count' && method === 'POST') {
        return handleUpdateSpinCount(request, env);
      }
      
      // 数据同步相关路由
      if (path === '/api/sync/export' && method === 'POST') {
        return handleExportData(request, env);
      }
      if (path === '/api/sync/import' && method === 'POST') {
        return handleImportData(request, env);
      }
      
      // 404 处理
      return errorResponse('API路径不存在', 404);
      
    } catch (error) {
      console.error('Request handling error:', error);
      return errorResponse('服务器内部错误', 500);
    }
  },
};