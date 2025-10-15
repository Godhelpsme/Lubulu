/**
 * GameLogic 单元测试
 * 使用 Node.js 原生测试框架 (Node 18+)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameLogic } from '../src/js/core/game-logic.js';

describe('GameLogic', () => {
  describe('概率设置', () => {
    it('应正确设置概率范围 1-98', () => {
      const logic = new GameLogic(50);
      assert.equal(logic.probability, 50);
    });

    it('应将小于 1 的概率修正为 1', () => {
      const logic = new GameLogic(0);
      assert.equal(logic.probability, 1);
    });

    it('应将大于 98 的概率修正为 98', () => {
      const logic = new GameLogic(100);
      assert.equal(logic.probability, 98);
    });
  });

  describe('扇形数量计算', () => {
    it('Lu 扇形数量应等于概率值', () => {
      const logic = new GameLogic(30);
      assert.equal(logic.luSliceCount, 30);
    });

    it('不Lu 扇形数量应等于 100 - 概率值', () => {
      const logic = new GameLogic(30);
      assert.equal(logic.noLuSliceCount, 70);
    });

    it('总扇形数量应为 100', () => {
      const logic = new GameLogic(50);
      assert.equal(logic.totalSlices, 100);
    });
  });

  describe('抽取结果', () => {
    it('应返回有效的结果对象', () => {
      const logic = new GameLogic(50);
      const result = logic.roll();

      assert.ok(typeof result.isLu === 'boolean');
      assert.ok(typeof result.sliceIndex === 'number');
      assert.equal(result.probability, 50);
    });

    it('sliceIndex 应在 0-99 范围内', () => {
      const logic = new GameLogic(50);

      for (let i = 0; i < 100; i++) {
        const result = logic.roll();
        assert.ok(result.sliceIndex >= 0 && result.sliceIndex < 100);
      }
    });

    it('概率为 1 时，Lu 的概率应接近 1%', () => {
      const logic = new GameLogic(1);
      let luCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (logic.roll().isLu) luCount++;
      }

      const actualProbability = (luCount / iterations) * 100;
      // 允许 0.5% 的误差范围
      assert.ok(Math.abs(actualProbability - 1) < 0.5);
    });

    it('概率为 50 时，Lu 和不Lu 的概率应接近 50%', () => {
      const logic = new GameLogic(50);
      let luCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (logic.roll().isLu) luCount++;
      }

      const actualProbability = (luCount / iterations) * 100;
      // 允许 2% 的误差范围
      assert.ok(Math.abs(actualProbability - 50) < 2);
    });
  });

  describe('强制结果 (保底)', () => {
    it('强制 Lu 时应总是返回 Lu', () => {
      const logic = new GameLogic(1);

      for (let i = 0; i < 100; i++) {
        const result = logic.forceResult(true);
        assert.equal(result.isLu, true);
        assert.equal(result.isForced, true);
      }
    });

    it('强制不Lu 时应总是返回不Lu', () => {
      const logic = new GameLogic(98);

      for (let i = 0; i < 100; i++) {
        const result = logic.forceResult(false);
        assert.equal(result.isLu, false);
        assert.equal(result.isForced, true);
      }
    });

    it('强制 Lu 时 sliceIndex 应在 Lu 区域', () => {
      const logic = new GameLogic(30);

      for (let i = 0; i < 100; i++) {
        const result = logic.forceResult(true);
        assert.ok(result.sliceIndex < 30);
      }
    });

    it('强制不Lu 时 sliceIndex 应在不Lu 区域', () => {
      const logic = new GameLogic(30);

      for (let i = 0; i < 100; i++) {
        const result = logic.forceResult(false);
        assert.ok(result.sliceIndex >= 30);
      }
    });
  });

  describe('转盘配置', () => {
    it('应返回正确的转盘配置', () => {
      const logic = new GameLogic(30);
      const config = logic.getWheelConfig();

      assert.equal(config.totalSlices, 100);
      assert.equal(config.luSlices, 30);
      assert.equal(config.noLuSlices, 70);
      assert.ok(config.colors.lu);
      assert.ok(config.colors.noLu);
    });
  });
});
