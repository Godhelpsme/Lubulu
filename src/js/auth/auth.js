/**
 * Lubulu 用户认证模块
 * 提供用户注册、登录、注销等功能
 */

import { ErrorHandler, Analytics, sanitizeInput } from '../utils/helpers.js';

/**
 * 用户认证管理器
 */
export class AuthManager {
  constructor() {
    this.user = null;
    this.isLoggedIn = false;
    this.isGuestMode = false;
    this.apiBaseUrl = 'https://api.lubulu.app';
    this.listeners = new Set();
    
    // 检查本地存储的登录状态
    this.checkStoredAuth();
  }

  /**
   * 初始化认证管理器
   */
  async init() {
    try {
      // 验证存储的认证信息
      if (this.isLoggedIn) {
        await this.validateStoredAuth();
      }
      
      Analytics.trackEvent('auth_manager_initialized', {
        isLoggedIn: this.isLoggedIn,
        isGuestMode: this.isGuestMode
      });
    } catch (error) {
      console.warn('认证初始化失败:', error.message);
      await this.logout();
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

      const response = await fetch(`${this.apiBaseUrl}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('认证令牌已失效');
      }

      const userData = await response.json();
      this.user = userData.user;
      return true;
    } catch (error) {
      console.warn('认证验证失败:', error.message);
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
        password: password, // 密码不清理，保持原样传递给后端
        email: sanitizeInput(email).trim().toLowerCase()
      };

      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanUserData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '注册失败');
      }

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
      const { username, password } = loginData;
      
      if (!username || !password) {
        throw new Error('请输入用户名和密码');
      }

      const cleanLoginData = {
        username: sanitizeInput(username).trim(),
        password: password
      };

      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanLoginData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '登录失败');
      }

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
      
      if (wasLoggedIn && navigator.onLine) {
        try {
          const token = localStorage.getItem('lubulu_token');
          if (token) {
            await fetch(`${this.apiBaseUrl}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }
        } catch (error) {
          console.warn('服务器注销失败:', error.message);
        }
      }

      // 清理本地状态
      this.clearStoredAuth();
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

    // 存储认证信息
    localStorage.setItem('lubulu_user', JSON.stringify(user));
    localStorage.setItem('lubulu_token', token);
    localStorage.removeItem('lubulu_guest_mode');

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

    try {
      const token = this.getToken();
      const response = await fetch(`${this.apiBaseUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '密码修改失败');
      }

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

    try {
      const token = this.getToken();
      const response = await fetch(`${this.apiBaseUrl}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '账户删除失败');
      }

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
 * 数据迁移工具
 */
export class DataMigration {
  constructor(authManager, storageManager) {
    this.authManager = authManager;
    this.storageManager = storageManager;
  }

  /**
   * 将游客数据迁移到用户账户
   * @returns {Promise<boolean>} 是否成功迁移
   */
  async migrateGuestDataToUser() {
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
      
      // 合并数据
      const mergedData = this.mergeData(guestData, currentUserData);
      
      // 导入合并后的数据
      await this.storageManager.importData(mergedData);
      
      // 清理游客数据
      this.clearGuestData();

      Analytics.trackEvent('guest_data_migrated', {
        historyCount: Object.keys(mergedData.history || {}).length
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
   * 合并游客数据和用户数据
   * @param {Object} guestData - 游客数据
   * @param {Object} userData - 用户数据
   * @returns {Object} 合并后的数据
   */
  mergeData(guestData, userData) {
    return {
      settings: { ...guestData.settings, ...userData.settings },
      history: { ...guestData.history, ...userData.history },
      dailySpinCounts: { ...guestData.dailySpinCounts, ...userData.dailySpinCounts }
    };
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