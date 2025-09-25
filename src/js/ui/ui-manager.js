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

/**
 * 用户管理UI组件
 */
export class UserManager {
  constructor(authManager, notificationManager, dataMigration = null) {
    this.authManager = authManager;
    this.notificationManager = notificationManager;
    this.dataMigration = dataMigration;
    this.currentDialog = null;
    this.userPanel = null;
    
    this.init();
  }

  /**
   * 初始化用户管理UI
   */
  init() {
    this.createUserPanel();
    this.createAuthDialogs();
    this.bindEvents();
    this.updateUserDisplay();
    
    // 监听认证状态变化
    this.authManager.addListener(this.handleAuthStateChange.bind(this));
  }

  /**
   * 创建用户面板
   */
  createUserPanel() {
    this.userPanel = document.createElement('div');
    this.userPanel.className = 'user-panel';
    this.userPanel.innerHTML = `
      <div class="user-info hidden" id="userInfo">
        <div class="user-avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
          </svg>
        </div>
        <span class="username" id="usernameDisplay">用户</span>
        <button class="user-menu-btn" id="userMenuBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5z" fill="currentColor"/>
          </svg>
        </button>
        <div class="user-menu hidden" id="userMenu">
          <button class="menu-item" id="changePasswordBtn">修改密码</button>
          <button class="menu-item" id="dataMigrationBtn" style="display: none;">迁移游客数据</button>
          <button class="menu-item danger" id="logoutBtn">退出登录</button>
        </div>
      </div>
      <div class="guest-info hidden" id="guestInfo">
        <span class="guest-label">游客模式</span>
        <button class="login-btn" id="guestLoginBtn">登录</button>
      </div>
      <div class="auth-buttons" id="authButtons">
        <button class="btn-primary login-btn" id="showLoginBtn">登录</button>
        <button class="btn-secondary register-btn" id="showRegisterBtn">注册</button>
        <button class="btn-ghost guest-btn" id="guestModeBtn">游客模式</button>
      </div>
    `;

    // 将用户面板添加到应用栏
    const appBar = document.querySelector('.app-bar__content');
    if (appBar) {
      appBar.appendChild(this.userPanel);
    }
  }

  /**
   * 创建认证对话框
   */
  createAuthDialogs() {
    // 登录对话框
    this.createLoginDialog();
    // 注册对话框
    this.createRegisterDialog();
    // 修改密码对话框
    this.createChangePasswordDialog();
    // 数据迁移确认对话框
    this.createDataMigrationDialog();
  }

  /**
   * 创建登录对话框
   */
  createLoginDialog() {
    const loginDialog = document.createElement('div');
    loginDialog.id = 'loginDialog';
    loginDialog.className = 'dialog hidden glass auth-dialog';
    loginDialog.innerHTML = `
      <div class="dialog-header">
        <h3>用户登录</h3>
        <button class="close-btn" id="loginCloseBtn">×</button>
      </div>
      <form class="auth-form" id="loginForm">
        <div class="form-group">
          <label for="loginUsername">用户名</label>
          <input type="text" id="loginUsername" required autocomplete="username" maxlength="50">
        </div>
        <div class="form-group">
          <label for="loginPassword">密码</label>
          <input type="password" id="loginPassword" required autocomplete="current-password" minlength="6">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="loginCancelBtn">取消</button>
          <button type="submit" class="btn-primary" id="loginSubmitBtn">登录</button>
        </div>
        <div class="form-footer">
          <p>没有账户？<button type="button" class="text-link" id="switchToRegisterBtn">立即注册</button></p>
        </div>
      </form>
      <div class="loading-overlay hidden" id="loginLoading">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(loginDialog);
  }

  /**
   * 创建注册对话框
   */
  createRegisterDialog() {
    const registerDialog = document.createElement('div');
    registerDialog.id = 'registerDialog';
    registerDialog.className = 'dialog hidden glass auth-dialog';
    registerDialog.innerHTML = `
      <div class="dialog-header">
        <h3>用户注册</h3>
        <button class="close-btn" id="registerCloseBtn">×</button>
      </div>
      <form class="auth-form" id="registerForm">
        <div class="form-group">
          <label for="registerUsername">用户名</label>
          <input type="text" id="registerUsername" required autocomplete="username" 
                 minlength="3" maxlength="50" placeholder="至少3个字符">
        </div>
        <div class="form-group">
          <label for="registerEmail">邮箱</label>
          <input type="email" id="registerEmail" required autocomplete="email" 
                 maxlength="100" placeholder="用于找回密码">
        </div>
        <div class="form-group">
          <label for="registerPassword">密码</label>
          <input type="password" id="registerPassword" required autocomplete="new-password" 
                 minlength="6" placeholder="至少6个字符">
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input type="password" id="confirmPassword" required autocomplete="new-password" 
                 minlength="6" placeholder="请重复输入密码">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="registerCancelBtn">取消</button>
          <button type="submit" class="btn-primary" id="registerSubmitBtn">注册</button>
        </div>
        <div class="form-footer">
          <p>已有账户？<button type="button" class="text-link" id="switchToLoginBtn">立即登录</button></p>
        </div>
      </form>
      <div class="loading-overlay hidden" id="registerLoading">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(registerDialog);
  }

