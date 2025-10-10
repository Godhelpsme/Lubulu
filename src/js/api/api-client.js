/**
 * API 客户端 - 带健康检查和降级机制
 * 自动处理在线/离线状态
 */

import { ErrorHandler, Analytics } from '../utils/helpers.js';

/**
 * API 配置
 */
const API_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_URL || 'https://api.lubulu.app',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  healthCheckInterval: 60000 // 1分钟
};

/**
 * API 客户端类
 */
export class ApiClient {
  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.token = null;
    this.isHealthy = false;
    this.lastHealthCheck = 0;
    this.healthCheckPromise = null;
    this.requestQueue = [];

    // 初始化健康检查
    this.checkHealth();

    // 定期健康检查
    setInterval(() => this.checkHealth(), API_CONFIG.healthCheckInterval);
  }

  /**
   * 设置认证令牌
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * 移除认证令牌
   */
  clearToken() {
    this.token = null;
  }

  /**
   * 健康检查
   */
  async checkHealth() {
    // 避免并发健康检查
    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    this.healthCheckPromise = (async () => {
      try {
        const response = await this.fetchWithTimeout('/api/health', {
          method: 'GET',
          timeout: 5000
        });

        this.isHealthy = response.ok;
        this.lastHealthCheck = Date.now();

        if (this.isHealthy) {
          Analytics.trackEvent('api_health_check_success');
          this.processQueue();
        } else {
          Analytics.trackEvent('api_health_check_failed', {
            status: response.status
          });
        }

        return this.isHealthy;
      } catch (error) {
        console.warn('API health check failed:', error.message);
        this.isHealthy = false;
        Analytics.trackEvent('api_unreachable');
        return false;
      } finally {
        this.healthCheckPromise = null;
      }
    })();

    return this.healthCheckPromise;
  }

  /**
   * 带超时的 fetch
   */
  async fetchWithTimeout(url, options = {}) {
    const timeout = options.timeout || API_CONFIG.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl + url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接');
      }
      throw error;
    }
  }

  /**
   * 带重试的请求
   */
  async fetchWithRetry(url, options = {}, attempts = API_CONFIG.retryAttempts) {
    try {
      const response = await this.fetchWithTimeout(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempts > 1) {
        console.log(`请求失败，${API_CONFIG.retryDelay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
        return this.fetchWithRetry(url, options, attempts - 1);
      }
      throw error;
    }
  }

  /**
   * 通用请求方法
   */
  async request(url, options = {}) {
    // 检查网络状态
    if (!navigator.onLine) {
      throw new Error('当前处于离线状态');
    }

    // 如果API不健康且距上次检查超过10秒，重新检查
    if (!this.isHealthy && Date.now() - this.lastHealthCheck > 10000) {
      await this.checkHealth();
    }

    // 如果API仍然不健康，抛出错误以触发本地模式
    if (!this.isHealthy) {
      throw new Error('API服务暂时不可用');
    }

    try {
      return await this.fetchWithRetry(url, options);
    } catch (error) {
      console.error('API request failed:', error);
      Analytics.trackEvent('api_request_failed', {
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 添加到请求队列（用于离线时）
   */
  queueRequest(request) {
    this.requestQueue.push(request);
    Analytics.trackEvent('request_queued', { queueSize: this.requestQueue.length });
  }

  /**
   * 处理队列中的请求
   */
  async processQueue() {
    if (this.requestQueue.length === 0) return;

    console.log(`处理 ${this.requestQueue.length} 个排队的请求...`);

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of queue) {
      try {
        await this.request(request.url, request.options);
        Analytics.trackEvent('queued_request_processed');
      } catch (error) {
        console.error('Failed to process queued request:', error);
        // 如果还是失败，重新加入队列
        this.requestQueue.push(request);
      }
    }
  }

  /**
   * 用户注册
   */
  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * 用户登录
   */
  async login(loginData) {
    const result = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    if (result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  /**
   * 验证令牌
   */
  async validateToken() {
    return this.request('/api/auth/validate', {
      method: 'POST'
    });
  }

  /**
   * 用户注销
   */
  async logout() {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST'
      });
    } finally {
      this.clearToken();
    }
  }

  /**
   * 获取设置
   */
  async getSettings() {
    return this.request('/api/settings');
  }

  /**
   * 保存设置
   */
  async saveSettings(settings) {
    return this.request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  /**
   * 获取历史记录
   */
  async getHistory() {
    return this.request('/api/history');
  }

  /**
   * 保存历史记录
   */
  async saveHistoryRecord(date, result, isPityTriggered) {
    return this.request('/api/history', {
      method: 'POST',
      body: JSON.stringify({ date, result, isPityTriggered })
    });
  }

  /**
   * 删除历史记录
   */
  async deleteHistoryRecord(date) {
    return this.request(`/api/history/${date}`, {
      method: 'DELETE'
    });
  }

  /**
   * 保存每日抽取次数
   */
  async saveDailySpinCount(date, count) {
    return this.request('/api/daily-count', {
      method: 'POST',
      body: JSON.stringify({ date, count })
    });
  }

  /**
   * 获取API状态
   */
  getStatus() {
    return {
      isHealthy: this.isHealthy,
      isOnline: navigator.onLine,
      lastHealthCheck: this.lastHealthCheck,
      queueSize: this.requestQueue.length
    };
  }
}

// 导出单例
export const apiClient = new ApiClient();
