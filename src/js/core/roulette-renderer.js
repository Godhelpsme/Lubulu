/**
 * 转盘渲染器 v2 - 纯渲染逻辑
 *
 * 原则:
 * 1. 只负责绘制和动画,不包含业务逻辑
 * 2. 接收配置和目标位置,渲染结果
 * 3. 与游戏逻辑完全解耦
 *
 * 设计说明:
 * - 转盘绘制100个扇形是视觉设计需求,为了"看起来公平"
 * - 从性能角度看只需要2个扇形(Lu/不Lu),但用户体验需要密集的扇形分布
 * - 已优化: shouldDrawText() 智能控制文字密度,避免重叠
 */

/**
 * 转盘渲染器
 */
export class RouletteRenderer {
  constructor(canvas) {
    if (!canvas) {
      throw new Error('Canvas element is required');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentAngle = 0;
    this.isAnimating = false;
    this.animationId = null;

    // 优化Canvas性能
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // 默认配置
    this.config = {
      totalSlices: 100,
      luSlices: 1,
      noLuSlices: 99,
      colors: {
        lu: '#F44336',
        noLu: '#4CAF50',
        border: '#FFFFFF'
      }
    };

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
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.draw();
  }

  /**
   * 绘制转盘
   *
   * 性能说明: 绘制100个扇形是为了视觉效果,不是技术限制
   * 如果追求极致性能,可改为只画2个扇形(Lu/不Lu)
   * 但用户需要看到"很多小格子"才觉得公平,所以保持100个
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const sliceAngle = (2 * Math.PI) / this.config.totalSlices;

    // 绘制扇形
    for (let i = 0; i < this.config.totalSlices; i++) {
      const startAngle = i * sliceAngle + this.currentAngle;
      const endAngle = (i + 1) * sliceAngle + this.currentAngle;
      const isLu = i < this.config.luSlices;

      this.drawSlice(startAngle, endAngle, isLu, i);
    }

    // 绘制中心圆
    this.drawCenter();
  }

  /**
   * 绘制单个扇形
   */
  drawSlice(startAngle, endAngle, isLu, index) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.arc(this.centerX, this.centerY, this.radius, startAngle, endAngle);
    this.ctx.closePath();

    // 填充颜色
    this.ctx.fillStyle = isLu ? this.config.colors.lu : this.config.colors.noLu;
    this.ctx.fill();

    // 绘制边框
    this.ctx.strokeStyle = this.config.colors.border;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 智能绘制文字(避免重叠)
    if (this.shouldDrawText(index, isLu)) {
      this.drawSliceText(startAngle, endAngle, isLu);
    }
  }

  /**
   * 判断是否应该绘制文字
   */
  shouldDrawText(index, isLu) {
    const luSlices = this.config.luSlices;
    const noLuSlices = this.config.noLuSlices;

    if (isLu) {
      // Lu扇形
      if (luSlices <= 5) return true;
      if (luSlices <= 20) return index % 2 === 0;
      if (luSlices <= 50) return index % 5 === 0;
      return index % 10 === 0;
    } else {
      // 不Lu扇形
      if (noLuSlices <= 20) return (index - luSlices) % 2 === 0;
      if (noLuSlices <= 50) return (index - luSlices) % 5 === 0;
      return (index - luSlices) % 10 === 0;
    }
  }

  /**
   * 绘制扇形文字
   */
  drawSliceText(startAngle, endAngle, isLu) {
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = this.radius * 0.7;
    const x = this.centerX + Math.cos(midAngle) * textRadius;
    const y = this.centerY + Math.sin(midAngle) * textRadius;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(midAngle + Math.PI / 2);

    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 14px Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const text = isLu ? 'Lu!' : '不Lu';
    this.ctx.fillText(text, 0, 0);

    this.ctx.restore();
  }

  /**
   * 绘制中心圆
   */
  drawCenter() {
    const centerRadius = 30;

    // 外圆
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, centerRadius, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#673AB7';
    this.ctx.fill();
    this.ctx.strokeStyle = this.config.colors.border;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // 内圆
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, centerRadius - 8, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
  }

  /**
   * 动画到指定扇形索引
   * @param {number} targetSliceIndex - 目标扇形索引
   * @param {number} duration - 动画时长(ms)
   * @returns {Promise<void>}
   */
  async animateToSlice(targetSliceIndex, duration = 5000) {
    if (this.isAnimating) {
      throw new Error('Animation already in progress');
    }

    this.isAnimating = true;

    try {
      // 计算目标角度
      const sliceAngle = (2 * Math.PI) / this.config.totalSlices;
      const baseAngle = targetSliceIndex * sliceAngle;
      const randomOffset = (Math.random() - 0.5) * sliceAngle * 0.8;
      const minRotations = 12;
      const targetAngle = this.currentAngle + (minRotations * 2 * Math.PI) + baseAngle + randomOffset;

      await this.animateToAngle(targetAngle, duration);

    } finally {
      this.isAnimating = false;
    }
  }

  /**
   * 动画到指定角度
   */
  async animateToAngle(targetAngle, duration) {
    return new Promise((resolve) => {
      const startAngle = this.currentAngle;
      const totalRotation = targetAngle - startAngle;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 缓动函数: easeOutCubic
        const eased = 1 - Math.pow(1 - progress, 3);

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
   * 停止动画
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
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
   * 处理窗口大小变化
   */
  handleResize() {
    this.setupCanvas();
    this.draw();
  }

  /**
   * 销毁渲染器
   */
  destroy() {
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
  }
}
