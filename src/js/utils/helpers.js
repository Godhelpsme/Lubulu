/**
 * Lubulu 工具函数
 * 只保留核心功能，遵循KISS原则
 */

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
 * 生成安全随机数
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
  return min + Math.random() * (max - min);
}

/**
 * 防抖函数（仅用于统计更新）
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 验证设置参数
 * @param {Object} settings - 设置对象
 * @returns {boolean} 验证结果
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