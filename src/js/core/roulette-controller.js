/**
 * 转盘控制器 - 组合游戏逻辑和渲染器
 *
 * 原则:
 * 1. 组合而非继承
 * 2. 协调业务逻辑和渲染器
 * 3. 对外提供简单API
 */

import { GameLogic } from './game-logic.js';
import { RouletteRenderer } from './roulette-renderer.js';

/**
 * 转盘控制器
 */
export class RouletteController {
  constructor(canvas) {
    this.gameLogic = new GameLogic(1);
    this.renderer = new RouletteRenderer(canvas);

    // 初始化渲染器配置
    this.syncRendererConfig();
  }

  /**
   * 更新Lu概率
   */
  setProbability(value) {
    this.gameLogic.setProbability(value);
    this.syncRendererConfig();
  }

  /**
   * 同步渲染器配置
   */
  syncRendererConfig() {
    const config = this.gameLogic.getWheelConfig();
    this.renderer.updateConfig(config);
  }

  /**
   * 执行转盘(正常抽取)
   * @returns {Promise<Object>} { isLu, result }
   */
  async spin() {
    // 业务逻辑:决定结果
    const rollResult = this.gameLogic.roll();

    // 渲染器:展示结果
    await this.renderer.animateToSlice(rollResult.sliceIndex);


    return {
      isLu: rollResult.isLu,
      result: rollResult.isLu ? 'Lu' : '不Lu',
      sliceIndex: rollResult.sliceIndex
    };
  }

  /**
   * 执行保底转盘(强制Lu)
   * @returns {Promise<Object>}
   */
  async spinWithPity() {
    // 强制Lu结果
    const rollResult = this.gameLogic.forceResult(true);

    // 渲染器:展示结果
    await this.renderer.animateToSlice(rollResult.sliceIndex);


    return {
      isLu: true,
      result: 'Lu',
      sliceIndex: rollResult.sliceIndex,
      isPityTriggered: true
    };
  }

  /**
   * 获取当前概率
   */
  getProbability() {
    return this.gameLogic.probability;
  }

  /**
   * 重置转盘
   */
  reset() {
    this.renderer.reset();
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    this.renderer.handleResize();
  }

  /**
   * 销毁控制器
   */
  destroy() {
    this.renderer.destroy();
    this.gameLogic = null;
    this.renderer = null;
  }
}
