/**
 * API 客户端 - 封装所有后端请求
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.userId = this.getUserId();
  }

  /**
   * 获取或生成用户 ID
   */
  getUserId() {
    let userId = this.getCookie('lubulu_uid');
    if (!userId) {
      userId = crypto.randomUUID();
      this.setCookie('lubulu_uid', userId, 365);
    }
    return userId;
  }

  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-User-ID': this.userId,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // === API 方法 ===

  /**
   * 执行抽取 - 传递客户端本地日期以避免时区问题
   */
  async spin() {
    const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
    return this.request('/spin', {
      method: 'POST',
      body: JSON.stringify({ date: localDate })
    });
  }

  async getHistory(limit = 100) {
    return this.request(`/history?limit=${limit}`);
  }

  async deleteHistory(date) {
    return this.request(`/history?date=${date}`, { method: 'DELETE' });
  }

  async getSettings() {
    return this.request('/settings');
  }

  async saveSettings(settings, pityCounter) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings, pityCounter })
    });
  }

  async getStats() {
    return this.request('/stats');
  }

  // === Cookie 辅助方法 ===

  getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return value;
    }
    return null;
  }

  setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  /**
   * 设置用户 ID (用于导入备份)
   */
  setUserId(userId) {
    this.userId = userId;
    this.setCookie('lubulu_uid', userId, 365);
  }
}

export default new ApiClient();
