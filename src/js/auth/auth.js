/**
 * Lubulu 用户认证模块 (增强版)
 * 提供用户注册、登录、注销等功能
 * 集成API健康检查和降级机制
 */

import { ErrorHandler, Analytics, sanitizeInput } from '../utils/helpers.js';
import { apiClient } from '../api/api-client.js';

/**
 * 用户认证管理器
 */
export class AuthManager {
  constructor() {
    this.user = null;
    this.isLoggedIn = false;
    this.isGuestMode = false;
    this.apiClient = apiClient;
    this.listeners = new Set();
    this.isApiAvailable = false;

    // 检查本地存储的登录状态
    this.checkStoredAuth();
  }

  /**
   * 初始化认证管理器
   */
  async init() {
    try {
      // 检查API健康状态
      this.isApiAvailable = await this.apiClient.checkHealth();

      if (!this.isApiAvailable) {
        console.warn('API暂时不可用，将使用本地模式');
        Analytics.trackEvent('api_unavailable_at_init');
      }

      // 验证存储的认证信息
      if (this.isLoggedIn && this.isApiAvailable) {
        try {
          await this.validateStoredAuth();
        } catch (error) {
          console.warn('令牌验证失败，将保持离线模式');
          // 不自动登出，允许用户继续使用本地数据
        }
      }

      Analytics.trackEvent('auth_manager_initialized', {
        isLoggedIn: this.isLoggedIn,
        isGuestMode: this.isGuestMode,
        isApiAvailable: this.isApiAvailable
      });
    } catch (error) {
      console.warn('认证初始化失败:', error.message);
      // 不自动登出，让用户继续使用本地模式
      this.isApiAvailable = false;
    }
  }

  /**
   * 检查本地存储的认证信息
   */
  checkStoredAuth() {
    try {
      const userStr = localStorage.getItem('lubulu_user');
      const token = localStorage.getItem('lubulu_token');
      const guestMode = localStorage.getItem('lubulu_guest_mode') === 'true';

      if (guestMode) {
        this.isGuestMode = true;
        this.isLoggedIn = false;
        this.user = { username: '游客', isGuest: true };
      } else if (userStr && token) {
        this.user = JSON.parse(userStr);
        this.isLoggedIn = true;
        this.isGuestMode = false;
        this.apiClient.setToken(token);
      }
    } catch (error) {
      console.warn('读取本地认证信息失败:', error.message);
      this.clearStoredAuth();
    }
  }

