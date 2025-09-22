/**
 * Lubulu 统计管理模块
 * 处理数据统计和可视化显示
 */

import { Analytics } from '../utils/helpers.js';

/**
 * 统计管理类
 */
export class StatisticsManager {
  constructor(elements, storageManager) {
    this.elements = {
      successCount: elements.successCount,
      failureCount: elements.failureCount,
      totalCount: elements.totalCount,
      successRate: elements.successRate
    };
    this.storageManager = storageManager;
    this.currentStats = {
      luCount: 0,
      noLuCount: 0,
      totalCount: 0,
      successRate: 0
    };
  }

  /**
   * 初始化统计数据
   */
  async init() {
    await this.updateStats();
  }

  /**
   * 更新统计数据
   */
  async updateStats() {
    try {
      const history = await this.storageManager.getHistory();
      const stats = this.calculateStats(history);
      this.currentStats = stats;
      this.renderStats(stats);
      
      Analytics.trackEvent('stats_updated', stats);
    } catch (error) {
      console.error('Failed to update stats:', error);
      this.renderError();
    }
  }

  /**
   * 计算统计数据
   * @param {Object} history - 历史记录
   * @returns {Object} 统计结果
   */
  calculateStats(history) {
    let luCount = 0;
    let noLuCount = 0;
    let totalCount = 0;
    
    // 遍历历史记录
    Object.values(history).forEach(record => {
      if (record && record.result) {
        totalCount++;
        if (record.result === 'Lu') {
          luCount++;
        } else {
          noLuCount++;
        }
      }
    });

    // 计算克制率（不Lu的比例）
    const successRate = totalCount > 0 ? ((noLuCount / totalCount) * 100) : 0;

    return {
      luCount,
      noLuCount,
      totalCount,
      successRate: Math.round(successRate * 100) / 100 // 保留2位小数
    };
  }

  /**
   * 渲染统计数据到DOM
   * @param {Object} stats - 统计数据
   */
  renderStats(stats) {
    // 使用动画效果更新数字
    this.animateNumber(this.elements.successCount, stats.luCount, '#F44336');
    this.animateNumber(this.elements.failureCount, stats.noLuCount, '#4CAF50');
    this.animateNumber(this.elements.totalCount, stats.totalCount, '#673AB7');
    this.animatePercentage(this.elements.successRate, stats.successRate);
  }

