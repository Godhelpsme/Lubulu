/**
 * Lubulu 转盘核心逻辑
 * 处理转盘绘制、动画和结果计算
 */

import { getSecureRandom, throttle, PerformanceMonitor, Analytics } from '../utils/helpers.js';

/**
 * 转盘配置常量
 */
export const ROULETTE_CONFIG = {
  sliceCount: 99,
  successSlices: 1, // 默认1个Lu扇形，可动态调整
  colors: {
    success: '#F44336', // Lu - 红色
    normal: '#4CAF50',   // 不Lu - 绿色
    text: '#000000',
    border: '#FFFFFF'
  },
  animation: {
    duration: 5000,      // 5秒动画
    minRotations: 12,    // 最少12圈
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }
};

/**
 * 转盘类
 */
export class RouletteManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentAngle = 0;
    this.isSpinning = false;
    this.animationId = null;
    
    // 优化Canvas性能
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // 节流绘制函数
    this.drawThrottled = throttle(() => this.draw(), 16); // 60fps
    
    this.setupCanvas();
  }

  /**
   * 设置Canvas尺寸和DPI
   */
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
  }

  /**
   * 更新转盘配置
   * @param {number} luProbability - Lu的概率（1-98）
   */
  updateConfig(luProbability) {
    ROULETTE_CONFIG.successSlices = luProbability;
    this.draw();
  }

  /**
   * 绘制转盘
   */
  draw() {
    const monitor = PerformanceMonitor.measureTime('Draw Roulette');
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const sliceAngle = (2 * Math.PI) / ROULETTE_CONFIG.sliceCount;
    const successSlices = ROULETTE_CONFIG.successSlices;
    
    // 绘制扇形
    for (let i = 0; i < ROULETTE_CONFIG.sliceCount; i++) {
      const startAngle = i * sliceAngle + this.currentAngle;
      const endAngle = (i + 1) * sliceAngle + this.currentAngle;
      const isSuccess = i < successSlices;
      
      this.drawSlice(startAngle, endAngle, isSuccess, i);
    }
    
    // 绘制中心圆
    this.drawCenter();
    
    monitor.end();
  }

  /**
   * 绘制单个扇形
   */
  drawSlice(startAngle, endAngle, isSuccess, index) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
    this.ctx.closePath();
    
    // 填充颜色
    this.ctx.fillStyle = isSuccess ? 
      ROULETTE_CONFIG.colors.success : 
      ROULETTE_CONFIG.colors.normal;
    this.ctx.fill();
    
    // 绘制边框
    this.ctx.strokeStyle = ROULETTE_CONFIG.colors.border;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 绘制文字（智能分布，避免重叠）
    if (this.shouldDrawText(index, isSuccess)) {
      this.drawSliceText(startAngle, endAngle, isSuccess);
    }
  }

  /**
   * 判断是否应该绘制文字（避免重叠）
   */
  shouldDrawText(index, isSuccess) {
    const successSlices = ROULETTE_CONFIG.successSlices;
    const totalSlices = ROULETTE_CONFIG.sliceCount;
    
    if (isSuccess) {
      // Lu扇形：根据数量决定显示密度
      if (successSlices <= 5) return true;
      if (successSlices <= 20) return index % 2 === 0;
      if (successSlices <= 50) return index % 5 === 0;
      return index % 10 === 0;
    } else {
      // 不Lu扇形：根据数量决定显示密度
      const normalSlices = totalSlices - successSlices;
      if (normalSlices <= 20) return (index - successSlices) % 2 === 0;
      if (normalSlices <= 50) return (index - successSlices) % 5 === 0;
      return (index - successSlices) % 10 === 0;
    }
  }

  /**
   * 绘制扇形文字
   */
  drawSliceText(startAngle, endAngle, isSuccess) {
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = this.radius * 0.7;
    const x = this.centerX + Math.cos(midAngle) * textRadius;
    const y = this.centerY + Math.sin(midAngle) * textRadius;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(midAngle + Math.PI / 2);
    
    this.ctx.fillStyle = ROULETTE_CONFIG.colors.text;
    this.ctx.font = 'bold 14px Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const text = isSuccess ? 'Lu!' : '不Lu';
    this.ctx.fillText(text, 0, 0);
    
    this.ctx.restore();
  }

  /**
   * 绘制中心圆
   */
  drawCenter() {
    const centerRadius = 30;
    
    // 绘制外圆
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, centerRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#673AB7';
    this.ctx.fill();
    this.ctx.strokeStyle = ROULETTE_CONFIG.colors.border;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // 绘制内圆
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, centerRadius - 8, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
  }

  /**
   * 执行转盘动画
   * @returns {Promise<Object>} 转盘结果
   */
  async spin() {
    if (this.isSpinning) {
      throw new Error('转盘正在旋转中');
    }

    const monitor = PerformanceMonitor.measureSpinTime();
    this.isSpinning = true;

    try {
      // 计算结果
      const result = this.calculateResult();
      
      // 计算目标角度
      const targetAngle = this.calculateTargetAngle(result);
      
      // 执行动画
      await this.animateToAngle(targetAngle);
      
      // 记录分析数据
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

  /**
   * 计算转盘结果
   * @returns {Object} 转盘结果
   */
  calculateResult() {
    const random = getSecureRandom(0, ROULETTE_CONFIG.sliceCount);
    const sliceIndex = Math.floor(random);
    const isSuccess = sliceIndex < ROULETTE_CONFIG.successSlices;
    
    return {
      isSuccess,
      sliceIndex,
      angle: (sliceIndex / ROULETTE_CONFIG.sliceCount) * 360,
      isPityTriggered: false // 这个值由调用方设置
    };
  }

  /**
   * 计算目标角度
   */
  calculateTargetAngle(result) {
    const sliceAngle = 360 / ROULETTE_CONFIG.sliceCount;
    const baseAngle = result.sliceIndex * sliceAngle;
    const randomOffset = getSecureRandom(-sliceAngle/2, sliceAngle/2);
    const minRotations = ROULETTE_CONFIG.animation.minRotations;
    
    return this.currentAngle + (minRotations * 360) + baseAngle + randomOffset;
  }

  /**
   * 动画到指定角度
   */
  async animateToAngle(targetAngle) {
    return new Promise((resolve) => {
      const startAngle = this.currentAngle;
      const totalRotation = targetAngle - startAngle;
      const duration = ROULETTE_CONFIG.animation.duration;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
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

  /**
   * 缓动函数
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 停止动画
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isSpinning = false;
  }

  /**
   * 重置转盘
   */
  reset() {
    this.stopAnimation();
    this.currentAngle = 0;
    this.draw();
  }

  /**
   * 销毁转盘（清理资源）
   */
  destroy() {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    this.setupCanvas();
    this.draw();
  }
}