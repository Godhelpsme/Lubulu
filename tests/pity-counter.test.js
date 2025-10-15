/**
 * PityCounter 单元测试
 * 测试保底计数器的状态机逻辑
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PityCounter } from '../src/js/core/app-state.js';

describe('PityCounter', () => {
  describe('初始化', () => {
    it('应正确初始化阈值和计数器', () => {
      const counter = new PityCounter(7);
      assert.equal(counter.threshold, 7);
      assert.equal(counter.consecutiveFails, 0);
    });

    it('默认阈值应为 0', () => {
      const counter = new PityCounter();
      assert.equal(counter.threshold, 0);
    });
  });

  describe('记录结果', () => {
    it('不Lu 应增加连续失败计数', () => {
      const counter = new PityCounter(7);

      counter.record('不Lu');
      assert.equal(counter.consecutiveFails, 1);

      counter.record('不Lu');
      assert.equal(counter.consecutiveFails, 2);
    });

    it('Lu 应重置连续失败计数', () => {
      const counter = new PityCounter(7);

      counter.record('不Lu');
      counter.record('不Lu');
      counter.record('不Lu');
      assert.equal(counter.consecutiveFails, 3);

      counter.record('Lu');
      assert.equal(counter.consecutiveFails, 0);
    });
  });

  describe('保底触发', () => {
    it('阈值为 0 时不应触发保底', () => {
      const counter = new PityCounter(0);

      for (let i = 0; i < 100; i++) {
        counter.record('不Lu');
      }

      assert.equal(counter.shouldTrigger(), false);
    });

    it('连续失败达到阈值时应触发保底', () => {
      const counter = new PityCounter(7);

      for (let i = 0; i < 6; i++) {
        counter.record('不Lu');
        assert.equal(counter.shouldTrigger(), false);
      }

      counter.record('不Lu');
      assert.equal(counter.shouldTrigger(), true);
    });

    it('连续失败超过阈值时应持续触发保底', () => {
      const counter = new PityCounter(7);

      for (let i = 0; i < 10; i++) {
        counter.record('不Lu');
      }

      assert.equal(counter.shouldTrigger(), true);
    });

    it('Lu 后应停止触发保底', () => {
      const counter = new PityCounter(7);

      for (let i = 0; i < 7; i++) {
        counter.record('不Lu');
      }
      assert.equal(counter.shouldTrigger(), true);

      counter.record('Lu');
      assert.equal(counter.shouldTrigger(), false);
    });
  });

  describe('阈值设置', () => {
    it('应正确更新阈值', () => {
      const counter = new PityCounter(5);
      counter.setThreshold(10);
      assert.equal(counter.threshold, 10);
    });

    it('更新阈值不应重置计数器', () => {
      const counter = new PityCounter(5);
      counter.record('不Lu');
      counter.record('不Lu');

      counter.setThreshold(10);
      assert.equal(counter.consecutiveFails, 2);
    });
  });

  describe('重置', () => {
    it('应将连续失败计数重置为 0', () => {
      const counter = new PityCounter(7);

      counter.record('不Lu');
      counter.record('不Lu');
      counter.record('不Lu');

      counter.reset();
      assert.equal(counter.consecutiveFails, 0);
    });

    it('重置不应改变阈值', () => {
      const counter = new PityCounter(7);

      counter.record('不Lu');
      counter.reset();

      assert.equal(counter.threshold, 7);
    });
  });

  describe('序列化和反序列化', () => {
    it('应正确序列化为 JSON', () => {
      const counter = new PityCounter(7);
      counter.record('不Lu');
      counter.record('不Lu');

      const json = counter.toJSON();

      assert.equal(json.threshold, 7);
      assert.equal(json.consecutiveFails, 2);
    });

    it('应正确从 JSON 反序列化', () => {
      const data = {
        threshold: 7,
        consecutiveFails: 3
      };

      const counter = PityCounter.fromJSON(data);

      assert.equal(counter.threshold, 7);
      assert.equal(counter.consecutiveFails, 3);
    });

    it('反序列化后状态应正确', () => {
      const data = {
        threshold: 7,
        consecutiveFails: 7
      };

      const counter = PityCounter.fromJSON(data);
      assert.equal(counter.shouldTrigger(), true);
    });

    it('反序列化缺失字段应使用默认值', () => {
      const counter = PityCounter.fromJSON({});

      assert.equal(counter.threshold, 0);
      assert.equal(counter.consecutiveFails, 0);
    });
  });

  describe('边界情况', () => {
    it('阈值为 1 时第一次不Lu 即触发保底', () => {
      const counter = new PityCounter(1);

      counter.record('不Lu');
      assert.equal(counter.shouldTrigger(), true);
    });

    it('连续 Lu 和不Lu 交替应正确维护计数', () => {
      const counter = new PityCounter(3);

      counter.record('不Lu');
      counter.record('不Lu');
      assert.equal(counter.consecutiveFails, 2);

      counter.record('Lu');
      assert.equal(counter.consecutiveFails, 0);

      counter.record('不Lu');
      assert.equal(counter.consecutiveFails, 1);

      counter.record('Lu');
      assert.equal(counter.consecutiveFails, 0);
    });
  });
});
