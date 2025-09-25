/**
 * Lubulu 存储管理模块
 * 统一管理本地存储和云端同步
 */

import { validateSettings, ErrorHandler, Analytics } from '../utils/helpers.js';

/**
 * 本地存储管理器
 */
class LocalStorageManager {
  constructor() {
    this.prefix = 'lubulu_';
  }

  /**
   * 获取存储的key
   * @param {string} key - 原始key
   * @returns {string} 带前缀的key
   */
  getKey(key) {
    return this.prefix + key;
  }

  /**
   * 设置数据
   * @param {string} key - 键
   * @param {*} value - 值
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      console.error('LocalStorage set failed:', error);
      return false;
    }
  }

  /**
   * 获取数据
   * @param {string} key - 键
   * @param {*} defaultValue - 默认值
   * @returns {*} 存储的值或默认值
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('LocalStorage get failed:', error);
      return defaultValue;
    }
  }

  /**
   * 删除数据
   * @param {string} key - 键
   */
  remove(key) {
    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error('LocalStorage remove failed:', error);
      return false;
    }
  }

  /**
   * 清除所有数据
   */
  clear() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('LocalStorage clear failed:', error);
      return false;
    }
  }

  /**
   * 检查存储空间是否可用
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    try {
      const testKey = this.getKey('test');
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 同步管理器
 */
class SyncManager {
  constructor(api) {
    this.api = api;
    this.syncQueue = new Map();
    this.isOnline = navigator.onLine;
    this.syncInterval = 5 * 60 * 1000; // 5分钟
    this.lastSyncTime = 0;
    
    this.bindEvents();
  }

