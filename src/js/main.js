/**
 * Lubulu 主应用程序
 * 协调所有模块，处理应用逻辑
 */

import { RouletteManager, ROULETTE_CONFIG } from './core/roulette.js';
import { CalendarManager } from './core/calendar.js';
import { StatisticsManager } from './core/statistics.js';
import { StorageManager } from './storage/storage-manager.js';
import { DialogManager, NotificationManager, ConfirmDialog, AudioManager } from './ui/ui-manager.js';
import { 
  getBeijingDateString, 
  debounce, 
  ErrorHandler, 
  Analytics, 
  PerformanceMonitor 
} from './utils/helpers.js';

/**
 * Lubulu 主应用类
 */
export class LubuluApp {
  constructor() {
    // 应用状态
    this.state = {
      hasSpunToday: false,
      isSpinning: false,
      isMultiMode: false,
      todaySpinCount: 0,
      spinResult: null,
      isPityTriggered: false,
      selectedHistoryDate: null
    };

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
      this.checkForUpdates();
      
      Analytics.trackEvent('app_initialized');
      console.log('Lubulu App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Lubulu App:', error);
      this.showCriticalError('应用初始化失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
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

    // 初始化核心管理器
    this.managers.roulette = new RouletteManager(this.elements.canvas);
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
    const monitor = PerformanceMonitor.measureTime('Load Initial Data');
    
    try {
      // 加载设置
      const settings = await this.managers.storage.getSettings();
      this.applySettings(settings);
      
      // 更新统计
      await this.managers.statistics.init();
      
      // 检查今日状态
      await this.checkTodayStatus();
      
      monitor.end();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.managers.notification.error('加载数据失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
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
      this.managers.roulette?.updateConfig(parseInt(e.target.value));
    });
    
    // 模式切换事件
    this.elements.singleModeBtn?.addEventListener('click', () => this.setMode(false));
    this.elements.multiModeBtn?.addEventListener('click', () => this.setMode(true));
    
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
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      Analytics.trackEvent('global_error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      Analytics.trackEvent('unhandled_rejection', {
        reason: e.reason?.message || 'Unknown'
      });
    });
  }

  /**
   * 处理转盘点击
   */
  async handleSpinClick() {
    if (this.state.isSpinning) return;

    try {
      // 检查是否可以抽取
      if (!this.state.isMultiMode && this.state.hasSpunToday) {
        this.managers.notification.warning('今日已经抽取过了');
        return;
      }

      // 显示确认对话框（单次模式且未抽取过）
      if (!this.state.isMultiMode && !this.state.hasSpunToday) {
        const confirmed = await this.confirmDialog.show({
          message: '确定今日要抽取吗？',
          confirmText: '确定抽取'
        });
        
        if (!confirmed) return;
      }

      await this.performSpin();
    } catch (error) {
      console.error('Spin failed:', error);
      this.managers.notification.error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 执行转盘抽取
   */
  async performSpin() {
    const monitor = PerformanceMonitor.measureSpinTime();
    
    this.state.isSpinning = true;
    this.updateSpinButton();
    
    try {
      // 播放音效
      this.managers.audio?.play('spin');
      
      // 检查保底
      const settings = await this.managers.storage.getSettings();
      const shouldTriggerPity = await this.checkPitySystem(settings);
      
      // 执行转盘动画
      let result = await this.managers.roulette.spin();
      
      // 如果触发保底，强制修改结果
      if (shouldTriggerPity) {
        result.isSuccess = true;
        result.isPityTriggered = true;
        this.state.isPityTriggered = true;
      }
      
      this.state.spinResult = result;
      
      // 播放结果音效
      this.managers.audio?.play(result.isSuccess ? 'success' : 'failure');
      
      // 显示结果
      this.showSpinResult(result);
      
      monitor.end();
    } catch (error) {
      this.state.isSpinning = false;
      this.updateSpinButton();
      throw error;
    }
  }

  /**
   * 检查保底系统
   */
  async checkPitySystem(settings) {
    if (settings.pityDays <= 0) return false;
    
    const history = await this.managers.storage.getHistory();
    const today = getBeijingDateString();
    
    // 获取最近的连续不Lu天数
    let consecutiveDays = 0;
    const dates = Object.keys(history).sort().reverse();
    
    for (const date of dates) {
      if (date >= today) continue; // 跳过今天及以后
      
      const record = history[date];
      if (!record || record.result !== '不Lu') break;
      
      consecutiveDays++;
    }
    
    return consecutiveDays >= settings.pityDays;
  }

  /**
   * 显示转盘结果
   */
  showSpinResult(result) {
    const resultDisplay = this.elements.resultDisplay;
    if (!resultDisplay) return;
    
    // 显示结果界面
    resultDisplay.classList.remove('hidden');
    
    // 设置结果内容
    const resultIcon = resultDisplay.querySelector('.result-icon');
    const resultText = resultDisplay.querySelector('.result-text');
    
    if (result.isSuccess) {
      resultIcon.textContent = '🎉';
      resultText.textContent = 'Lu!';
      resultText.style.color = '#F44336';
    } else {
      resultIcon.textContent = '💪';
      resultText.textContent = '不Lu';
      resultText.style.color = '#4CAF50';
    }
    
    // 显示保底提示
    if (result.isPityTriggered) {
      this.elements.pityNotice?.classList.remove('hidden');
    }
    
    // 如果是Lu结果，显示选择按钮
    if (result.isSuccess) {
      this.elements.resultChoice?.classList.remove('hidden');
    } else {
      // 直接显示操作按钮
      this.elements.resultActions?.classList.remove('hidden');
    }
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
      await this.saveSpinResult(finalResult);
      
      // 显示操作按钮
      this.elements.resultActions?.classList.remove('hidden');
      
      Analytics.trackEvent('result_choice_made', {
        originalResult: 'Lu',
        finalChoice: finalResult
      });
    } catch (error) {
      console.error('Failed to handle result choice:', error);
      this.managers.notification.error('保存结果失败');
    }
  }

  /**
   * 保存转盘结果
   */
  async saveSpinResult(result) {
    const today = getBeijingDateString();
    
    // 保存历史记录
    await this.managers.storage.saveHistoryRecord(today, result, this.state.isPityTriggered);
    
    // 更新今日状态
    if (!this.state.hasSpunToday) {
      this.state.hasSpunToday = true;
      this.state.todaySpinCount = 1;
    } else {
      this.state.todaySpinCount++;
    }
    
    // 保存每日抽取次数
    await this.managers.storage.saveDailySpinCount(today, this.state.todaySpinCount);
    
    // 更新UI
    this.updateSpinButton();
    this.debouncedUpdateStats();
    this.managers.calendar?.updateDisplay();
  }

  /**
   * 处理结果确认
   */
  handleResultConfirm() {
    // 如果Lu结果还没有选择，直接保存为不Lu
    if (this.state.spinResult?.isSuccess && !this.elements.resultChoice?.classList.contains('hidden')) {
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
    this.state.isSpinning = false;
    this.state.spinResult = null;
    this.state.isPityTriggered = false;
    
    // 隐藏结果显示
    this.elements.resultDisplay?.classList.add('hidden');
    this.elements.resultChoice?.classList.add('hidden');
    this.elements.resultActions?.classList.add('hidden');
    this.elements.pityNotice?.classList.add('hidden');
    
    // 更新按钮状态
    this.updateSpinButton();
  }

  /**
   * 更新转盘按钮状态
   */
  updateSpinButton() {
    const spinBtn = this.elements.spinBtn;
    const tooltip = this.elements.tooltip;
    
    if (!spinBtn) return;
    
    if (this.state.isSpinning) {
      spinBtn.textContent = '转动中...';
      spinBtn.disabled = true;
      tooltip?.classList.add('hidden');
    } else if (!this.state.isMultiMode && this.state.hasSpunToday) {
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
    const today = getBeijingDateString();
    const history = await this.managers.storage.getHistory();
    const todayRecord = history[today];
    
    if (todayRecord) {
      this.state.hasSpunToday = true;
      this.state.todaySpinCount = todayRecord.spinCount || 1;
    }
    
    this.updateSpinButton();
  }

  /**
   * 应用设置
   */
  applySettings(settings) {
    // 更新转盘配置
    ROULETTE_CONFIG.successSlices = settings.luProbability;
    this.managers.roulette?.updateConfig(settings.luProbability);
    
    // 更新模式
    this.state.isMultiMode = settings.multiMode;
    
    // 更新UI
    if (this.elements.luProbabilitySlider) {
      this.elements.luProbabilitySlider.value = settings.luProbability;
      this.elements.luProbabilityValue.textContent = settings.luProbability;
    }
    
    if (this.elements.pityDaysInput) {
      this.elements.pityDaysInput.value = settings.pityDays;
    }
    
    // 更新模式按钮
    this.updateModeButtons();
    
    // 更新音频设置
    this.managers.audio?.setEnabled(settings.soundEnabled !== false);
  }

  /**
   * 更新模式按钮
   */
  updateModeButtons() {
    const singleBtn = this.elements.singleModeBtn;
    const multiBtn = this.elements.multiModeBtn;
    
    if (this.state.isMultiMode) {
      singleBtn?.classList.remove('active');
      multiBtn?.classList.add('active');
    } else {
      singleBtn?.classList.add('active');
      multiBtn?.classList.remove('active');
    }
    
    this.updateSpinButton();
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
      this.setMode(settings.multiMode);
      
      // 显示对话框
      this.managers.dialog.showDialog('settingsDialog');
      
      Analytics.trackEvent('settings_opened');
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
        multiMode: this.state.isMultiMode,
        soundEnabled: true,
        animationEnabled: true
      };
      
      await this.managers.storage.saveSettings(settings);
      this.applySettings(settings);
      
      this.managers.dialog.hideDialog('settingsDialog');
      this.managers.notification.success('设置已保存');
      
      Analytics.trackEvent('settings_saved', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.managers.notification.error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 取消设置
   */
  cancelSettings() {
    this.managers.dialog.hideDialog('settingsDialog');
  }

  /**
   * 设置模式
   */
  setMode(isMultiMode) {
    this.state.isMultiMode = isMultiMode;
    this.updateModeButtons();
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
      this.managers.notification.error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 导入数据
   */
  async importData() {
    try {
      const confirmed = await this.confirmDialog.show({
        title: '确认导入',
        message: '确定要导入数据吗？这将覆盖当前的所有数据！',
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
          this.managers.notification.error('数据导入失败: ' + ErrorHandler.getFriendlyErrorMessage(error));
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Failed to import data:', error);
      this.managers.notification.error(ErrorHandler.getFriendlyErrorMessage(error));
    }
  }

  /**
   * 处理日期点击
   */
  async handleDateClick(date) {
    try {
      const history = await this.managers.storage.getHistory();
      const record = history[date];
      const today = getBeijingDateString();
      
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
      // 创建对话框内容
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
      
      // 绑定事件
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
    const choices = ['Lu', '不Lu', null]; // null表示清除记录
    const newResult = choices[choice];
    
    await this.managers.storage.updateHistoryRecord(date, newResult);
    
    // 如果修改的是今天的记录，更新今日状态
    const today = getBeijingDateString();
    if (date === today) {
      if (newResult === null) {
        this.state.hasSpunToday = false;
        this.state.todaySpinCount = 0;
      } else {
        this.state.hasSpunToday = true;
      }
      this.updateSpinButton();
    }
    
    // 更新显示
    this.debouncedUpdateStats();
    this.managers.calendar?.updateDisplay();
    
    const actionText = newResult === null ? '清除' : `设置为${newResult}`;
    this.managers.notification.success(`${date} 记录已${actionText}`);
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
      
      Analytics.trackEvent('result_shared');
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
    // 保存当前状态
    try {
      localStorage.setItem('lubulu_app_state', JSON.stringify({
        lastActiveTime: Date.now(),
        version: '2.0'
      }));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }

  /**
   * 检查更新
   */
  checkForUpdates() {
    const lastVersion = localStorage.getItem('lubulu_version');
    const currentVersion = '2.0';
    
    if (lastVersion !== currentVersion) {
      localStorage.setItem('lubulu_version', currentVersion);
      setTimeout(() => {
        this.showUpdateDialog();
      }, 1000);
    }
  }

  /**
   * 显示更新对话框
   */
  showUpdateDialog() {
    const updateContent = `
      <div class="update-item">
        <h4>🎯 新功能</h4>
        <ul>
          <li>✨ 支持自定义Lu概率设置（1-98%）</li>
          <li>🎨 轮盘外观根据概率动态变化</li>
          <li>📝 支持修改历史记录状态</li>
          <li>🔄 新增多次抽取模式</li>
          <li>📊 优化统计显示</li>
          <li>🚀 全面重构，性能大幅提升</li>
        </ul>
      </div>
      <div class="update-item">
        <h4>🛠️ 使用说明</h4>
        <ul>
          <li>在设置中调整Lu概率，轮盘会实时更新</li>
          <li>点击日历中的日期可以修改当天的状态</li>
          <li>多次模式下可以反复抽取，但只有第一次记录</li>
        </ul>
      </div>
    `;
    
    this.managers.notification.show('🎉 Lubulu 已更新到 v2.0！', {
      type: 'success',
      duration: 0,
      action: updateContent
    });
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
    
    // 添加错误样式
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
   * 销毁应用
   */
  destroy() {
    // 销毁所有管理器
    Object.values(this.managers).forEach(manager => {
      if (manager && typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });
    
    // 清理事件监听器
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // 清理状态
    this.state = null;
    this.managers = {};
    this.elements = {};
  }
}

// 自动初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.lubuluApp = new LubuluApp();
});