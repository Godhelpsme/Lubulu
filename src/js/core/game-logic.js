/**
 * 游戏逻辑 - 纯业务逻辑,不依赖UI
 *
 * 原则:
 * 1. 转盘渲染和业务逻辑完全分离
 * 2. 游戏逻辑只负责决定结果
 * 3. 渲染器只负责展示结果
 */

import { getSecureRandom } from '../utils/helpers.js';

/**
 * 游戏逻辑类
 */
export class GameLogic {
  constructor(probability = 1) {
    this.setProbability(probability);
  }

  /**
   * 设置Lu的概率 (1-98)
   */
  setProbability(value) {
    this.probability = Math.max(1, Math.min(98, value));
    this.totalSlices = 100; // 修正:使用100而不是99,符合直觉
  }

  /**
   * 获取Lu的扇形数量
   */
  get luSliceCount() {
    return this.probability;
  }

  /**
   * 获取不Lu的扇形数量
   */
  get noLuSliceCount() {
    return this.totalSlices - this.probability;
  }

  /**
   * 执行一次抽取
   * @returns {Object} { isLu, sliceIndex, probability }
   */
  roll() {
    const random = getSecureRandom(0, this.totalSlices);
    const sliceIndex = Math.floor(random);
    const isLu = sliceIndex < this.probability;

    return {
      isLu,
      sliceIndex,
      probability: this.probability
    };
  }

  /**
   * 强制结果(用于保底)
   * @param {boolean} forceLu - 是否强制Lu
   * @returns {Object}
   */
  forceResult(forceLu) {
    const sliceIndex = forceLu
      ? Math.floor(getSecureRandom(0, this.probability))
      : Math.floor(getSecureRandom(this.probability, this.totalSlices));

    return {
      isLu: forceLu,
      sliceIndex,
      probability: this.probability,
      isForced: true
    };
  }

  /**
   * 获取转盘配置(供渲染器使用)
   */
  getWheelConfig() {
    return {
      totalSlices: this.totalSlices,
      luSlices: this.luSliceCount,
      noLuSlices: this.noLuSliceCount,
      colors: {
        lu: '#F44336',
        noLu: '#4CAF50',
        border: '#FFFFFF'
      }
    };
  }
}
