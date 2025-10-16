/**
 * 数据存储服务
 * 使用 D1 (SQLite) + KV
 */

/**
 * KV 存储管理 - 用于配置和快速读取
 */
export class KVStorage {
  constructor(kv) {
    this.kv = kv;
  }

  // === 用户设置 ===
  async getSettings(userId) {
    const key = `user:${userId}:settings`;
    const value = await this.kv.get(key, 'json');
    return value || {
      luProbability: 1,
      pityDays: 0,
      multiMode: false
    };
  }

  async saveSettings(userId, settings) {
    const key = `user:${userId}:settings`;
    await this.kv.put(key, JSON.stringify(settings));
  }

  // === 保底计数器 ===
  async getPityCounter(userId) {
    const key = `user:${userId}:pity`;
    const value = await this.kv.get(key, 'json');
    return value || {
      consecutiveFails: 0,
      threshold: 0
    };
  }

  async savePityCounter(userId, counter) {
    const key = `user:${userId}:pity`;
    await this.kv.put(key, JSON.stringify(counter));
  }
}

/**
 * D1 数据库管理 - 用于历史记录
 */
export class D1Storage {
  constructor(db) {
    this.db = db;
  }

  // === 历史记录 ===
  async getHistory(userId, limit = 100) {
    const stmt = this.db.prepare(
      'SELECT * FROM spin_history WHERE user_id = ? ORDER BY date DESC LIMIT ?'
    );
    const { results } = await stmt.bind(userId, limit).all();

    // 转换为对象格式 { 'YYYY-MM-DD': { result, isPityTriggered, timestamp } }
    const history = {};
    results.forEach(row => {
      history[row.date] = {
        result: row.result,
        isPityTriggered: Boolean(row.is_pity),  // is_pity 现在是 BOOLEAN
        timestamp: new Date(row.timestamp * 1000).toISOString()
      };
    });

    return history;
  }

  /**
   * 保存历史记录 - 带重试机制处理并发冲突
   */
  async saveHistoryRecord(userId, date, result, isPityTriggered = false, maxRetries = 3) {
    const stmt = this.db.prepare(`
      INSERT INTO spin_history (user_id, date, result, is_pity, timestamp)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date)
      DO UPDATE SET result = ?, is_pity = ?, timestamp = ?
    `);

    const timestamp = Math.floor(Date.now() / 1000);

    // 指数退避重试
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await stmt.bind(
          userId, date, result, isPityTriggered, timestamp,
          result, isPityTriggered, timestamp
        ).run();
        return; // 成功,退出
      } catch (error) {
        // 如果是 UNIQUE 约束冲突且还有重试次数,继续重试
        if (error.message.includes('UNIQUE constraint') && attempt < maxRetries - 1) {
          const backoffMs = 50 * Math.pow(2, attempt); // 50ms, 100ms, 200ms
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        // 其他错误或重试耗尽,抛出
        throw error;
      }
    }
  }

  async deleteHistoryRecord(userId, date) {
    const stmt = this.db.prepare(
      'DELETE FROM spin_history WHERE user_id = ? AND date = ?'
    );
    await stmt.bind(userId, date).run();
  }

  // === 统计数据 ===
  async getStats(userId) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = 'lu' THEN 1 ELSE 0 END) as lu_count,
        SUM(CASE WHEN result = 'no_lu' THEN 1 ELSE 0 END) as no_lu_count
      FROM spin_history
      WHERE user_id = ?
    `);

    const { results } = await stmt.bind(userId).all();
    const stats = results[0] || { total: 0, lu_count: 0, no_lu_count: 0 };

    return {
      total: stats.total,
      luCount: stats.lu_count,
      noLuCount: stats.no_lu_count,
      successRate: stats.total > 0
        ? ((stats.no_lu_count / stats.total) * 100).toFixed(1)
        : '0.0'
    };
  }
}
