/**
 * Lubulu UI对话框管理模块
 * 统一管理所有对话框和弹窗
 */

import { debounce, Analytics, sanitizeInput } from '../utils/helpers.js';

/**
 * 对话框管理类
 */
export class DialogManager {
  constructor() {
    this.activeDialogs = new Set();
    this.overlay = null;
    this.keyboardHandler = this.handleKeyboard.bind(this);
    this.init();
  }

  /**
   * 初始化对话框管理器
   */
  init() {
    this.createOverlay();
    this.bindGlobalEvents();
  }

  /**
   * 创建遮罩层
   */
  createOverlay() {
    this.overlay = document.getElementById('overlay');
    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'overlay';
      this.overlay.className = 'overlay hidden';
      document.body.appendChild(this.overlay);
    }
    
    // 点击遮罩关闭对话框
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeTopDialog();
      }
    });
  }

  /**
   * 绑定全局事件
   */
  bindGlobalEvents() {
    // ESC键关闭对话框
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * 键盘事件处理
   */
  handleKeyboard(e) {
    if (e.key === 'Escape' && this.activeDialogs.size > 0) {
      e.preventDefault();
      this.closeTopDialog();
    }
  }

  /**
   * 显示对话框
   * @param {HTMLElement|string} dialog - 对话框元素或ID
   * @param {Object} options - 选项
   */
  showDialog(dialog, options = {}) {
    const dialogElement = typeof dialog === 'string' ? 
      document.getElementById(dialog) : dialog;
    
    if (!dialogElement) {
      console.error('Dialog element not found:', dialog);
      return;
    }

    // 记录对话框
    this.activeDialogs.add(dialogElement);
    
    // 显示遮罩
    this.overlay.classList.remove('hidden');
    
    // 显示对话框
    dialogElement.classList.remove('hidden');
    
    // 动画效果
    setTimeout(() => {
      this.overlay.classList.add('show');
      dialogElement.classList.add('show');
    }, 10);

    // 焦点管理
    if (options.autoFocus !== false) {
      this.setFocusToDialog(dialogElement);
    }

    // 分析记录
    Analytics.trackEvent('dialog_opened', {
      dialogId: dialogElement.id || 'unknown'
    });
  }

  /**
   * 隐藏对话框
   * @param {HTMLElement|string} dialog - 对话框元素或ID
   */
  hideDialog(dialog) {
    const dialogElement = typeof dialog === 'string' ? 
      document.getElementById(dialog) : dialog;
    
    if (!dialogElement) {
      return;
    }

    // 移除记录
    this.activeDialogs.delete(dialogElement);
    
    // 隐藏动画
    dialogElement.classList.remove('show');
    
    setTimeout(() => {
      dialogElement.classList.add('hidden');
      
      // 如果没有其他活动对话框，隐藏遮罩
      if (this.activeDialogs.size === 0) {
        this.overlay.classList.remove('show');
        setTimeout(() => {
          this.overlay.classList.add('hidden');
        }, 200);
      }
    }, 200);

    Analytics.trackEvent('dialog_closed', {
      dialogId: dialogElement.id || 'unknown'
    });
  }

  /**
   * 关闭最顶层的对话框
   */
  closeTopDialog() {
    if (this.activeDialogs.size > 0) {
      const lastDialog = Array.from(this.activeDialogs).pop();
      this.hideDialog(lastDialog);
    }
  }

  /**
   * 设置焦点到对话框
   */
  setFocusToDialog(dialogElement) {
    // 查找第一个可聚焦的元素
    const focusableElements = dialogElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      dialogElement.focus();
    }
  }

  /**
   * 关闭所有对话框
   */
  closeAllDialogs() {
    const dialogs = Array.from(this.activeDialogs);
    dialogs.forEach(dialog => this.hideDialog(dialog));
  }
}

/**
 * 通知管理类
 */
