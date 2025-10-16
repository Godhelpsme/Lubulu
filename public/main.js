/**
 * 主应用 - Lubulu Edge
 */

import api from './js/api/client.js';
import { RouletteRenderer } from './js/core/roulette-renderer.js';
import { Calendar } from './js/core/calendar.js';

class App {
  constructor() {
    this.settings = null;
    this.pityCounter = null;
    this.history = {};
    this.stats = {};

    this.initElements();
    this.initRoulette();
    this.bindEvents();
    this.loadData();
  }

  initElements() {
    // 转盘相关
    this.spinBtn = document.getElementById('spinBtn');
    this.resultDisplay = document.getElementById('resultDisplay');
    this.confirmResultBtn = document.getElementById('confirmResult');

    // 统计相关
    this.luCountEl = document.getElementById('luCount');
    this.noLuCountEl = document.getElementById('noLuCount');
    this.totalCountEl = document.getElementById('totalCount');
    this.successRateEl = document.getElementById('successRate');

    // 设置相关
    this.settingsBtn = document.getElementById('settingsBtn');
    this.settingsDialog = document.getElementById('settingsDialog');
    this.settingsSaveBtn = document.getElementById('settingsSaveBtn');
    this.settingsCancelBtn = document.getElementById('settingsCancelBtn');
    this.overlay = document.getElementById('overlay');

    // 设置表单
    this.luProbabilityInput = document.getElementById('luProbability');
    this.luProbabilityValue = document.getElementById('luProbabilityValue');
    this.pityDaysInput = document.getElementById('pityDays');
    this.multiModeInput = document.getElementById('multiMode');

    // UUID 备份
    this.exportUuidBtn = document.getElementById('exportUuidBtn');
    this.importUuidBtn = document.getElementById('importUuidBtn');
    this.uuidFileInput = document.getElementById('uuidFileInput');
    this.currentUuidEl = document.getElementById('currentUuid');

    // 日历
    this.calendarEl = document.getElementById('calendar');
  }

  initRoulette() {
    const canvas = document.getElementById('rouletteCanvas');
    this.roulette = new RouletteRenderer(canvas);
  }

  bindEvents() {
    // 抽取按钮
    this.spinBtn.addEventListener('click', () => this.handleSpin());
    this.confirmResultBtn.addEventListener('click', () => this.hideResult());

    // 设置对话框
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.settingsSaveBtn.addEventListener('click', () => this.saveSettings());
    this.settingsCancelBtn.addEventListener('click', () => this.closeSettings());
    this.overlay.addEventListener('click', () => this.closeSettings());

    // 概率滑块
    this.luProbabilityInput.addEventListener('input', (e) => {
      this.luProbabilityValue.textContent = e.target.value;
      this.roulette.setProbability(parseInt(e.target.value));
    });

    // UUID 备份
    this.exportUuidBtn.addEventListener('click', () => this.exportUuid());
    this.importUuidBtn.addEventListener('click', () => this.uuidFileInput.click());
    this.uuidFileInput.addEventListener('change', (e) => this.importUuid(e.target.files[0]));
  }

  async loadData() {
    try {
      // 加载设置
      const { settings, pityCounter } = await api.getSettings();
      this.settings = settings;
      this.pityCounter = pityCounter;

      // 更新转盘
      this.roulette.setProbability(settings.luProbability);

      // 加载历史
      const { history } = await api.getHistory();
      this.history = history;

      // 加载统计
      const { stats } = await api.getStats();
      this.updateStats(stats);

      // 渲染日历
      this.calendar = new Calendar(this.calendarEl, history);
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败: ' + error.message);
    }
  }

  async handleSpin() {
    if (this.spinBtn.disabled) return;

    this.spinBtn.disabled = true;
    this.spinBtn.textContent = '抽取中...';

    try {
      const result = await api.spin();

      // 播放旋转动画
      await this.roulette.spin(result.sliceIndex);

      // 显示结果
      this.showResult(result);

      // 更新数据
      this.history[result.date] = {
        result: result.result,
        isPityTriggered: result.isPityTriggered
      };

      // 刷新日历和统计
      this.calendar.updateHistory(this.history);
      const { stats } = await api.getStats();
      this.updateStats(stats);

    } catch (error) {
      alert(error.message);
    } finally {
      this.spinBtn.disabled = false;
      this.spinBtn.textContent = 'SPIN';
    }
  }

  showResult(result) {
    const resultText = this.resultDisplay.querySelector('.result-text');
    const pityNotice = this.resultDisplay.querySelector('.pity-notice');

    resultText.textContent = result.isLu ? '🔴 Lu!' : '🟢 不Lu!';
    resultText.className = 'result-text ' + (result.isLu ? 'lu' : 'no-lu');

    if (result.isPityTriggered) {
      pityNotice.classList.remove('hidden');
    } else {
      pityNotice.classList.add('hidden');
    }

    this.resultDisplay.classList.remove('hidden');
  }

  hideResult() {
    this.resultDisplay.classList.add('hidden');
  }

  updateStats(stats) {
    this.luCountEl.textContent = stats.luCount || 0;
    this.noLuCountEl.textContent = stats.noLuCount || 0;
    this.totalCountEl.textContent = stats.total || 0;
    this.successRateEl.textContent = stats.successRate + '%';
  }

  openSettings() {
    // 填充当前设置
    this.luProbabilityInput.value = this.settings.luProbability;
    this.luProbabilityValue.textContent = this.settings.luProbability;
    this.pityDaysInput.value = this.settings.pityDays;
    this.multiModeInput.checked = this.settings.multiMode;

    // 显示当前 UUID
    this.currentUuidEl.textContent = api.getUserId();

    this.settingsDialog.classList.remove('hidden');
    this.overlay.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsDialog.classList.add('hidden');
    this.overlay.classList.add('hidden');
  }

  async saveSettings() {
    const newSettings = {
      luProbability: parseInt(this.luProbabilityInput.value),
      pityDays: parseInt(this.pityDaysInput.value),
      multiMode: this.multiModeInput.checked
    };

    try {
      await api.saveSettings(newSettings, this.pityCounter);
      this.settings = newSettings;
      this.roulette.setProbability(newSettings.luProbability);
      this.closeSettings();
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  }

  // UUID 导出功能
  exportUuid() {
    const uuid = api.getUserId();
    const blob = new Blob([uuid], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lubulu-backup-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('账号ID已导出!请妥善保管此文件。');
  }

  // UUID 导入功能
  async importUuid(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const uuid = e.target.result.trim();

      // 验证 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(uuid)) {
        alert('无效的账号ID格式!');
        return;
      }

      if (confirm('导入账号ID将替换当前账号的所有数据。确定要继续吗?')) {
        api.setUserId(uuid);
        alert('账号ID已导入!页面将重新加载。');
        location.reload();
      }
    };
    reader.readAsText(file);
  }
}

// 启动应用
new App();