  /**
   * 创建修改密码对话框
   */
  createChangePasswordDialog() {
    const changePasswordDialog = document.createElement('div');
    changePasswordDialog.id = 'changePasswordDialog';
    changePasswordDialog.className = 'dialog hidden glass auth-dialog';
    changePasswordDialog.innerHTML = `
      <div class="dialog-header">
        <h3>修改密码</h3>
        <button class="close-btn" id="changePasswordCloseBtn">×</button>
      </div>
      <form class="auth-form" id="changePasswordForm">
        <div class="form-group">
          <label for="currentPassword">当前密码</label>
          <input type="password" id="currentPassword" required autocomplete="current-password">
        </div>
        <div class="form-group">
          <label for="newPassword">新密码</label>
          <input type="password" id="newPassword" required autocomplete="new-password" 
                 minlength="6" placeholder="至少6个字符">
        </div>
        <div class="form-group">
          <label for="confirmNewPassword">确认新密码</label>
          <input type="password" id="confirmNewPassword" required autocomplete="new-password" 
                 minlength="6" placeholder="请重复输入新密码">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="changePasswordCancelBtn">取消</button>
          <button type="submit" class="btn-primary" id="changePasswordSubmitBtn">修改密码</button>
        </div>
      </form>
      <div class="loading-overlay hidden" id="changePasswordLoading">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(changePasswordDialog);
  }

  /**
   * 创建数据迁移对话框
   */
  createDataMigrationDialog() {
    const migrationDialog = document.createElement('div');
    migrationDialog.id = 'dataMigrationDialog';
    migrationDialog.className = 'dialog hidden glass';
    migrationDialog.innerHTML = `
      <div class="dialog-header">
        <h3>数据迁移</h3>
        <button class="close-btn" id="migrationCloseBtn">×</button>
      </div>
      <div class="dialog-content">
        <p>检测到您之前有游客模式的数据，是否要将这些数据迁移到您的账户中？</p>
        <ul class="migration-tips">
          <li>✓ 迁移后您的历史记录和设置将会保留</li>
          <li>✓ 数据会在云端同步，不会丢失</li>
          <li>⚠ 迁移后游客模式的数据将被清除</li>
        </ul>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="migrationCancelBtn">稍后处理</button>
        <button type="button" class="btn-primary" id="migrationConfirmBtn">立即迁移</button>
      </div>
      <div class="loading-overlay hidden" id="migrationLoading">
        <div class="spinner"></div>
      </div>
    `;
    document.body.appendChild(migrationDialog);
  }

  /**
   * 绑定事件处理
   */
  bindEvents() {
    // 用户面板事件
    this.bindUserPanelEvents();
    // 登录对话框事件
    this.bindLoginEvents();
    // 注册对话框事件
    this.bindRegisterEvents();
    // 修改密码对话框事件
    this.bindChangePasswordEvents();
    // 数据迁移对话框事件
    this.bindMigrationEvents();
  }

  /**
   * 绑定用户面板事件
   */
  bindUserPanelEvents() {
    // 显示登录对话框
    document.getElementById('showLoginBtn')?.addEventListener('click', () => {
      this.showLoginDialog();
    });

    // 显示注册对话框
    document.getElementById('showRegisterBtn')?.addEventListener('click', () => {
      this.showRegisterDialog();
    });

    // 游客模式
    document.getElementById('guestModeBtn')?.addEventListener('click', () => {
      this.enterGuestMode();
    });

    // 游客登录按钮
    document.getElementById('guestLoginBtn')?.addEventListener('click', () => {
      this.showLoginDialog();
    });

    // 用户菜单切换
    document.getElementById('userMenuBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleUserMenu();
    });

    // 修改密码
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
      this.showChangePasswordDialog();
    });

    // 数据迁移
    document.getElementById('dataMigrationBtn')?.addEventListener('click', () => {
      this.showDataMigrationDialog();
    });

    // 退出登录
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // 点击其他地方关闭用户菜单
    document.addEventListener('click', () => {
      this.hideUserMenu();
    });
  }

  /**
   * 绑定登录事件
   */
  bindLoginEvents() {
    const loginForm = document.getElementById('loginForm');
    const loginCloseBtn = document.getElementById('loginCloseBtn');
    const loginCancelBtn = document.getElementById('loginCancelBtn');
    const switchToRegisterBtn = document.getElementById('switchToRegisterBtn');

    loginForm?.addEventListener('submit', this.handleLogin.bind(this));
    loginCloseBtn?.addEventListener('click', () => this.hideLoginDialog());
    loginCancelBtn?.addEventListener('click', () => this.hideLoginDialog());
    switchToRegisterBtn?.addEventListener('click', () => {
      this.hideLoginDialog();
      this.showRegisterDialog();
    });
  }

  /**
   * 绑定注册事件
   */
  bindRegisterEvents() {
    const registerForm = document.getElementById('registerForm');
    const registerCloseBtn = document.getElementById('registerCloseBtn');
    const registerCancelBtn = document.getElementById('registerCancelBtn');
    const switchToLoginBtn = document.getElementById('switchToLoginBtn');

    registerForm?.addEventListener('submit', this.handleRegister.bind(this));
    registerCloseBtn?.addEventListener('click', () => this.hideRegisterDialog());
    registerCancelBtn?.addEventListener('click', () => this.hideRegisterDialog());
    switchToLoginBtn?.addEventListener('click', () => {
      this.hideRegisterDialog();
      this.showLoginDialog();
    });

    // 密码确认验证
    const password = document.getElementById('registerPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    confirmPassword?.addEventListener('input', () => {
      if (confirmPassword.value && password.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('密码不匹配');
      } else {
        confirmPassword.setCustomValidity('');
      }
    });
  }

  /**
   * 绑定修改密码事件
   */
  bindChangePasswordEvents() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const changePasswordCloseBtn = document.getElementById('changePasswordCloseBtn');
    const changePasswordCancelBtn = document.getElementById('changePasswordCancelBtn');

    changePasswordForm?.addEventListener('submit', this.handleChangePassword.bind(this));
    changePasswordCloseBtn?.addEventListener('click', () => this.hideChangePasswordDialog());
    changePasswordCancelBtn?.addEventListener('click', () => this.hideChangePasswordDialog());

    // 新密码确认验证
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    
    confirmNewPassword?.addEventListener('input', () => {
      if (confirmNewPassword.value && newPassword.value !== confirmNewPassword.value) {
        confirmNewPassword.setCustomValidity('密码不匹配');
      } else {
        confirmNewPassword.setCustomValidity('');
      }
    });
  }

  /**
   * 绑定数据迁移事件
   */
  bindMigrationEvents() {
    const migrationCloseBtn = document.getElementById('migrationCloseBtn');
    const migrationCancelBtn = document.getElementById('migrationCancelBtn');
    const migrationConfirmBtn = document.getElementById('migrationConfirmBtn');

    migrationCloseBtn?.addEventListener('click', () => this.hideDataMigrationDialog());
    migrationCancelBtn?.addEventListener('click', () => this.hideDataMigrationDialog());
    migrationConfirmBtn?.addEventListener('click', this.handleDataMigration.bind(this));
  }

  /**
   * 显示登录对话框
   */
  showLoginDialog() {
    this.hideAllDialogs();
    this.currentDialog = document.getElementById('loginDialog');
    this.currentDialog?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
    document.getElementById('loginUsername')?.focus();
  }

  /**
   * 隐藏登录对话框
   */
  hideLoginDialog() {
    document.getElementById('loginDialog')?.classList.add('hidden');
    this.hideOverlay();
    this.currentDialog = null;
    this.clearLoginForm();
  }

  /**
   * 显示注册对话框
   */
  showRegisterDialog() {
    this.hideAllDialogs();
    this.currentDialog = document.getElementById('registerDialog');
    this.currentDialog?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
    document.getElementById('registerUsername')?.focus();
  }

  /**
   * 隐藏注册对话框
   */
  hideRegisterDialog() {
    document.getElementById('registerDialog')?.classList.add('hidden');
    this.hideOverlay();
    this.currentDialog = null;
    this.clearRegisterForm();
  }

  /**
   * 显示修改密码对话框
   */
  showChangePasswordDialog() {
    this.hideAllDialogs();
    this.hideUserMenu();
    this.currentDialog = document.getElementById('changePasswordDialog');
    this.currentDialog?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
    document.getElementById('currentPassword')?.focus();
  }

  /**
   * 隐藏修改密码对话框
   */
  hideChangePasswordDialog() {
    document.getElementById('changePasswordDialog')?.classList.add('hidden');
    this.hideOverlay();
    this.currentDialog = null;
    this.clearChangePasswordForm();
  }

  /**
   * 显示数据迁移对话框
   */
  showDataMigrationDialog() {
    this.hideAllDialogs();
    this.hideUserMenu();
    this.currentDialog = document.getElementById('dataMigrationDialog');
    this.currentDialog?.classList.remove('hidden');
    document.getElementById('overlay')?.classList.remove('hidden');
  }

  /**
   * 隐藏数据迁移对话框
   */
  hideDataMigrationDialog() {
    document.getElementById('dataMigrationDialog')?.classList.add('hidden');
    this.hideOverlay();
    this.currentDialog = null;
  }

  /**
   * 隐藏所有对话框
   */
  hideAllDialogs() {
    const dialogs = ['loginDialog', 'registerDialog', 'changePasswordDialog', 'dataMigrationDialog'];
    dialogs.forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
  }

  /**
   * 隐藏遮罩层
   */
  hideOverlay() {
    if (!this.currentDialog) {
      document.getElementById('overlay')?.classList.add('hidden');
    }
  }

  /**
   * 切换用户菜单
   */
  toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu?.classList.toggle('hidden');
  }

  /**
   * 隐藏用户菜单
   */
  hideUserMenu() {
    document.getElementById('userMenu')?.classList.add('hidden');
  }

  /**
   * 处理登录
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const loadingEl = document.getElementById('loginLoading');
    const submitBtn = document.getElementById('loginSubmitBtn');
    
    try {
      loadingEl?.classList.remove('hidden');
      submitBtn.disabled = true;

      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      await this.authManager.login({ username, password });
      
      this.hideLoginDialog();
      this.notificationManager.success('登录成功！');
    } catch (error) {
      this.notificationManager.error(error.message);
    } finally {
      loadingEl?.classList.add('hidden');
      submitBtn.disabled = false;
    }
  }

  /**
   * 处理注册
   */
  async handleRegister(e) {
    e.preventDefault();
    
    const loadingEl = document.getElementById('registerLoading');
    const submitBtn = document.getElementById('registerSubmitBtn');
    
    try {
      loadingEl?.classList.remove('hidden');
      submitBtn.disabled = true;

      const username = document.getElementById('registerUsername').value;
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;

      await this.authManager.register({ username, email, password });
      
      this.hideRegisterDialog();
      this.notificationManager.success('注册成功！');
    } catch (error) {
      this.notificationManager.error(error.message);
    } finally {
      loadingEl?.classList.add('hidden');
      submitBtn.disabled = false;
    }
  }

  /**
   * 处理修改密码
   */
  async handleChangePassword(e) {
    e.preventDefault();
    
    const loadingEl = document.getElementById('changePasswordLoading');
    const submitBtn = document.getElementById('changePasswordSubmitBtn');
    
    try {
      loadingEl?.classList.remove('hidden');
      submitBtn.disabled = true;

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;

      await this.authManager.changePassword(currentPassword, newPassword);
      
      this.hideChangePasswordDialog();
      this.notificationManager.success('密码修改成功！');
    } catch (error) {
      this.notificationManager.error(error.message);
    } finally {
      loadingEl?.classList.add('hidden');
      submitBtn.disabled = false;
    }
  }

  /**
   * 处理数据迁移
   */
  async handleDataMigration() {
    const loadingEl = document.getElementById('migrationLoading');
    const confirmBtn = document.getElementById('migrationConfirmBtn');
    
    try {
      loadingEl?.classList.remove('hidden');
      confirmBtn.disabled = true;

      if (!this.dataMigration) {
        throw new Error('数据迁移工具未初始化');
      }

      // 执行数据迁移
      const migrated = await this.dataMigration.migrateGuestDataToUser();
      
      this.hideDataMigrationDialog();
      
      if (migrated) {
        this.notificationManager.success('数据迁移成功！您的游客数据已合并到账户中');
        
        // 触发数据重新加载事件（如果有的话）
        window.dispatchEvent(new CustomEvent('dataUpdated', {
          detail: { reason: 'migration' }
        }));
      } else {
        this.notificationManager.info('没有发现需要迁移的游客数据');
      }
    } catch (error) {
      console.error('数据迁移失败:', error);
      this.notificationManager.error('数据迁移失败: ' + error.message);
    } finally {
      loadingEl?.classList.add('hidden');
      confirmBtn.disabled = false;
    }
  }

  /**
   * 进入游客模式
   */
  async enterGuestMode() {
    try {
      await this.authManager.loginAsGuest();
      this.notificationManager.success('已进入游客模式');
    } catch (error) {
      this.notificationManager.error(error.message);
    }
  }

  /**
   * 处理登出
   */
  async handleLogout() {
    try {
      await this.authManager.logout();
      this.hideUserMenu();
      this.notificationManager.success('已退出登录');
    } catch (error) {
      this.notificationManager.error(error.message);
    }
  }

  /**
   * 处理认证状态变化
   */
  handleAuthStateChange(event, data) {
    this.updateUserDisplay();
    
    if (event === 'login_success') {
      // 登录成功后检查是否需要数据迁移
      this.checkDataMigration();
    }
  }

  /**
   * 检查数据迁移
   */
  checkDataMigration() {
    if (!this.dataMigration || !this.authManager.isLoggedIn) {
      return;
    }
    
    // 检查是否有游客数据需要迁移
    if (this.dataMigration.hasGuestData()) {
      const migrationBtn = document.getElementById('dataMigrationBtn');
      if (migrationBtn) {
        migrationBtn.style.display = 'block';
      }
      
      // 自动显示迁移提示
      setTimeout(() => {
        this.showDataMigrationDialog();
      }, 1500);
    }
  }

  /**
   * 更新用户显示
   */
  updateUserDisplay() {
    const userInfo = document.getElementById('userInfo');
    const guestInfo = document.getElementById('guestInfo');
    const authButtons = document.getElementById('authButtons');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (this.authManager.isLoggedIn && !this.authManager.isGuestMode) {
      // 已登录用户
      userInfo?.classList.remove('hidden');
      guestInfo?.classList.add('hidden');
      authButtons?.classList.add('hidden');
      
      const user = this.authManager.getCurrentUser();
      if (usernameDisplay && user) {
        usernameDisplay.textContent = user.username;
      }
    } else if (this.authManager.isGuestMode) {
      // 游客模式
      userInfo?.classList.add('hidden');
      guestInfo?.classList.remove('hidden');
      authButtons?.classList.add('hidden');
    } else {
      // 未登录
      userInfo?.classList.add('hidden');
      guestInfo?.classList.add('hidden');
      authButtons?.classList.remove('hidden');
    }
  }

  /**
   * 清理登录表单
   */
  clearLoginForm() {
    const form = document.getElementById('loginForm');
    form?.reset();
  }

  /**
   * 清理注册表单
   */
  clearRegisterForm() {
    const form = document.getElementById('registerForm');
    form?.reset();
  }

  /**
   * 清理修改密码表单
   */
  clearChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    form?.reset();
  }

  /**
   * 销毁用户管理器
   */
  destroy() {
    // 移除事件监听器
    this.authManager.removeListener(this.handleAuthStateChange.bind(this));
    
    // 清理DOM元素
    this.userPanel?.remove();
    document.getElementById('loginDialog')?.remove();
    document.getElementById('registerDialog')?.remove();
    document.getElementById('changePasswordDialog')?.remove();
    document.getElementById('dataMigrationDialog')?.remove();
    
    this.currentDialog = null;
  }
}