  /**
   * 验证存储的认证信息
   */
  async validateStoredAuth() {
    if (!navigator.onLine) {
      // 离线状态下信任本地存储
      return true;
    }

    try {
      const token = localStorage.getItem('lubulu_token');
      if (!token) throw new Error('没有有效的认证令牌');

      this.apiClient.setToken(token);
      const userData = await this.apiClient.validateToken();
      this.user = userData.user;
      this.isApiAvailable = true;
      return true;
    } catch (error) {
      console.warn('认证验证失败:', error.message);
      this.apiClient.clearToken();
      this.isApiAvailable = false;
      throw error;
    }
  }

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    try {
      // 检查API是否可用
      if (!this.isApiAvailable) {
        this.isApiAvailable = await this.apiClient.checkHealth();
      }

      if (!this.isApiAvailable) {
        throw new Error('注册功能需要网络连接，请稍后重试');
      }

      const { username, password, email } = userData;

      // 输入验证
      if (!username || username.length < 3) {
        throw new Error('用户名至少需要3个字符');
      }
      if (!password || password.length < 6) {
        throw new Error('密码至少需要6个字符');
      }
      if (!email || !this.isValidEmail(email)) {
        throw new Error('请输入有效的邮箱地址');
      }

      // 清理输入
      const cleanUserData = {
        username: sanitizeInput(username).trim(),
        password: password,
        email: sanitizeInput(email).trim().toLowerCase()
      };

      const result = await this.apiClient.register(cleanUserData);

      // 注册成功后自动登录
      await this.handleAuthSuccess(result);

      Analytics.trackEvent('user_registered', {
        username: cleanUserData.username
      });

      return result;
    } catch (error) {
      Analytics.trackEvent('register_failed', {
        error: error.message
      });
      throw new Error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 用户登录
   * @param {Object} loginData - 登录数据
   * @returns {Promise<Object>} 登录结果
   */
  async login(loginData) {
    try {
      // 检查API是否可用
      if (!this.isApiAvailable) {
        this.isApiAvailable = await this.apiClient.checkHealth();
      }

      if (!this.isApiAvailable) {
        throw new Error('登录功能需要网络连接，请稍后重试或使用游客模式');
      }

      const { username, password } = loginData;

      if (!username || !password) {
        throw new Error('请输入用户名和密码');
      }

      const cleanLoginData = {
        username: sanitizeInput(username).trim(),
        password: password
      };

      const result = await this.apiClient.login(cleanLoginData);

      await this.handleAuthSuccess(result);

      Analytics.trackEvent('user_logged_in', {
        username: cleanLoginData.username
      });

      return result;
    } catch (error) {
      Analytics.trackEvent('login_failed', {
        error: error.message
      });
      throw new Error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 游客登录
   * @returns {Promise<void>}
   */
  async loginAsGuest() {
    try {
      this.user = { username: '游客', isGuest: true };
      this.isLoggedIn = false;
      this.isGuestMode = true;

      // 存储游客状态
      localStorage.setItem('lubulu_guest_mode', 'true');
      localStorage.removeItem('lubulu_user');
      localStorage.removeItem('lubulu_token');

      this.notifyListeners('guest_login', this.user);

      Analytics.trackEvent('guest_login');
    } catch (error) {
      throw new Error('游客登录失败');
    }
  }

  /**
   * 用户注销
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      const wasLoggedIn = this.isLoggedIn;

      if (wasLoggedIn && navigator.onLine && this.isApiAvailable) {
        try {
          await this.apiClient.logout();
        } catch (error) {
          console.warn('服务器注销失败:', error.message);
        }
      }

      // 清理本地状态
      this.clearStoredAuth();
      this.apiClient.clearToken();
      this.user = null;
      this.isLoggedIn = false;
      this.isGuestMode = false;

      this.notifyListeners('logout', null);

      Analytics.trackEvent('user_logged_out');
    } catch (error) {
      console.error('注销失败:', error.message);
      throw new Error('注销失败');
    }
  }

  /**
   * 处理认证成功
   * @param {Object} result - 认证结果
   */
  async handleAuthSuccess(result) {
    const { user, token } = result;

    this.user = user;
    this.isLoggedIn = true;
    this.isGuestMode = false;
    this.isApiAvailable = true;

    // 存储认证信息
    localStorage.setItem('lubulu_user', JSON.stringify(user));
    localStorage.setItem('lubulu_token', token);
    localStorage.removeItem('lubulu_guest_mode');

    // 设置API客户端令牌
    this.apiClient.setToken(token);

    this.notifyListeners('login_success', user);
  }

  /**
   * 清理存储的认证信息
   */
  clearStoredAuth() {
    localStorage.removeItem('lubulu_user');
    localStorage.removeItem('lubulu_token');
    localStorage.removeItem('lubulu_guest_mode');
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱地址
   * @returns {boolean} 是否有效
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 获取当前用户信息
   * @returns {Object|null} 用户信息
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * 获取登录状态
   * @returns {boolean} 是否已登录
   */
  getLoginStatus() {
    return this.isLoggedIn;
  }

  /**
   * 获取游客模式状态
   * @returns {boolean} 是否为游客模式
   */
  getGuestMode() {
    return this.isGuestMode;
  }

  /**
   * 获取API可用性状态
   * @returns {boolean} API是否可用
   */
  getApiStatus() {
    return this.isApiAvailable;
  }

  /**
   * 获取认证令牌
   * @returns {string|null} 认证令牌
   */
  getToken() {
    return localStorage.getItem('lubulu_token');
  }

  /**
   * 添加状态变化监听器
   * @param {Function} listener - 监听器函数
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * 移除状态变化监听器
   * @param {Function} listener - 监听器函数
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   * @param {string} event - 事件类型
   * @param {any} data - 事件数据
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.warn('监听器执行失败:', error.message);
      }
    });
  }

  /**
   * 修改密码
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<void>}
   */
  async changePassword(oldPassword, newPassword) {
    if (!this.isLoggedIn) {
      throw new Error('请先登录');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('新密码至少需要6个字符');
    }

    if (!this.isApiAvailable) {
      throw new Error('修改密码需要网络连接');
    }

    try {
      await this.apiClient.request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      Analytics.trackEvent('password_changed');
    } catch (error) {
      throw new Error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 删除账户
   * @param {string} password - 用户密码确认
   * @returns {Promise<void>}
   */
  async deleteAccount(password) {
    if (!this.isLoggedIn) {
      throw new Error('请先登录');
    }

    if (!password) {
      throw new Error('请输入密码确认');
    }

    if (!this.isApiAvailable) {
      throw new Error('删除账户需要网络连接');
    }

    try {
      await this.apiClient.request('/api/auth/delete-account', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      });

      // 删除成功后注销
      await this.logout();

      Analytics.trackEvent('account_deleted');
    } catch (error) {
      throw new Error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 销毁认证管理器
   */
  destroy() {
    this.listeners.clear();
    this.user = null;
    this.isLoggedIn = false;
    this.isGuestMode = false;
  }
}

/**
 * 数据迁移工具 (增强版)
 */
export class DataMigration {
  constructor(authManager, storageManager) {
    this.authManager = authManager;
    this.storageManager = storageManager;
  }

  /**
   * 将游客数据迁移到用户账户
   * @param {string} strategy - 合并策略: 'keep-both', 'user-priority', 'guest-priority'
   * @returns {Promise<boolean>} 是否成功迁移
   */
  async migrateGuestDataToUser(strategy = 'keep-both') {
    try {
      if (!this.authManager.isLoggedIn || this.authManager.isGuestMode) {
        throw new Error('请先登录用户账户');
      }

      // 检查是否有游客数据
      const hasGuestData = this.hasGuestData();
      if (!hasGuestData) {
        return false;
      }

      // 获取游客数据
      const guestData = await this.getGuestData();

      // 备份当前用户数据
      const currentUserData = await this.storageManager.exportData();

      // 智能合并数据
      const mergedData = this.mergeData(guestData, currentUserData, strategy);

      // 导入合并后的数据
      await this.storageManager.importData(mergedData);

      // 清理游客数据
      this.clearGuestData();

      Analytics.trackEvent('guest_data_migrated', {
        historyCount: Object.keys(mergedData.history || {}).length,
        strategy
      });

      return true;
    } catch (error) {
      console.error('数据迁移失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查是否有游客数据
   * @returns {boolean}
   */
  hasGuestData() {
    const settings = localStorage.getItem('settings');
    const history = localStorage.getItem('spinHistory');
    const dailySpinCounts = localStorage.getItem('dailySpinCounts');

    return !!(settings || history || dailySpinCounts);
  }

  /**
   * 获取游客数据
   * @returns {Promise<Object>}
   */
  async getGuestData() {
    return {
      settings: JSON.parse(localStorage.getItem('settings') || '{}'),
      history: JSON.parse(localStorage.getItem('spinHistory') || '{}'),
      dailySpinCounts: JSON.parse(localStorage.getItem('dailySpinCounts') || '{}')
    };
  }

  /**
   * 智能合并游客数据和用户数据
   * @param {Object} guestData - 游客数据
   * @param {Object} userData - 用户数据
   * @param {string} strategy - 合并策略
   * @returns {Object} 合并后的数据
   */
  mergeData(guestData, userData, strategy = 'keep-both') {
    const merged = {
      settings: {},
      history: {},
      dailySpinCounts: {}
    };

    // 设置合并: 用户设置优先
    merged.settings = { ...guestData.settings, ...userData.settings };

    // 历史记录智能合并
    const allDates = new Set([
      ...Object.keys(guestData.history || {}),
      ...Object.keys(userData.history || {})
    ]);

    allDates.forEach(date => {
      const guestRecord = guestData.history?.[date];
      const userRecord = userData.history?.[date];

      if (guestRecord && userRecord) {
        // 冲突解决
        merged.history[date] = this.resolveConflict(
          guestRecord,
          userRecord,
          strategy
        );
      } else {
        merged.history[date] = guestRecord || userRecord;
      }
    });

    // 抽取次数合并
    const allCountDates = new Set([
      ...Object.keys(guestData.dailySpinCounts || {}),
      ...Object.keys(userData.dailySpinCounts || {})
    ]);

    allCountDates.forEach(date => {
      const guestCount = guestData.dailySpinCounts?.[date] || 0;
      const userCount = userData.dailySpinCounts?.[date] || 0;
      merged.dailySpinCounts[date] = Math.max(guestCount, userCount);
    });

    return merged;
  }

  /**
   * 解决数据冲突
   * @param {Object} record1 - 记录1
   * @param {Object} record2 - 记录2
   * @param {string} strategy - 策略
   * @returns {Object} 解决后的记录
   */
  resolveConflict(record1, record2, strategy) {
    switch (strategy) {
      case 'user-priority':
        return record2;

      case 'guest-priority':
        return record1;

      case 'keep-both':
      default:
        // 选择时间戳更新的记录
        const timestamp1 = new Date(record1.timestamp || 0).getTime();
        const timestamp2 = new Date(record2.timestamp || 0).getTime();
        return timestamp1 > timestamp2 ? record1 : record2;
    }
  }

  /**
   * 清理游客数据
   */
  clearGuestData() {
    const keysToRemove = ['settings', 'spinHistory', 'dailySpinCounts'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}