  /**
   * 动画更新数字
   * @param {HTMLElement} element - 目标元素
   * @param {number} targetValue - 目标值
   * @param {string} color - 颜色
   */
  animateNumber(element, targetValue, color) {
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const eased = this.easeOutCubic(progress);
      const currentValue = Math.round(startValue + (targetValue - startValue) * eased);
      
      element.textContent = currentValue;
      element.style.color = color;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * 动画更新百分比
   * @param {HTMLElement} element - 目标元素
   * @param {number} targetValue - 目标值
   */
  animatePercentage(element, targetValue) {
    if (!element) return;

    const startText = element.textContent.replace('%', '');
    const startValue = parseFloat(startText) || 0;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = this.easeOutCubic(progress);
      const currentValue = startValue + (targetValue - startValue) * eased;
      
      element.textContent = currentValue.toFixed(1) + '%';
      
      // 根据克制率设置颜色
      if (currentValue >= 80) {
        element.style.color = '#4CAF50'; // 绿色 - 很好
      } else if (currentValue >= 60) {
        element.style.color = '#FF9800'; // 橙色 - 不错
      } else {
        element.style.color = '#F44336'; // 红色 - 需要努力
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * 缓动函数
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 渲染错误状态
   */
  renderError() {
    Object.values(this.elements).forEach(element => {
      if (element) {
        element.textContent = '--';
        element.style.color = '#999';
      }
    });
  }

  /**
   * 获取当前统计数据
   * @returns {Object} 当前统计数据
   */
  getCurrentStats() {
    return { ...this.currentStats };
  }

  /**
   * 获取详细统计信息
   * @returns {Promise<Object>} 详细统计信息
   */
  async getDetailedStats() {
    try {
      const history = await this.storageManager.getHistory();
      const basicStats = this.calculateStats(history);
      
      // 计算额外的统计信息
      const detailedStats = {
        ...basicStats,
        ...this.calculateStreaks(history),
        ...this.calculateMonthlyStats(history),
        ...this.calculateWeeklyStats(history)
      };

      return detailedStats;
    } catch (error) {
      console.error('Failed to get detailed stats:', error);
      return this.currentStats;
    }
  }

  /**
   * 计算连击统计
   * @param {Object} history - 历史记录
   * @returns {Object} 连击统计
   */
  calculateStreaks(history) {
    const dates = Object.keys(history).sort();
    let currentLuStreak = 0;
    let currentNoLuStreak = 0;
    let maxLuStreak = 0;
    let maxNoLuStreak = 0;
    let lastResult = null;

    dates.forEach(date => {
      const record = history[date];
      if (!record || !record.result) return;

      if (record.result === 'Lu') {
        if (lastResult === 'Lu') {
          currentLuStreak++;
        } else {
          currentLuStreak = 1;
          currentNoLuStreak = 0;
        }
        maxLuStreak = Math.max(maxLuStreak, currentLuStreak);
      } else {
        if (lastResult === '不Lu') {
          currentNoLuStreak++;
        } else {
          currentNoLuStreak = 1;
          currentLuStreak = 0;
        }
        maxNoLuStreak = Math.max(maxNoLuStreak, currentNoLuStreak);
      }

      lastResult = record.result;
    });

    return {
      currentLuStreak,
      currentNoLuStreak,
      maxLuStreak,
      maxNoLuStreak
    };
  }

  /**
   * 计算月度统计
   * @param {Object} history - 历史记录
   * @returns {Object} 月度统计
   */
  calculateMonthlyStats(history) {
    const monthlyData = {};
    
    Object.entries(history).forEach(([date, record]) => {
      if (!record || !record.result) return;
      
      const monthKey = date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { luCount: 0, noLuCount: 0, total: 0 };
      }
      
      monthlyData[monthKey].total++;
      if (record.result === 'Lu') {
        monthlyData[monthKey].luCount++;
      } else {
        monthlyData[monthKey].noLuCount++;
      }
    });

    // 计算当月和上月数据
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    return {
      monthlyData,
      currentMonthStats: monthlyData[currentMonth] || { luCount: 0, noLuCount: 0, total: 0 },
      lastMonthStats: monthlyData[lastMonthKey] || { luCount: 0, noLuCount: 0, total: 0 }
    };
  }

  /**
   * 计算周度统计
   * @param {Object} history - 历史记录
   * @returns {Object} 周度统计
   */
  calculateWeeklyStats(history) {
    const weeklyData = {};
    
    Object.entries(history).forEach(([date, record]) => {
      if (!record || !record.result) return;
      
      const dateObj = new Date(date);
      const weekStart = this.getWeekStart(dateObj);
      const weekKey = weekStart.toISOString().substring(0, 10);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { luCount: 0, noLuCount: 0, total: 0 };
      }
      
      weeklyData[weekKey].total++;
      if (record.result === 'Lu') {
        weeklyData[weekKey].luCount++;
      } else {
        weeklyData[weekKey].noLuCount++;
      }
    });

    return { weeklyData };
  }

  /**
   * 获取周的开始日期（周一）
   * @param {Date} date - 日期
   * @returns {Date} 周开始日期
   */
  getWeekStart(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
    return new Date(date.setDate(diff));
  }

  /**
   * 导出统计数据
   * @returns {Promise<Object>} 统计数据
   */
  async exportStats() {
    try {
      const detailedStats = await this.getDetailedStats();
      const exportData = {
        basic: this.currentStats,
        detailed: detailedStats,
        exportTime: new Date().toISOString(),
        version: '2.0'
      };

      Analytics.trackEvent('stats_exported', {
        totalCount: this.currentStats.totalCount
      });

      return exportData;
    } catch (error) {
      console.error('Failed to export stats:', error);
      throw new Error('导出统计数据失败');
    }
  }

  /**
   * 重置统计显示
   */
  resetDisplay() {
    this.currentStats = {
      luCount: 0,
      noLuCount: 0,
      totalCount: 0,
      successRate: 0
    };
    this.renderStats(this.currentStats);
  }

  /**
   * 销毁统计管理器
   */
  destroy() {
    this.elements = {};
    this.storageManager = null;
    this.currentStats = null;
  }
}