/**
 * 游戏逻辑 - 纯函数,可在 Worker 和客户端复用
 */

/**
 * 生成安全随机数 [min, max)
 */
export function getSecureRandom(min, max) {
  const range = max - min;
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return min + (randomBuffer[0] / (0xFFFFFFFF + 1)) * range;
}

/**
 * 游戏逻辑类
 */
export class GameLogic {
  constructor(probability = 1) {
    this.setProbability(probability);
  }

  setProbability(value) {
    this.probability = Math.max(1, Math.min(98, value));
    this.totalSlices = 100;
  }

  get luSliceCount() {
    return this.probability;
  }

  get noLuSliceCount() {
    return this.totalSlices - this.probability;
  }

  /**
   * 执行抽取
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
   * 强制结果 (保底)
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
}
