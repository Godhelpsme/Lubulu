/**
 * Lubulu 应用状态管理 - 消除上帝对象
 *
 * 设计原则:
 * 1. 每个类只拥有自己的数据
 * 2. 状态从数据派生,而不是单独存储
 * 3. 消除特殊情况判断
 */

import { getBeijingDateString } from '../utils/helpers.js';

/**
 * 今日状态 - 拥有今天的转盘数据
 */
export class TodayState {
  constructor(date = null) {
    this.date = date || getBeijingDateString();
    this.spins = []; // 今日所有转盘结果 [{result, time, isPityTriggered}]
  }

  /**
   * 添加一次转盘结果
   */
  addSpin(result, isPityTriggered = false) {
    this.spins.push({
      result,
      time: new Date().toISOString(),
      isPityTriggered
    });
  }

  /**
   * 获取转盘次数 - 从数据派生,不单独存储
   */
  get spinCount() {
    return this.spins.length;
  }

  /**
   * 获取今日最终结果 - 从数据派生
   */
  get finalResult() {
    return this.spins.length > 0 ? this.spins[this.spins.length - 1].result : null;
  }

  /**
   * 是否已抽取 - 从数据派生
   */
  get hasSpun() {
    return this.spins.length > 0;
  }

  /**
   * 判断是否可以转盘
   */
  canSpin(mode) {
    if (mode === 'multi') return true;
    return this.spinCount === 0;
  }

  /**
   * 重置今日状态
   */
  reset() {
    this.spins = [];
  }

  /**
   * 序列化为简单对象
   */
  toJSON() {
    return {
      date: this.date,
      result: this.finalResult,
      isPityTriggered: this.spins.some(s => s.isPityTriggered),
      timestamp: this.spins.length > 0 ? this.spins[0].time : null
    };
  }

  /**
   * 从简单对象恢复
   */
  static fromJSON(data) {
    const state = new TodayState(data.date);
    if (data.result) {
      state.spins = [{
        result: data.result,
        time: data.timestamp || new Date().toISOString(),
        isPityTriggered: data.isPityTriggered || false
      }];
    }
    return state;
  }
}

/**
 * 保底计数器 - 简单的状态机
 *
 * 不要每次查询历史!在状态更新时维护计数器
 */
export class PityCounter {
  constructor(threshold = 0) {
    this.threshold = threshold;
    this.consecutiveFails = 0;
  }

  /**
   * 记录一次结果
   */
  record(result) {
    if (result === '不Lu') {
      this.consecutiveFails++;
    } else {
      this.consecutiveFails = 0;
    }
  }

  /**
   * 是否应该触发保底
   */
  shouldTrigger() {
    return this.threshold > 0 && this.consecutiveFails >= this.threshold;
  }

  /**
   * 重置计数器
   */
  reset() {
    this.consecutiveFails = 0;
  }

  /**
   * 设置阈值
   */
  setThreshold(value) {
    this.threshold = value;
  }

  /**
   * 序列化
   */
  toJSON() {
    return {
      threshold: this.threshold,
      consecutiveFails: this.consecutiveFails
    };
  }

  /**
   * 反序列化
   */
  static fromJSON(data) {
    const counter = new PityCounter(data.threshold || 0);
    counter.consecutiveFails = data.consecutiveFails || 0;
    return counter;
  }
}

/**
 * 应用配置 - 纯数据对象
 */
export class AppConfig {
  constructor() {
    this.luProbability = 1;      // 1-98
    this.pityDays = 0;            // 0-365
    this.mode = 'single';         // 'single' | 'multi'
    this.soundEnabled = true;
    this.animationEnabled = true;
  }

  /**
   * 验证并更新配置
   */
  update(newConfig) {
    if (newConfig.luProbability !== undefined) {
      this.luProbability = Math.max(1, Math.min(98, newConfig.luProbability));
    }
    if (newConfig.pityDays !== undefined) {
      this.pityDays = Math.max(0, Math.min(365, newConfig.pityDays));
    }
    if (newConfig.mode !== undefined) {
      this.mode = newConfig.mode === 'multi' ? 'multi' : 'single';
    }
    if (newConfig.soundEnabled !== undefined) {
      this.soundEnabled = Boolean(newConfig.soundEnabled);
    }
    if (newConfig.animationEnabled !== undefined) {
      this.animationEnabled = Boolean(newConfig.animationEnabled);
    }
  }

  /**
   * 从存储格式创建配置对象
   * 注: 存储层使用 multiMode (boolean),内部使用 mode (string)
   */
  static fromStorageFormat(settings) {
    const config = new AppConfig();
    config.update({
      luProbability: settings.luProbability || 1,
      pityDays: settings.pityDays || 0,
      mode: settings.multiMode ? 'multi' : 'single',
      soundEnabled: settings.soundEnabled !== false,
      animationEnabled: settings.animationEnabled !== false
    });
    return config;
  }

  /**
   * 转换为存储格式
   * 注: 保持 multiMode (boolean) 以兼容现有存储数据
   */
  toStorageFormat() {
    return {
      luProbability: this.luProbability,
      pityDays: this.pityDays,
      multiMode: this.mode === 'multi',
      soundEnabled: this.soundEnabled,
      animationEnabled: this.animationEnabled
    };
  }
}

/**
 * 应用状态 - 组合所有状态
 *
 * 关键: 每个子状态独立管理自己的数据
 */
export class AppState {
  constructor() {
    this.today = new TodayState();
    this.config = new AppConfig();
    this.pityCounter = new PityCounter(0);
    this.isSpinning = false; // UI状态
  }

  /**
   * 更新到新的一天
   */
  checkAndUpdateDate() {
    const currentDate = getBeijingDateString();
    if (this.today.date !== currentDate) {
      this.today = new TodayState(currentDate);
    }
  }

  /**
   * 判断是否可以转盘 - 单一入口,无特殊情况
   */
  canSpin() {
    if (this.isSpinning) {
      return { allowed: false, reason: 'spinning' };
    }

    if (!this.today.canSpin(this.config.mode)) {
      return { allowed: false, reason: 'already_spun' };
    }

    return { allowed: true, reason: null };
  }

  /**
   * 记录转盘结果
   */
  recordSpin(result, isPityTriggered = false) {
    this.today.addSpin(result, isPityTriggered);
    this.pityCounter.record(result);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config.update(newConfig);
    this.pityCounter.setThreshold(this.config.pityDays);
  }

  /**
   * 导出状态用于持久化
   */
  exportForPersistence() {
    return {
      today: this.today.toJSON(),
      config: this.config.toStorageFormat(),
      pityCounter: this.pityCounter.toJSON()
    };
  }

  /**
   * 从持久化数据恢复
   */
  static fromPersistedData(data) {
    const state = new AppState();

    if (data.today) {
      state.today = TodayState.fromJSON(data.today);
    }

    if (data.config) {
      state.config = AppConfig.fromStorageFormat(data.config);
    }

    if (data.pityCounter) {
      state.pityCounter = PityCounter.fromJSON(data.pityCounter);
    }

    state.checkAndUpdateDate();
    return state;
  }
}
