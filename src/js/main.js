/**
 * Lubulu 主应用 v2 - 重构版
 *
 * 重大改进:
 * 1. 使用AppState统一管理状态
 * 2. 用RouletteController替代直接管理转盘
 * 3. 用StorageManager v2替代复杂的存储逻辑
 * 4. 消除所有特殊情况判断
 */

// UI配置 - 数据驱动,消除if/else
const RESULT_UI_CONFIG = {
  Lu: {
    icon: '🎉',
    text: 'Lu!',
    color: '#F44336',
    showChoice: true,
    showActions: false
  },
  '不Lu': {
    icon: '💪',
    text: '不Lu',
    color: '#4CAF50',
    showChoice: false,
    showActions: true
  }
};

import { RouletteController } from './core/roulette-controller.js';
import { AppState } from './core/app-state.js';
import { CalendarManager } from './core/calendar.js';
import { StatisticsManager } from './core/statistics.js';
import { StorageManager } from './storage/storage-manager.js';
import { DialogManager, NotificationManager, ConfirmDialog, AudioManager } from './ui/ui-manager.js';
import { debounce } from './utils/helpers.js';

/**
 * Lubulu 主应用 v2
 */
export class LubuluApp {
  constructor() {
    // 核心状态 - 单一来源
    this.appState = new AppState();

    // 管理器实例
    this.managers = {
      roulette: null,
      calendar: null,
      statistics: null,
      storage: null,
      dialog: null,
      notification: null,
      audio: null
    };

    // DOM 元素
    this.elements = {};
    this.confirmDialog = null;

    // 防抖函数
    this.debouncedUpdateStats = debounce(() => {
      this.managers.statistics?.updateStats();
    }, 300);

    this.init();
  }

  /**
   * 初始化应用
   */
  async init() {
    try {
      await this.initializeManagers();
      await this.initializeDOM();
      await this.loadInitialData();
      this.bindEvents();
      this.setupGlobalErrorHandling();

      console.log('Lubulu App v3.0-slim initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Lubulu App:', error);
      this.showCriticalError('应用初始化失败: ' + error.message);
    }
  }

  /**
   * 初始化管理器
   */
  async initializeManagers() {
    // 存储管理器
    this.managers.storage = new StorageManager();

    // UI 管理器
    this.managers.dialog = new DialogManager();
    this.managers.notification = new NotificationManager();
    this.managers.audio = new AudioManager();

    // 确认对话框
    this.confirmDialog = new ConfirmDialog(this.managers.dialog);
  }

