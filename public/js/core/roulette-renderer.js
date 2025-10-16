/**
 * 转盘渲染器
 */

export class RouletteRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.probability = 1;
    this.totalSlices = 100;
  }

  setProbability(probability) {
    this.probability = probability;
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算角度
    const luAngle = (this.probability / this.totalSlices) * 2 * Math.PI;
    const noLuAngle = 2 * Math.PI - luAngle;

    // 绘制 Lu 扇形 (红色)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + luAngle);
    ctx.closePath();
    ctx.fillStyle = '#F44336';
    ctx.fill();

    // 绘制不Lu扇形 (绿色)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + luAngle, -Math.PI / 2 + luAngle + noLuAngle);
    ctx.closePath();
    ctx.fillStyle = '#4CAF50';
    ctx.fill();

    // 绘制边框
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 绘制中心文字
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.probability}%`, centerX, centerY);
  }

  /**
   * 旋转动画
   */
  async spin(targetSlice) {
    const duration = 3000; // 3秒
    const rotations = 5; // 旋转5圈
    const sliceAngle = (2 * Math.PI) / this.totalSlices;
    const targetAngle = rotations * 2 * Math.PI + targetSlice * sliceAngle;

    const startTime = Date.now();

    return new Promise(resolve => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 缓动函数 (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentAngle = targetAngle * eased;

        // 旋转画布
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(currentAngle);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        this.draw();
        this.ctx.restore();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.draw(); // 恢复原位
          resolve();
        }
      };

      animate();
    });
  }
}