export class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.init();
  }

  /**
   * 初始化通知管理器
   */
  init() {
    this.createContainer();
  }

  /**
   * 创建通知容器
   */
  createContainer() {
    this.container = document.getElementById('notificationContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notificationContainer';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * 显示通知
   * @param {string} message - 消息内容
   * @param {Object} options - 选项
   * @returns {string} 通知ID
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = 3000,
      icon = this.getDefaultIcon(type),
      closable = true,
      action = null
    } = options;

    const id = 'notification_' + Date.now();
    const notification = this.createNotificationElement(id, message, {
      type, icon, closable, action
    });

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // 显示动画
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    Analytics.trackEvent('notification_shown', { type, message: message.substring(0, 50) });

    return id;
  }

  /**
   * 创建通知元素
   */
  createNotificationElement(id, message, options) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${options.type}`;
    notification.dataset.id = id;

    const safeMessage = sanitizeInput(message);
    
    notification.innerHTML = `
      <div class="notification-icon">${options.icon}</div>
      <div class="notification-content">
        <div class="notification-message">${safeMessage}</div>
        ${options.action ? `<div class="notification-actions">${options.action}</div>` : ''}
      </div>
      ${options.closable ? '<button class="notification-close" aria-label="关闭">×</button>' : ''}
    `;

    // 绑定关闭事件
    if (options.closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', () => this.hide(id));
    }

    return notification;
  }

  /**
   * 获取默认图标
   */
  getDefaultIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    return icons[type] || '📢';
  }

  /**
   * 隐藏通知
   * @param {string} id - 通知ID
   */
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * 清除所有通知
   */
  clearAll() {
    this.notifications.forEach((_, id) => this.hide(id));
  }

  /**
   * 显示成功通知
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * 显示错误通知
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error', duration: 5000 });
  }

  /**
   * 显示警告通知
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning', duration: 4000 });
  }

  /**
   * 显示信息通知
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * 显示加载通知
   */
  loading(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'loading', 
      duration: 0, 
      closable: false 
    });
  }
}

/**
 * 确认对话框工具
 */
export class ConfirmDialog {
  constructor(dialogManager) {
    this.dialogManager = dialogManager;
    this.element = null;
    this.createDialog();
  }

  /**
   * 创建确认对话框
   */
  createDialog() {
    this.element = document.createElement('div');
    this.element.className = 'dialog confirm-dialog hidden glass';
    this.element.innerHTML = `
      <div class="dialog-header">
        <h3 class="dialog-title">确认操作</h3>
      </div>
      <div class="dialog-body">
        <p class="dialog-message"></p>
      </div>
      <div class="dialog-actions">
        <button class="btn-secondary cancel-btn">取消</button>
        <button class="btn-primary confirm-btn">确定</button>
      </div>
    `;

    document.body.appendChild(this.element);
  }

  /**
   * 显示确认对话框
   * @param {Object} options - 选项
   * @returns {Promise<boolean>} 用户选择结果
   */
  show(options = {}) {
    const {
      title = '确认操作',
      message = '确定要执行此操作吗？',
      confirmText = '确定',
      cancelText = '取消',
      type = 'default'
    } = options;

    return new Promise((resolve) => {
      // 更新内容
      this.element.querySelector('.dialog-title').textContent = title;
      this.element.querySelector('.dialog-message').textContent = message;
      this.element.querySelector('.confirm-btn').textContent = confirmText;
      this.element.querySelector('.cancel-btn').textContent = cancelText;

      // 设置样式
      const confirmBtn = this.element.querySelector('.confirm-btn');
      confirmBtn.className = type === 'danger' ? 'btn-danger' : 'btn-primary';

      // 绑定事件
      const handleConfirm = () => {
        cleanup();
        resolve(true);
        Analytics.trackEvent('confirm_dialog_accepted', { title });
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
        Analytics.trackEvent('confirm_dialog_cancelled', { title });
      };

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        this.element.querySelector('.cancel-btn').removeEventListener('click', handleCancel);
        this.dialogManager.hideDialog(this.element);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      this.element.querySelector('.cancel-btn').addEventListener('click', handleCancel);

      // 显示对话框
      this.dialogManager.showDialog(this.element);
    });
  }
}

/**
 * 音频管理类
 */
export class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.sounds = new Map();
    this.init();
  }

  /**
   * 初始化音频管理器
   */
  async init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.loadSounds();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * 加载音效
   */
  loadSounds() {
    // 使用Web Audio API生成音效
    this.sounds.set('spin', this.createSpinSound.bind(this));
    this.sounds.set('success', this.createSuccessSound.bind(this));
    this.sounds.set('failure', this.createFailureSound.bind(this));
    this.sounds.set('click', this.createClickSound.bind(this));
  }

  /**
   * 创建转盘音效
   */
  createSpinSound() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.5);
  }

  /**
   * 创建成功音效
   */
  createSuccessSound() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, this.context.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, this.context.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, this.context.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.3);
  }

  /**
   * 创建失败音效
   */
  createFailureSound() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.3);
  }

  /**
   * 创建点击音效
   */
  createClickSound() {
    if (!this.context) return;
    
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, this.context.currentTime);
    
    gainNode.gain.setValueAtTime(0.05, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + 0.1);
  }

  /**
   * 播放音效
   * @param {string} soundName - 音效名称
   */
  play(soundName) {
    if (!this.enabled || !this.context) return;
    
    const soundGenerator = this.sounds.get(soundName);
    if (soundGenerator) {
      try {
        soundGenerator();
      } catch (error) {
        console.warn('Failed to play sound:', error);
      }
    }
  }

  /**
   * 设置音效开关
   * @param {boolean} enabled - 是否启用
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 恢复音频上下文（用于用户交互后）
   */
  async resumeContext() {
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }
}