  /**
   * 绑定网络状态事件
   */
  bindEvents() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * 添加到同步队列
   * @param {string} action - 操作类型
   * @param {*} data - 数据
   */
  addToSyncQueue(action, data) {
    const id = Date.now().toString();
    this.syncQueue.set(id, {
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    Analytics.trackEvent('sync_queued', { action });
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.size === 0) return;

    const items = Array.from(this.syncQueue.entries());
    
    for (const [id, item] of items) {
      try {
        await this.processSyncItem(item);
        this.syncQueue.delete(id);
        Analytics.trackEvent('sync_success', { action: item.action });
      } catch (error) {
        console.error(`Sync failed for ${item.action}:`, error);
        item.retryCount++;
        
        // 最多重试3次
        if (item.retryCount >= 3) {
          this.syncQueue.delete(id);
          Analytics.trackEvent('sync_failed', { 
            action: item.action, 
            retryCount: item.retryCount 
          });
        }
      }
    }
  }

  /**
   * 处理单个同步项
   */
  async processSyncItem(item) {
    switch (item.action) {
      case 'saveSettings':
        return await this.api.saveSettings(item.data);
      case 'saveHistoryRecord':
        return await this.api.saveHistoryRecord(item.data.date, item.data.result, item.data.isPityTriggered);
      case 'saveDailyCount':
        return await this.api.saveDailySpinCount(item.data.date, item.data.count);
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  /**
   * 智能同步
   */
  async smartSync() {
    const now = Date.now();
    if (now - this.lastSyncTime < this.syncInterval) {
      return; // 避免频繁同步
    }
    
    this.lastSyncTime = now;
    await this.processSyncQueue();
  }
}

/**
 * 统一存储管理器
 */
export class StorageManager {
  constructor(api = null) {
    this.localStorage = new LocalStorageManager();
    this.syncManager = api ? new SyncManager(api) : null;
    this.api = api;
    this.isLoggedIn = !!api?.token;
    this.isGuestMode = false;
    
    // 默认设置
    this.defaultSettings = {
      pityDays: 0,
      luProbability: 1,
      multiMode: false,
      soundEnabled: true,
      animationEnabled: true
    };
  }

  /**
   * 设置API实例
   * @param {Object} api - API实例
   */
  setApi(api) {
    this.api = api;
    if (api) {
      this.syncManager = new SyncManager(api);
      this.isLoggedIn = !!api.token;
    } else {
      this.syncManager = null;
      this.isLoggedIn = false;
    }
  }

  /**
   * 设置登录状态
   * @param {boolean} isLoggedIn - 是否已登录
   */
  setLoginStatus(isLoggedIn) {
    this.isLoggedIn = isLoggedIn;
    if (!isLoggedIn) {
      this.isGuestMode = false;
      this.api = null;
      this.syncManager = null;
    }
  }

  /**
   * 设置游客模式
   * @param {boolean} isGuest - 是否为游客模式
   */
  setGuestMode(isGuest) {
    this.isGuestMode = isGuest;
    if (isGuest) {
      this.isLoggedIn = false;
    }
  }

  /**
   * 获取设置
   * @returns {Promise<Object>} 设置对象
   */
  async getSettings() {
    // 游客模式直接使用本地数据
    if (this.isGuestMode) {
      return this.localStorage.get('settings', this.defaultSettings);
    }

    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        const cloudSettings = await this.api.getSettings();
        // 同步到本地作为缓存
        this.localStorage.set('settings', cloudSettings);
        return cloudSettings;
      } catch (error) {
        console.warn('Failed to get cloud settings, using local:', error.message);
      }
    }
    
    // 使用本地设置作为后备
    return this.localStorage.get('settings', this.defaultSettings);
  }

  /**
   * 保存设置
   * @param {Object} settings - 设置对象
   * @returns {Promise<Object>} 保存后的设置
   */
  async saveSettings(settings) {
    // 验证设置
    try {
      validateSettings(settings);
    } catch (error) {
      throw new Error(ErrorHandler.getFriendlyErrorMessage(error));
    }

    // 立即保存到本地
    const success = this.localStorage.set('settings', settings);
    if (!success) {
      throw new Error('本地保存失败，请检查存储空间');
    }
    
    // 游客模式只保存到本地
    if (this.isGuestMode) {
      Analytics.trackEvent('settings_saved_local', settings);
      return settings;
    }
    
    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        await this.api.saveSettings(settings);
        Analytics.trackEvent('settings_saved_cloud', settings);
      } catch (error) {
        console.warn('Failed to save settings to cloud, queued for sync:', error.message);
        this.syncManager?.addToSyncQueue('saveSettings', settings);
      }
    } else if (this.isLoggedIn && this.syncManager) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('saveSettings', settings);
    }

    return settings;
  }

  /**
   * 获取历史记录
   * @returns {Promise<Object>} 历史记录对象
   */
  async getHistory() {
    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        const cloudHistory = await this.api.getHistory();
        // 同步到本地作为缓存
        this.localStorage.set('spinHistory', cloudHistory);
        return cloudHistory;
      } catch (error) {
        console.warn('Failed to get cloud history, using local:', error.message);
      }
    }
    
    // 使用本地历史作为后备
    return this.localStorage.get('spinHistory', {});
  }

  /**
   * 保存历史记录
   * @param {string} date - 日期
   * @param {string} result - 结果
   * @param {boolean} isPityTriggered - 是否触发保底
   * @returns {Promise<void>}
   */
  async saveHistoryRecord(date, result, isPityTriggered = false) {
    // 获取当前历史记录
    const history = this.localStorage.get('spinHistory', {});
    
    // 更新记录
    if (!history[date]) {
      history[date] = {
        result,
        spinCount: 1,
        isPityTriggered,
        timestamp: new Date().toISOString()
      };
    } else {
      // 如果已有记录，更新相关信息
      history[date].result = result;
      history[date].isPityTriggered = isPityTriggered;
      history[date].timestamp = new Date().toISOString();
    }
    
    // 保存到本地
    this.localStorage.set('spinHistory', history);
    
    // 云端同步
    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        await this.api.saveHistoryRecord(date, result, isPityTriggered);
      } catch (error) {
        console.warn('Failed to save history to cloud, queued for sync:', error.message);
        this.syncManager?.addToSyncQueue('saveHistoryRecord', {
          date, result, isPityTriggered
        });
      }
    } else if (this.isLoggedIn && this.syncManager) {
      this.syncManager.addToSyncQueue('saveHistoryRecord', {
        date, result, isPityTriggered
      });
    }

    Analytics.trackEvent('history_saved', { date, result, isPityTriggered });
  }

  /**
   * 更新历史记录（用于编辑功能）
   * @param {string} date - 日期
   * @param {string} result - 新结果
   * @returns {Promise<void>}
   */
  async updateHistoryRecord(date, result) {
    const history = this.localStorage.get('spinHistory', {});
    
    if (result === null || result === undefined) {
      // 删除记录
      delete history[date];
    } else {
      // 更新记录
      if (!history[date]) {
        history[date] = {
          result,
          spinCount: 1,
          isPityTriggered: false,
          timestamp: new Date().toISOString()
        };
      } else {
        history[date].result = result;
        history[date].timestamp = new Date().toISOString();
      }
    }
    
    this.localStorage.set('spinHistory', history);

    // 云端同步
    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        if (result === null || result === undefined) {
          await this.api.deleteHistoryRecord(date);
        } else {
          await this.api.saveHistoryRecord(date, result, false);
        }
      } catch (error) {
        console.warn('Failed to update history in cloud:', error.message);
      }
    }

    Analytics.trackEvent('history_updated', { date, result });
  }

  /**
   * 获取每日抽取次数
   * @param {string} date - 日期
   * @returns {Promise<number>} 抽取次数
   */
  async getDailySpinCount(date) {
    const counts = this.localStorage.get('dailySpinCounts', {});
    return counts[date] || 0;
  }

  /**
   * 保存每日抽取次数
   * @param {string} date - 日期
   * @param {number} count - 次数
   * @returns {Promise<void>}
   */
  async saveDailySpinCount(date, count) {
    const counts = this.localStorage.get('dailySpinCounts', {});
    counts[date] = count;
    this.localStorage.set('dailySpinCounts', counts);

    // 云端同步
    if (this.isLoggedIn && navigator.onLine && this.api) {
      try {
        await this.api.saveDailySpinCount(date, count);
      } catch (error) {
        this.syncManager?.addToSyncQueue('saveDailyCount', { date, count });
      }
    } else if (this.isLoggedIn && this.syncManager) {
      this.syncManager.addToSyncQueue('saveDailyCount', { date, count });
    }
  }

  /**
   * 导出所有数据
   * @returns {Promise<Object>} 导出的数据
   */
  async exportData() {
    try {
      const data = {
        version: '2.0',
        exportTime: new Date().toISOString(),
        settings: await this.getSettings(),
        history: await this.getHistory(),
        dailySpinCounts: this.localStorage.get('dailySpinCounts', {}),
        stats: this.localStorage.get('stats', {})
      };

      Analytics.trackEvent('data_exported', {
        historyCount: Object.keys(data.history).length
      });

      return data;
    } catch (error) {
      throw new Error('导出数据失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 导入数据
   * @param {Object} data - 要导入的数据
   * @returns {Promise<void>}
   */
  async importData(data) {
    try {
      // 验证数据格式
      if (!data || typeof data !== 'object') {
        throw new Error('无效的数据格式');
      }

      // 备份当前数据
      const backup = await this.exportData();
      this.localStorage.set('backup_' + Date.now(), backup);

      // 导入数据
      if (data.settings) {
        await this.saveSettings(data.settings);
      }
      
      if (data.history) {
        this.localStorage.set('spinHistory', data.history);
      }
      
      if (data.dailySpinCounts) {
        this.localStorage.set('dailySpinCounts', data.dailySpinCounts);
      }

      Analytics.trackEvent('data_imported', {
        historyCount: Object.keys(data.history || {}).length
      });

      // 触发同步（如果已登录）
      if (this.isLoggedIn && this.syncManager) {
        await this.syncManager.smartSync();
      }
    } catch (error) {
      throw new Error('导入数据失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 清除所有数据
   * @returns {Promise<void>}
   */
  async clearAllData() {
    try {
      // 创建备份
      const backup = await this.exportData();
      this.localStorage.set('backup_' + Date.now(), backup);

      // 清除数据
      this.localStorage.clear();

      Analytics.trackEvent('data_cleared');
    } catch (error) {
      throw new Error('清除数据失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 检查存储状态
   * @returns {Object} 存储状态信息
   */
  checkStorageStatus() {
    return {
      localStorage: this.localStorage.isAvailable(),
      isOnline: navigator.onLine,
      isLoggedIn: this.isLoggedIn,
      isGuestMode: this.isGuestMode,
      syncQueueSize: this.syncManager?.syncQueue.size || 0
    };
  }

  /**
   * 获取游客数据的键名前缀
   * @returns {string} 游客数据前缀
   */
  getGuestDataPrefix() {
    return 'guest_';
  }

  /**
   * 备份当前数据到游客数据前缀
   */
  backupAsGuestData() {
    try {
      const currentData = {
        settings: this.localStorage.get('settings', {}),
        spinHistory: this.localStorage.get('spinHistory', {}),
        dailySpinCounts: this.localStorage.get('dailySpinCounts', {})
      };
      
      const prefix = this.getGuestDataPrefix();
      Object.entries(currentData).forEach(([key, value]) => {
        this.localStorage.set(prefix + key, value);
      });
      
      return true;
    } catch (error) {
      console.error('备份游客数据失败:', error);
      return false;
    }
  }

  /**
   * 恢复游客数据
   */
  restoreGuestData() {
    try {
      const prefix = this.getGuestDataPrefix();
      const guestData = {
        settings: this.localStorage.get(prefix + 'settings', {}),
        spinHistory: this.localStorage.get(prefix + 'spinHistory', {}),
        dailySpinCounts: this.localStorage.get(prefix + 'dailySpinCounts', {})
      };
      
      // 如果有游客数据，则恢复
      if (Object.keys(guestData.settings).length > 0 || 
          Object.keys(guestData.spinHistory).length > 0) {
        Object.entries(guestData).forEach(([key, value]) => {
          if (Object.keys(value).length > 0) {
            this.localStorage.set(key, value);
          }
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('恢复游客数据失败:', error);
      return false;
    }
  }

  /**
   * 清除游客数据备份
   */
  clearGuestDataBackup() {
    try {
      const prefix = this.getGuestDataPrefix();
      const keys = ['settings', 'spinHistory', 'dailySpinCounts'];
      keys.forEach(key => {
        this.localStorage.remove(prefix + key);
      });
      return true;
    } catch (error) {
      console.error('清除游客数据备份失败:', error);
      return false;
    }
  }

  /**
   * 获取用户数据统计信息
   * @returns {Object} 数据统计信息
   */
  getDataStatistics() {
    try {
      const settings = this.localStorage.get('settings', {});
      const history = this.localStorage.get('spinHistory', {});
      const dailySpinCounts = this.localStorage.get('dailySpinCounts', {});
      
      return {
        hasSettings: Object.keys(settings).length > 0,
        historyCount: Object.keys(history).length,
        dailyCountsCount: Object.keys(dailySpinCounts).length,
        totalRecords: Object.keys(history).length + Object.keys(dailySpinCounts).length,
        storageSize: this.estimateStorageSize()
      };
    } catch (error) {
      console.error('获取数据统计失败:', error);
      return {
        hasSettings: false,
        historyCount: 0,
        dailyCountsCount: 0,
        totalRecords: 0,
        storageSize: 0
      };
    }
  }

  /**
   * 估算存储使用大小（字节）
   * @returns {number} 存储大小
   */
  estimateStorageSize() {
    try {
      let totalSize = 0;
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.localStorage.prefix)
      );
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      });
      
      return totalSize;
    } catch (error) {
      console.error('估算存储大小失败:', error);
      return 0;
    }
  }

  /**
   * 销毁存储管理器
   */
  destroy() {
    this.localStorage = null;
    this.syncManager = null;
    this.api = null;
  }
}