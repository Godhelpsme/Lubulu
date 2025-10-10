/**
 * Lubulu 转盘核心逻辑 (性能优化版)
 * 使用离屏Canvas缓存提升渲染性能
 */

import { getSecureRandom, throttle, PerformanceMonitor, Analytics } from '../utils/helpers.js';

export const ROULETTE_CONFIG = {
  sliceCount: 99,
  successSlices: 1,
  colors: {
    success: '#F44336',
    normal: '#4CAF50',
    text: '#000000',
    border: '#FFFFFF'
  },
  animation: {
    duration: 5000,
    minRotations: 12,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }
};

export class RouletteManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.currentAngle = 0;
    this.isSpinning = false;
    this.animationId = null;

    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.cacheValid = false;

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this.drawThrottled = throttle(() => this.draw(), 16);

    this.setupCanvas();
    this.createOffscreenCache();
  }

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.radius = Math.min(this.centerX, this.centerY) - 10;

    this.cacheValid = false;
  }

  createOffscreenCache() {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    }

    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    const dpr = window.devicePixelRatio || 1;
    this.offscreenCtx.scale(dpr, dpr);
  }

  updateConfig(luProbability) {
    ROULETTE_CONFIG.successSlices = luProbability;
    this.cacheValid = false;
    this.renderToCache();
    this.draw();
  }

  renderToCache() {
    if (this.cacheValid) return;

    const monitor = PerformanceMonitor.measureTime('Cache Roulette');

    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    const sliceAngle = (2 * Math.PI) / ROULETTE_CONFIG.sliceCount;
    const successSlices = ROULETTE_CONFIG.successSlices;

    for (let i = 0; i < ROULETTE_CONFIG.sliceCount; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;
      const isSuccess = i < successSlices;

      this.drawSliceToCache(ctx, startAngle, endAngle, isSuccess, i);
    }

    this.drawCenterToCache(ctx);

    this.cacheValid = true;
    monitor.end();
  }

  drawSliceToCache(ctx, startAngle, endAngle, isSuccess, index) {
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = isSuccess ? ROULETTE_CONFIG.colors.success : ROULETTE_CONFIG.colors.normal;
    ctx.fill();

    ctx.strokeStyle = ROULETTE_CONFIG.colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.shouldDrawText(index, isSuccess)) {
      this.drawSliceText(ctx, startAngle, endAngle, isSuccess);
    }

    ctx.restore();
  }

  drawCenterToCache(ctx) {
    const centerRadius = 30;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#673AB7';
    ctx.fill();
    ctx.strokeStyle = ROULETTE_CONFIG.colors.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, centerRadius - 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  draw() {
    if (!this.cacheValid) {
      this.renderToCache();
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.currentAngle);
    this.ctx.translate(-this.centerX, -this.centerY);

    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    this.ctx.restore();
  }

  shouldDrawText(index, isSuccess) {
    const successSlices = ROULETTE_CONFIG.successSlices;
    const totalSlices = ROULETTE_CONFIG.sliceCount;

    if (isSuccess) {
      if (successSlices <= 5) return true;
      if (successSlices <= 20) return index % 2 === 0;
      if (successSlices <= 50) return index % 5 === 0;
      return index % 10 === 0;
    } else {
      const normalSlices = totalSlices - successSlices;
      if (normalSlices <= 20) return (index - successSlices) % 2 === 0;
      if (normalSlices <= 50) return (index - successSlices) % 5 === 0;
      return (index - successSlices) % 10 === 0;
    }
  }

  drawSliceText(ctx, startAngle, endAngle, isSuccess) {
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = this.radius * 0.7;
    const x = this.centerX + Math.cos(midAngle) * textRadius;
    const y = this.centerY + Math.sin(midAngle) * textRadius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(midAngle + Math.PI / 2);

    ctx.fillStyle = ROULETTE_CONFIG.colors.text;
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = isSuccess ? 'Lu!' : '不Lu';
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  async spin() {
    if (this.isSpinning) {
      throw new Error('转盘正在旋转中');
    }

    const monitor = PerformanceMonitor.measureSpinTime();
    this.isSpinning = true;

    try {
      const result = this.calculateResult();
      const targetAngle = this.calculateTargetAngle(result);

      await this.animateToAngle(targetAngle);

      Analytics.trackEvent('spin_completed', {
        result: result.isSuccess ? 'Lu' : '不Lu',
        isPityTriggered: result.isPityTriggered,
        probability: ROULETTE_CONFIG.successSlices
      });

      monitor.end();
      return result;
    } finally {
      this.isSpinning = false;
    }
  }

  calculateResult() {
    const random = getSecureRandom(0, ROULETTE_CONFIG.sliceCount);
    const sliceIndex = Math.floor(random);
    const isSuccess = sliceIndex < ROULETTE_CONFIG.successSlices;

    return {
      isSuccess,
      sliceIndex,
      angle: (sliceIndex / ROULETTE_CONFIG.sliceCount) * 360,
      isPityTriggered: false
    };
  }

  calculateTargetAngle(result) {
    const sliceAngle = 360 / ROULETTE_CONFIG.sliceCount;
    const baseAngle = result.sliceIndex * sliceAngle;
    const randomOffset = getSecureRandom(-sliceAngle / 2, sliceAngle / 2);
    const minRotations = ROULETTE_CONFIG.animation.minRotations;

    return this.currentAngle + (minRotations * 360) + baseAngle + randomOffset;
  }

  async animateToAngle(targetAngle) {
    return new Promise((resolve) => {
      const startAngle = this.currentAngle;
      const totalRotation = targetAngle - startAngle;
      const duration = ROULETTE_CONFIG.animation.duration;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const eased = this.easeOutCubic(progress);

        this.currentAngle = startAngle + totalRotation * eased;
        this.draw();

        if (progress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.animationId = null;
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isSpinning = false;
  }

  reset() {
    this.stopAnimation();
    this.currentAngle = 0;
    this.draw();
  }

  handleResize() {
    this.setupCanvas();
    this.createOffscreenCache();
    this.renderToCache();
    this.draw();
  }

  destroy() {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}