  /**
   * 初始化DOM元素
   */
  async initializeDOM() {
    // 获取DOM元素
    this.elements = {
      canvas: document.getElementById('rouletteCanvas'),
      spinBtn: document.getElementById('spinBtn'),
      tooltip: document.getElementById('tooltip'),
      resultDisplay: document.getElementById('resultDisplay'),
      resultChoice: document.getElementById('resultChoice'),
      resultActions: document.getElementById('resultActions'),
      pityNotice: document.getElementById('pityNotice'),
      calendar: document.getElementById('calendar'),

      // 统计元素
      successCount: document.getElementById('successCount'),
      failureCount: document.getElementById('failureCount'),
      totalCount: document.getElementById('totalCount'),
      successRate: document.getElementById('successRate'),

      // 设置元素
      settingsBtn: document.getElementById('settingsBtn'),
      settingsDialog: document.getElementById('settingsDialog'),
      luProbabilitySlider: document.getElementById('luProbability'),
      luProbabilityValue: document.getElementById('luProbabilityValue'),
      pityDaysInput: document.getElementById('pityDays'),
      singleModeBtn: document.getElementById('singleModeBtn'),
      multiModeBtn: document.getElementById('multiModeBtn'),

      // 按钮元素
      chooseYes: document.getElementById('chooseYes'),
      chooseNo: document.getElementById('chooseNo'),
      shareResult: document.getElementById('shareResult'),
      confirmResult: document.getElementById('confirmResult'),
      exportData: document.getElementById('exportDataBtn'),
      importData: document.getElementById('importDataBtn'),
      settingsSave: document.getElementById('settingsSaveBtn'),
      settingsCancel: document.getElementById('settingsCancelBtn')
    };

    // 验证必需元素
    const requiredElements = ['canvas', 'spinBtn', 'calendar'];
    const missing = requiredElements.filter(key => !this.elements[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required DOM elements: ${missing.join(', ')}`);
    }

    // 初始化转盘控制器
    this.managers.roulette = new RouletteController(this.elements.canvas);

    // 初始化日历和统计
    this.managers.calendar = new CalendarManager(this.elements.calendar, this.managers.storage);
    this.managers.statistics = new StatisticsManager({
      successCount: this.elements.successCount,
      failureCount: this.elements.failureCount,
      totalCount: this.elements.totalCount,
      successRate: this.elements.successRate
    }, this.managers.storage);
  }

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    try {
      // 加载设置
      const settings = await this.managers.storage.getSettings();
      this.applySettings(settings);

      // 加载保底计数器
      const pityData = await this.managers.storage.getPityCounter();
      if (pityData) {
        this.appState.pityCounter.consecutiveFails = pityData.consecutiveFails || 0;
        this.appState.pityCounter.threshold = pityData.threshold || 0;
      }

      // 更新统计
      await this.managers.statistics.init();

      // 检查今日状态
      await this.checkTodayStatus();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.managers.notification.error('加载数据失败: ' + error.message);
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 转盘相关事件
    this.elements.spinBtn?.addEventListener('click', () => this.handleSpinClick());

    // 结果选择事件
    this.elements.chooseYes?.addEventListener('click', () => this.handleResultChoice(true));
    this.elements.chooseNo?.addEventListener('click', () => this.handleResultChoice(false));

    // 结果确认事件
    this.elements.confirmResult?.addEventListener('click', () => this.handleResultConfirm());
    this.elements.shareResult?.addEventListener('click', () => this.handleShareResult());

    // 设置相关事件
    this.elements.settingsBtn?.addEventListener('click', () => this.showSettings());
    this.elements.settingsSave?.addEventListener('click', () => this.saveSettings());
    this.elements.settingsCancel?.addEventListener('click', () => this.cancelSettings());

    // 概率滑块事件
    this.elements.luProbabilitySlider?.addEventListener('input', (e) => {
      this.elements.luProbabilityValue.textContent = e.target.value;
      this.managers.roulette?.setProbability(parseInt(e.target.value));
    });

    // 模式切换事件
    this.elements.singleModeBtn?.addEventListener('click', () => this.setMode('single'));
    this.elements.multiModeBtn?.addEventListener('click', () => this.setMode('multi'));

    // 数据管理事件
    this.elements.exportData?.addEventListener('click', () => this.exportData());
    this.elements.importData?.addEventListener('click', () => this.importData());

    // 日历事件
    this.managers.calendar?.setDateClickHandler((date) => this.handleDateClick(date));

    // 窗口事件
    window.addEventListener('resize', debounce(() => this.handleResize(), 250));
    window.addEventListener('beforeunload', () => this.handleBeforeUnload());

    // 用户交互恢复音频
    document.addEventListener('click', () => {
      this.managers.audio?.resumeContext();
    }, { once: true });

    // 数据更新事件监听
    window.addEventListener('dataUpdated', (e) => {
      this.handleDataUpdated(e.detail);
    });
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }

  /**
   * 处理转盘点击 - 简化版,无复杂if判断
   */
  async handleSpinClick() {
    // 检查日期变化
    this.appState.checkAndUpdateDate();

    // 统一的canSpin检查
    const canSpinResult = this.appState.canSpin();
    if (!canSpinResult.allowed) {
      if (canSpinResult.reason === 'already_spun') {
        this.managers.notification.warning('今日已经抽取过了');
      }
      return;
    }

    try {
      // 单次模式需要确认
      if (this.appState.config.mode === 'single') {
        const confirmed = await this.confirmDialog.show({
          message: '确定今日要抽取吗?',
          confirmText: '确定抽取'
        });

        if (!confirmed) return;
      }

      await this.performSpin();
    } catch (error) {
      console.error('Spin failed:', error);
      this.managers.notification.error(error.message);
    }
  }

  /**
   * 执行转盘抽取 - 简化版
   */
  async performSpin() {
    this.appState.isSpinning = true;
    this.updateSpinButton();

    try {
      // 播放音效
      this.managers.audio?.play('spin');

      // 检查保底
      const shouldTriggerPity = this.appState.pityCounter.shouldTrigger();

      let result;
      if (shouldTriggerPity) {
        // 保底抽取
        result = await this.managers.roulette.spinWithPity();
      } else {
        // 正常抽取
        result = await this.managers.roulette.spin();
      }

      // 播放结果音效
      this.managers.audio?.play(result.isLu ? 'success' : 'failure');

      // 显示结果
      this.showSpinResult(result);
    } catch (error) {
      this.appState.isSpinning = false;
      this.updateSpinButton();
      throw error;
    }
  }

  /**
   * 显示转盘结果 - 数据驱动,消除if/else
   */
  showSpinResult(result) {
    const resultDisplay = this.elements.resultDisplay;
    if (!resultDisplay) return;

    // 获取UI配置
    const uiConfig = RESULT_UI_CONFIG[result.result];
    if (!uiConfig) {
      console.error('Unknown result type:', result.result);
      return;
    }

    // 显示结果界面
    resultDisplay.classList.remove('hidden');

    // 设置结果内容(数据驱动)
    const resultIcon = resultDisplay.querySelector('.result-icon');
    const resultText = resultDisplay.querySelector('.result-text');
    resultIcon.textContent = uiConfig.icon;
    resultText.textContent = uiConfig.text;
    resultText.style.color = uiConfig.color;

    // 显示保底提示
    if (result.isPityTriggered) {
      this.elements.pityNotice?.classList.remove('hidden');
    }

    // 根据配置显示对应的UI元素
    if (uiConfig.showChoice) {
      this.elements.resultChoice?.classList.remove('hidden');
    }

    if (uiConfig.showActions) {
      this.saveSpinResultDirectly(result.result, result.isPityTriggered);
      this.elements.resultActions?.classList.remove('hidden');
    }
  }

  /**
   * 直接保存结果(用于不Lu结果)
   */
  async saveSpinResultDirectly(result, isPityTriggered = false) {
    // 记录到AppState
    this.appState.recordSpin(result, isPityTriggered);

    // 持久化
    await this.managers.storage.saveHistoryRecord(
      this.appState.today.date,
      result,
      isPityTriggered
    );

    await this.managers.storage.savePityCounter(this.appState.pityCounter.toJSON());

    // 更新UI
    this.updateSpinButton();
    this.debouncedUpdateStats();
    this.managers.calendar?.updateDisplay();
  }

  /**
   * 处理结果选择
   */
  async handleResultChoice(chooseLu) {
    try {
      const finalResult = chooseLu ? 'Lu' : '不Lu';

      // 隐藏选择界面
      this.elements.resultChoice?.classList.add('hidden');

      // 更新结果显示
      const resultText = this.elements.resultDisplay?.querySelector('.result-text');
      if (resultText) {
        resultText.textContent = finalResult;
        resultText.style.color = chooseLu ? '#F44336' : '#4CAF50';
      }

      // 保存结果
      await this.saveSpinResultDirectly(finalResult, this.elements.pityNotice && !this.elements.pityNotice.classList.contains('hidden'));

      // 显示操作按钮
      this.elements.resultActions?.classList.remove('hidden');
    } catch (error) {
      console.error('Failed to handle result choice:', error);
      this.managers.notification.error('保存结果失败');
    }
  }

  /**
   * 处理结果确认
   */
  handleResultConfirm() {
    // 如果Lu结果还没有选择,默认保存为不Lu
    if (!this.elements.resultChoice?.classList.contains('hidden')) {
      this.handleResultChoice(false);
      return;
    }

    // 重置状态
    this.resetSpinState();
  }

  /**
   * 重置转盘状态
   */
  resetSpinState() {
    this.appState.isSpinning = false;

    // 隐藏结果显示
    this.elements.resultDisplay?.classList.add('hidden');
    this.elements.resultChoice?.classList.add('hidden');
    this.elements.resultActions?.classList.add('hidden');
    this.elements.pityNotice?.classList.add('hidden');

    // 更新按钮状态
    this.updateSpinButton();
  }

  /**
   * 更新转盘按钮状态 - 简化版
   */
  updateSpinButton() {
    const spinBtn = this.elements.spinBtn;
    const tooltip = this.elements.tooltip;

    if (!spinBtn) return;

    if (this.appState.isSpinning) {
      spinBtn.textContent = '转动中...';
      spinBtn.disabled = true;
      tooltip?.classList.add('hidden');
      return;
    }

    const canSpinResult = this.appState.canSpin();
    if (!canSpinResult.allowed) {
      spinBtn.textContent = '已完成';
      spinBtn.disabled = true;
      tooltip?.classList.remove('hidden');
    } else {
      spinBtn.textContent = 'SPIN';
      spinBtn.disabled = false;
      tooltip?.classList.add('hidden');
    }
  }

  /**
   * 检查今日状态
   */
  async checkTodayStatus() {
    const history = await this.managers.storage.getHistory();
    const todayRecord = history[this.appState.today.date];

    if (todayRecord) {
      this.appState.today = this.appState.today.constructor.fromJSON(todayRecord);
    }

    this.updateSpinButton();
  }

  /**
   * 应用设置
   */
  applySettings(settings) {
    // 更新AppState配置
    this.appState.updateConfig(settings);

    // 更新转盘显示
    this.managers.roulette?.setProbability(this.appState.config.luProbability);

    // 更新UI
    if (this.elements.luProbabilitySlider) {
      this.elements.luProbabilitySlider.value = this.appState.config.luProbability;
      this.elements.luProbabilityValue.textContent = this.appState.config.luProbability;
    }

    if (this.elements.pityDaysInput) {
      this.elements.pityDaysInput.value = this.appState.config.pityDays;
    }

    // 更新模式按钮
    this.updateModeButtons();

    // 更新音频设置
    this.managers.audio?.setEnabled(this.appState.config.soundEnabled);
  }

  /**
   * 更新模式按钮
   */
  updateModeButtons() {
    const singleBtn = this.elements.singleModeBtn;
    const multiBtn = this.elements.multiModeBtn;

    if (this.appState.config.mode === 'multi') {
      singleBtn?.classList.remove('active');
      multiBtn?.classList.add('active');
    } else {
      singleBtn?.classList.add('active');
      multiBtn?.classList.remove('active');
    }

    this.updateSpinButton();
  }

  /**
   * 设置模式
   */
  setMode(mode) {
    this.appState.config.mode = mode;
    this.updateModeButtons();
  }

  /**
   * 显示设置对话框
   */
  async showSettings() {
    try {
      const settings = await this.managers.storage.getSettings();

      // 填充设置表单
      if (this.elements.luProbabilitySlider) {
        this.elements.luProbabilitySlider.value = settings.luProbability;
        this.elements.luProbabilityValue.textContent = settings.luProbability;
      }

      if (this.elements.pityDaysInput) {
        this.elements.pityDaysInput.value = settings.pityDays;
      }

      // 更新模式按钮状态
      this.setMode(settings.multiMode ? 'multi' : 'single');

      // 显示对话框
      this.managers.dialog.showDialog('settingsDialog');

      
    } catch (error) {
      console.error('Failed to show settings:', error);
      this.managers.notification.error('打开设置失败');
    }
  }

  /**
   * 保存设置
   */
  async saveSettings() {
    try {
      const settings = {
        luProbability: parseInt(this.elements.luProbabilitySlider?.value || 1),
        pityDays: parseInt(this.elements.pityDaysInput?.value || 0),
        multiMode: this.appState.config.mode === 'multi',
        soundEnabled: true,
        animationEnabled: true
      };

      await this.managers.storage.saveSettings(settings);
      this.applySettings(settings);

      this.managers.dialog.hideDialog('settingsDialog');
      this.managers.notification.success('设置已保存');

      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.managers.notification.error(error.message);
    }
  }

  /**
   * 取消设置
   */
  cancelSettings() {
    this.managers.dialog.hideDialog('settingsDialog');
  }

  /**
   * 导出数据
   */
  async exportData() {
    try {
      const data = await this.managers.storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `lubulu_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      this.managers.notification.success('数据导出成功');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.managers.notification.error(error.message);
    }
  }

  /**
   * 导入数据
   */
  async importData() {
    try {
      const confirmed = await this.confirmDialog.show({
        title: '确认导入',
        message: '确定要导入数据吗?这将覆盖当前的所有数据!',
        type: 'danger'
      });

      if (!confirmed) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          await this.managers.storage.importData(data);

          // 重新加载数据
          await this.loadInitialData();

          this.managers.notification.success('数据导入成功');
        } catch (error) {
          console.error('Failed to import data:', error);
          this.managers.notification.error('数据导入失败: ' + error.message);
        }
      };

      input.click();
    } catch (error) {
      console.error('Failed to import data:', error);
      this.managers.notification.error(error.message);
    }
  }

  /**
   * 处理日期点击
   */
  async handleDateClick(date) {
    try {
      const history = await this.managers.storage.getHistory();
      const record = history[date];
      const today = this.appState.today.date;

      let title, options;

      if (date === today) {
        title = `编辑今日记录 (${date})`;
        options = ['设为Lu', '设为不Lu', '清除记录'];
      } else {
        title = `编辑历史记录 (${date})`;
        options = record ?
          ['设为Lu', '设为不Lu', '清除记录'] :
          ['设为Lu', '设为不Lu'];
      }

      const choice = await this.showHistoryEditDialog(title, options, record);

      if (choice !== null) {
        await this.updateHistoryRecord(date, choice);
      }
    } catch (error) {
      console.error('Failed to handle date click:', error);
      this.managers.notification.error('操作失败');
    }
  }

  /**
   * 显示历史编辑对话框
   */
  async showHistoryEditDialog(title, options, currentRecord) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'dialog history-edit-dialog hidden glass';
      dialog.innerHTML = `
        <div class="dialog-header">
          <h3>${title}</h3>
        </div>
        <div class="dialog-body">
          <p>当前状态: ${currentRecord ? currentRecord.result : '无记录'}</p>
          <div class="history-edit-buttons">
            ${options.map((option, index) =>
              `<button class="choice-btn" data-choice="${index}">${option}</button>`
            ).join('')}
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn-secondary cancel-btn">取消</button>
        </div>
      `;

      document.body.appendChild(dialog);

      const cleanup = () => {
        document.body.removeChild(dialog);
        this.managers.dialog.hideDialog(dialog);
      };

      dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('choice-btn')) {
          const choice = parseInt(e.target.dataset.choice);
          cleanup();
          resolve(choice);
        } else if (e.target.classList.contains('cancel-btn')) {
          cleanup();
          resolve(null);
        }
      });

      this.managers.dialog.showDialog(dialog);
    });
  }

  /**
   * 更新历史记录
   */
  async updateHistoryRecord(date, choice) {
    const choices = ['Lu', '不Lu', null];
    const newResult = choices[choice];

    await this.managers.storage.updateHistoryRecord(date, newResult);

    // 如果修改的是今天的记录,更新今日状态
    if (date === this.appState.today.date) {
      if (newResult === null) {
        this.appState.today.reset();
      } else {
        // 重新加载今日状态
        await this.checkTodayStatus();
      }
      this.updateSpinButton();
    }

    // 更新保底计数器(需要重新计算)
    await this.recalculatePityCounter();

    // 更新显示
    this.debouncedUpdateStats();
    this.managers.calendar?.updateDisplay();

    const actionText = newResult === null ? '清除' : `设置为${newResult}`;
    this.managers.notification.success(`${date} 记录已${actionText}`);
  }

  /**
   * 重新计算保底计数器
   */
  async recalculatePityCounter() {
    const history = await this.managers.storage.getHistory();
    const dates = Object.keys(history).sort().reverse();

    let consecutiveFails = 0;
    for (const date of dates) {
      if (date >= this.appState.today.date) continue;

      const record = history[date];
      if (!record || record.result !== '不Lu') break;

      consecutiveFails++;
    }

    this.appState.pityCounter.consecutiveFails = consecutiveFails;
    await this.managers.storage.savePityCounter(this.appState.pityCounter.toJSON());
  }

  /**
   * 处理分享结果
   */
  async handleShareResult() {
    try {
      if (!window.html2canvas) {
        this.managers.notification.warning('截图功能未加载');
        return;
      }

      const canvas = await html2canvas(document.body, {
        backgroundColor: '#EDE7F6',
        scale: 1,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lubulu_result_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.managers.notification.success('截图保存成功');
      });

      
    } catch (error) {
      console.error('Failed to share result:', error);
      this.managers.notification.error('分享失败');
    }
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    this.managers.roulette?.handleResize();
  }

  /**
   * 处理页面卸载前
   */
  handleBeforeUnload() {
    try {
      // 保存应用状态
      const persistData = this.appState.exportForPersistence();
      localStorage.setItem('lubulu_app_state_v2', JSON.stringify(persistData));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }

  /**
   * 显示严重错误
   */
  showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'critical-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h2>⚠️ 应用错误</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-primary">刷新页面</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .critical-error {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .error-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(errorDiv);
  }

  /**
   * 处理数据更新事件
   */
  async handleDataUpdated(detail = {}) {
    try {
      const { reason } = detail;

      if (reason === 'migration') {
        await this.loadInitialData();
        this.debouncedUpdateStats();
        this.updateSpinButton();

        if (this.managers.calendar) {
          await this.managers.calendar.updateDisplay();
        }
      }
    } catch (error) {
      console.error('处理数据更新事件失败:', error.message);
      this.managers.notification.warning('数据刷新时出现问题,请刷新页面');
    }
  }

  /**
   * 销毁应用
   */
  destroy() {
    Object.values(this.managers).forEach(manager => {
      if (manager && typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });

    if (this.dataMigration) {
      this.dataMigration = null;
    }

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('dataUpdated', this.handleDataUpdated);

    this.appState = null;
    this.managers = {};
    this.elements = {};
  }
}

// 自动初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.lubuluApp = new LubuluApp();
});
