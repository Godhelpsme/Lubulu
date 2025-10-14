/**
 * 简化存储管理器
 * 遵循KISS原则：只使用localStorage，不需要复杂的策略模式
 */

// 存储键名常量
const STORAGE_PREFIX = 'lubulu_';
const KEYS = {
  SETTINGS: 'settings',
  HISTORY: 'spinHistory',
  DAILY_COUNTS: 'dailySpinCounts',
  PITY_COUNTER: 'pityCounter',
  APP_STATE: 'app_state_v2'
};

/**
 * 简单存储管理器
 */
export class StorageManager {
  constructor() {
    this.defaults = {
      [KEYS.SETTINGS]: {
        luProbability: 1,
        pityDays: 0,
        multiMode: false,
        soundEnabled: true,
        animationEnabled: true
      },
      [KEYS.HISTORY]: {},
      [KEYS.DAILY_COUNTS]: {},
      [KEYS.PITY_COUNTER]: {
        threshold: 0,
        consecutiveFails: 0
      }
    };
  }

  /**
   * 获取完整的存储键名
   */
  _getKey(key) {
    return STORAGE_PREFIX + key;
  }

  /**
   * 从localStorage获取数据
   */
  _get(key) {
    try {
      const item = localStorage.getItem(this._getKey(key));
      if (item) {
        return JSON.parse(item);
      }
      return this.defaults[key] || null;
    } catch (error) {
      console.error('Storage get failed:', error);
      return this.defaults[key] || null;
    }
  }

  /**
   * 保存数据到localStorage
   */
  _set(key, value) {
    try {
      localStorage.setItem(this._getKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set failed:', error);
      return false;
    }
  }

  // === 设置相关 ===
  async getSettings() {
    return this._get(KEYS.SETTINGS);
  }

  async saveSettings(settings) {
    return this._set(KEYS.SETTINGS, settings);
  }

  // === 历史记录相关 ===
  async getHistory() {
    return this._get(KEYS.HISTORY);
  }

  async saveHistoryRecord(date, result, isPityTriggered = false) {
    const history = this._get(KEYS.HISTORY) || {};

    if (!history[date]) {
      history[date] = {
        result,
        spinCount: 1,
        isPityTriggered,
        timestamp: new Date().toISOString()
      };
    } else {
      history[date].result = result;
      history[date].spinCount = (history[date].spinCount || 1) + 1;
      history[date].isPityTriggered = isPityTriggered;
      history[date].timestamp = new Date().toISOString();
    }

    return this._set(KEYS.HISTORY, history);
  }

  async deleteHistoryRecord(date) {
    const history = this._get(KEYS.HISTORY) || {};
    delete history[date];
    return this._set(KEYS.HISTORY, history);
  }

  // === 每日次数相关 ===
  async getDailyCount(date) {
    const counts = this._get(KEYS.DAILY_COUNTS) || {};
    return counts[date] || 0;
  }

  async updateDailyCount(date, count) {
    const counts = this._get(KEYS.DAILY_COUNTS) || {};
    counts[date] = count;
    return this._set(KEYS.DAILY_COUNTS, counts);
  }

  // === 保底计数器相关 ===
  async getPityCounter() {
    return this._get(KEYS.PITY_COUNTER);
  }

  async savePityCounter(counter) {
    return this._set(KEYS.PITY_COUNTER, counter);
  }

  // === 应用状态相关 ===
  async getAppState() {
    return this._get(KEYS.APP_STATE);
  }

  async saveAppState(state) {
    return this._set(KEYS.APP_STATE, state);
  }

  // === 数据导入导出 ===
  async exportData() {
    return {
      settings: this._get(KEYS.SETTINGS),
      history: this._get(KEYS.HISTORY),
      dailyCounts: this._get(KEYS.DAILY_COUNTS),
      pityCounter: this._get(KEYS.PITY_COUNTER),
      exportDate: new Date().toISOString()
    };
  }

  async importData(data) {
    try {
      if (data.settings) this._set(KEYS.SETTINGS, data.settings);
      if (data.history) this._set(KEYS.HISTORY, data.history);
      if (data.dailyCounts) this._set(KEYS.DAILY_COUNTS, data.dailyCounts);
      if (data.pityCounter) this._set(KEYS.PITY_COUNTER, data.pityCounter);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  // === 清除数据 ===
  async clearAll() {
    try {
      Object.values(KEYS).forEach(key => {
        localStorage.removeItem(this._getKey(key));
      });
      return true;
    } catch (error) {
      console.error('Clear all failed:', error);
      return false;
    }
  }
}

// 导出存储键常量
export const STORAGE_KEYS = KEYS;