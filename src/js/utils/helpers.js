/**
 * Lubulu 工具函数
 * 提供通用的工具方法和辅助函数
 */

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 获取北京时间的日期字符串 (YYYY-MM-DD 格式)
 * @returns {string} 北京时间日期字符串
 */
export function getBeijingDateString() {
  const now = new Date();
  // 获取UTC时间戳，然后加上8小时（北京时间UTC+8）
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 获取北京时间的Date对象
 * @returns {Date} 北京时间Date对象
 */
export function getBeijingDate() {
  const now = new Date();
  // 获取UTC时间戳，然后加上8小时（北京时间UTC+8）
  return new Date(now.getTime() + (8 * 60 * 60 * 1000));
}

/**
 * XSS防护 - 清理用户输入
 * @param {string} input - 用户输入
 * @returns {string} 清理后的字符串
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * 验证设置参数
 * @param {Object} settings - 设置对象
 * @returns {boolean} 验证结果
 * @throws {Error} 参数验证失败时抛出错误
 */
export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('设置参数无效');
  }
  
  if (typeof settings.luProbability !== 'number' || 
      settings.luProbability < 1 || 
      settings.luProbability > 98) {
    throw new Error('Lu概率必须在1-98之间');
  }
  
  if (typeof settings.pityDays !== 'number' || 
      settings.pityDays < 0 || 
      settings.pityDays > 365) {
    throw new Error('保底天数必须在0-365之间');
  }
  
  return true;
}

/**
 * 生成真随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机数
 */
export function getSecureRandom(min = 0, max = 1) {
  if (window.crypto && window.crypto.getRandomValues) {
    const randomArray = new Uint32Array(1);
    window.crypto.getRandomValues(randomArray);
    return min + (randomArray[0] / (0xffffffff + 1)) * (max - min);
  }
  // Fallback to Math.random
  return min + Math.random() * (max - min);
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  /**
   * 测量函数执行时间
   * @param {string} name - 测量名称
   * @returns {Object} 包含end方法的对象
   */
  static measureTime(name) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        if (duration > 1000) { // 超过1秒记录警告
          console.warn(`Slow operation [${name}]:`, duration.toFixed(2) + 'ms');
        } else if (duration > 100) { // 超过100ms记录信息
          console.log(`Operation [${name}]:`, duration.toFixed(2) + 'ms');
        }
        return duration;
      }
    };
  }

  /**
   * 测量转盘操作时间
   * @returns {Object} 包含end方法的对象
   */
  static measureSpinTime() {
    return this.measureTime('Spin Operation');
  }
}

/**
 * 错误处理工具
 */
export class ErrorHandler {
  /**
   * 安全的API调用
   * @param {Function} apiFunction - API函数
   * @param {*} fallback - 失败时的后备值
   * @returns {Promise<*>} API结果或后备值
   */
  static async safeApiCall(apiFunction, fallback = null) {
    try {
      return await apiFunction();
    } catch (error) {
      console.error('API call failed:', error);
      return fallback;
    }
  }

  /**
   * 显示用户友好的错误信息
   * @param {Error} error - 错误对象
   * @returns {string} 用户友好的错误信息
   */
  static getFriendlyErrorMessage(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return '网络连接失败，请检查网络连接';
    }
    if (error.message.includes('token')) {
      return '登录已过期，请重新登录';
    }
    if (error.message.includes('quota')) {
      return '存储空间不足，请清理数据';
    }
    return error.message || '操作失败，请重试';
  }
}

/**
 * 简单的用户行为统计
 */
export class Analytics {
  /**
   * 跟踪用户事件
   * @param {string} event - 事件名称
   * @param {Object} data - 事件数据
   */
  static trackEvent(event, data) {
    if (localStorage.getItem('analytics_enabled') === 'true') {
      // 在生产环境中，这里可以发送到实际的分析服务
      console.log('Analytics Event:', event, data);
      
      // 记录到本地用于基础统计
      const stats = JSON.parse(localStorage.getItem('lubulu_stats') || '{}');
      stats[event] = (stats[event] || 0) + 1;
      stats.lastActive = new Date().toISOString();
      localStorage.setItem('lubulu_stats', JSON.stringify(stats));
    }
  }
}