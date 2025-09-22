// API 客户端类
class LubuluAPI {
  constructor() {
    this.baseURL = 'https://lubulu-api.your-domain.workers.dev';
    this.token = localStorage.getItem('auth_token');
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // 获取认证头
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getAuthHeaders(),
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      throw error;
    }
  }

  // 认证相关
  async register(username, password, email = '') {
    const response = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email })
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async login(username, password) {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error.message);
    } finally {
      this.setToken(null);
    }
  }

  // 设置相关
  async getSettings() {
    const response = await this.request('/api/settings');
    return response.data;
  }

  async saveSettings(settings) {
    const response = await this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    return response.data;
  }

  // 历史记录相关
  async getHistory(date = null) {
    const query = date ? `?date=${date}` : '';
    const response = await this.request(`/api/history${query}`);
    return response.data;
  }

  async saveHistoryRecord(date, result, isPityTriggered = false) {
    const response = await this.request('/api/history', {
      method: 'POST',
      body: JSON.stringify({ date, result, isPityTriggered })
    });
    return response.data;
  }

  async updateHistoryRecord(date, result) {
    const response = await this.request(`/api/history/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ result })
    });
    return response.data;
  }

  async deleteHistoryRecord(date) {
    const response = await this.request(`/api/history/${date}`, {
      method: 'DELETE'
    });
    return response;
  }

  // 抽取次数相关
  async getSpinCount(date = null) {
    const query = date ? `?date=${date}` : '';
    const response = await this.request(`/api/spin-count${query}`);
    return response.data;
  }

  async updateSpinCount(count, date = null) {
    const body = date ? { date, count } : { count };
    const response = await this.request('/api/spin-count', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return response.data;
  }

  // 数据同步相关
  async exportData() {
    const response = await this.request('/api/sync/export', { method: 'POST' });
    return response.data;
  }

  async importData(data) {
    const response = await this.request('/api/sync/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response;
  }

  // 检查连接状态
  async checkConnection() {
    try {
      await this.request('/api/ping');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// 数据同步管理器
class DataSyncManager {
  constructor(api) {
    this.api = api;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.isLoggedIn = !!api.token;
    this.isGuestMode = false;
    
    // 监听网络状态变化
    window.addEventListener('online', () => this.handleOnlineStatusChange(true));
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false));
  }

  handleOnlineStatusChange(isOnline) {
    this.isOnline = isOnline;
    this.updateSyncStatus();
    
    if (isOnline && this.isLoggedIn && !this.isGuestMode) {
      this.processSyncQueue();
    }
  }

  setLoginStatus(isLoggedIn) {
    this.isLoggedIn = isLoggedIn;
    // 如果不是登录状态，则不是游客模式
    if (!isLoggedIn) {
      this.isGuestMode = false;
    }
    this.updateSyncStatus();
  }

  setGuestMode(isGuest) {
    this.isGuestMode = isGuest;
    this.updateSyncStatus();
  }

  updateSyncStatus() {
    const syncIndicator = document.getElementById('syncIndicator');
    const syncText = document.getElementById('syncText');
    
    if (!syncIndicator || !syncText) return;

    if (this.isGuestMode) {
      syncIndicator.className = 'sync-indicator guest';
      syncText.textContent = '游客模式';
    } else if (!this.isLoggedIn) {
      syncIndicator.className = 'sync-indicator';
      syncText.textContent = '未登录';
    } else if (!this.isOnline) {
      syncIndicator.className = 'sync-indicator error';
      syncText.textContent = '离线';
    } else {
      syncIndicator.className = 'sync-indicator online';
      syncText.textContent = '已同步';
    }
  }

  // 添加到同步队列
  addToSyncQueue(action, data) {
    // 游客模式不添加同步队列
    if (this.isGuestMode) {
      return;
    }

    this.syncQueue.push({ action, data, timestamp: Date.now() });
    
    // 如果在线且已登录，立即同步
    if (this.isOnline && this.isLoggedIn) {
      this.processSyncQueue();
    }
  }

  // 处理同步队列
  async processSyncQueue() {
    if (!this.isOnline || !this.isLoggedIn || this.syncQueue.length === 0) {
      return;
    }

    const syncIndicator = document.getElementById('syncIndicator');
    const syncText = document.getElementById('syncText');
    
    if (syncIndicator && syncText) {
      syncIndicator.className = 'sync-indicator syncing';
      syncText.textContent = '同步中...';
    }

    try {
      for (const item of [...this.syncQueue]) {
        await this.processSyncItem(item);
        // 成功后从队列中移除
        const index = this.syncQueue.indexOf(item);
        if (index > -1) {
          this.syncQueue.splice(index, 1);
        }
      }
      
      this.updateSyncStatus();
    } catch (error) {
      console.error('Sync failed:', error);
      if (syncIndicator && syncText) {
        syncIndicator.className = 'sync-indicator error';
        syncText.textContent = '同步失败';
      }
    }
  }

  async processSyncItem(item) {
    const { action, data } = item;
    
    switch (action) {
      case 'saveHistory':
        await this.api.saveHistoryRecord(data.date, data.result, data.isPityTriggered);
        break;
      case 'updateHistory':
        await this.api.updateHistoryRecord(data.date, data.result);
        break;
      case 'deleteHistory':
        await this.api.deleteHistoryRecord(data.date);
        break;
      case 'updateSpinCount':
        await this.api.updateSpinCount(data.count, data.date);
        break;
      case 'saveSettings':
        await this.api.saveSettings(data);
        break;
      default:
        console.warn('Unknown sync action:', action);
    }
  }

  // 强制同步所有数据
  async forceSyncAll() {
    if (!this.isOnline || !this.isLoggedIn) {
      throw new Error('需要网络连接和登录状态才能同步');
    }

    try {
      // 同步设置
      const localSettings = getSettings();
      await this.api.saveSettings(localSettings);

      // 同步历史记录
      const localHistory = JSON.parse(localStorage.getItem('spinHistory') || '{}');
      for (const [date, result] of Object.entries(localHistory)) {
        await this.api.saveHistoryRecord(date, result, false);
      }

      // 同步抽取次数
      const today = getBeijingDateString();
      const todayCount = getTodaySpinCount();
      if (todayCount > 0) {
        await this.api.updateSpinCount(todayCount, today);
      }

      this.updateSyncStatus();
      showNotification('数据同步成功！', '✅');
    } catch (error) {
      console.error('Force sync failed:', error);
      showNotification('数据同步失败: ' + error.message, '❌');
      throw error;
    }
  }
}

// 全局变量
let lubuluAPI;
let dataSyncManager;

// 用户认证管理器
class AuthManager {
  constructor(api, syncManager) {
    this.api = api;
    this.syncManager = syncManager;
    this.currentUser = null;
    
    this.initializeEventListeners();
    this.checkAuthStatus();
  }

  initializeEventListeners() {
    // 模态框控制
    const showAuthModal = document.getElementById('showAuthModal');
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const authOverlay = document.getElementById('authOverlay');

    showAuthModal?.addEventListener('click', () => this.showAuthModal());
    closeAuthModal?.addEventListener('click', () => this.hideAuthModal());
    authOverlay?.addEventListener('click', () => this.hideAuthModal());

    // 表单切换
    const showRegisterForm = document.getElementById('showRegisterForm');
    const showLoginForm = document.getElementById('showLoginForm');
    
    showRegisterForm?.addEventListener('click', () => this.showRegisterForm());
    showLoginForm?.addEventListener('click', () => this.showLoginForm());

    // 表单提交
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    
    loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
    guestLoginBtn?.addEventListener('click', () => this.handleGuestLogin());

    // 用户菜单
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const syncDataBtn = document.getElementById('syncDataBtn');

    userMenuBtn?.addEventListener('click', () => this.toggleUserMenu());
    logoutBtn?.addEventListener('click', () => this.handleLogout());
    syncDataBtn?.addEventListener('click', () => this.handleSyncData());

    // 点击外部关闭用户菜单
    document.addEventListener('click', (e) => {
      if (!userMenuBtn?.contains(e.target) && !userDropdown?.contains(e.target)) {
        this.hideUserMenu();
      }
    });
  }

  showAuthModal() {
    const authModal = document.getElementById('authModal');
    const authOfflineNotice = document.getElementById('authOfflineNotice');
    
    // 检查网络状态
    if (!navigator.onLine) {
      authOfflineNotice?.classList.remove('hidden');
    } else {
      authOfflineNotice?.classList.add('hidden');
    }
    
    authModal?.classList.remove('hidden');
    setTimeout(() => {
      authModal?.classList.add('show');
    }, 10);
  }

  hideAuthModal() {
    const authModal = document.getElementById('authModal');
    authModal?.classList.remove('show');
    setTimeout(() => {
      authModal?.classList.add('hidden');
      this.resetForms();
    }, 300);
  }

  showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
    if (authTitle) authTitle.textContent = '注册账号';
  }

  showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    
    registerForm?.classList.add('hidden');
    loginForm?.classList.remove('hidden');
    if (authTitle) authTitle.textContent = '登录账号';
  }

  resetForms() {
    document.getElementById('loginForm')?.reset();
    document.getElementById('registerForm')?.reset();
    this.setButtonLoading('loginBtn', false);
    this.setButtonLoading('registerBtn', false);
  }

  setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    const span = button?.querySelector('span');
    const spinner = button?.querySelector('.loading-spinner');
    
    if (loading) {
      button?.setAttribute('disabled', 'true');
      span?.classList.add('hidden');
      spinner?.classList.remove('hidden');
    } else {
      button?.removeAttribute('disabled');
      span?.classList.remove('hidden');
      spinner?.classList.add('hidden');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
      showNotification('请填写完整的登录信息', '⚠️');
      return;
    }

    this.setButtonLoading('loginBtn', true);
    
    try {
      const response = await this.api.login(username, password);
      
      if (response.success) {
        this.currentUser = response.data.user;
        this.updateUserUI();
        this.hideAuthModal();
        showNotification('登录成功！', '✅');
        
        // 设置数据适配器登录状态
        dataAdapter?.setLoginStatus(true);
        
        // 开始同步数据
        this.syncManager.setLoginStatus(true);
        await this.loadCloudData();
      }
    } catch (error) {
      showNotification('登录失败: ' + error.message, '❌');
    } finally {
      this.setButtonLoading('loginBtn', false);
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!username || !password) {
      showNotification('请填写完整的注册信息', '⚠️');
      return;
    }
    
    if (password !== confirmPassword) {
      showNotification('两次输入的密码不一致', '⚠️');
      return;
    }
    
    if (username.length < 3 || username.length > 50) {
      showNotification('用户名长度应为3-50个字符', '⚠️');
      return;
    }
    
    if (password.length < 6) {
      showNotification('密码长度不能少于6个字符', '⚠️');
      return;
    }

    this.setButtonLoading('registerBtn', true);
    
    try {
      const response = await this.api.register(username, password, email);
      
      if (response.success) {
        this.currentUser = response.data.user;
        this.updateUserUI();
        this.hideAuthModal();
        showNotification('注册成功！', '✅');
        
        // 设置数据适配器登录状态
        dataAdapter?.setLoginStatus(true);
        
        // 上传本地数据到云端
        this.syncManager.setLoginStatus(true);
        await this.syncManager.forceSyncAll();
      }
    } catch (error) {
      showNotification('注册失败: ' + error.message, '❌');
    } finally {
      this.setButtonLoading('registerBtn', false);
    }
  }

  // 游客登录处理
  async handleGuestLogin() {
    try {
      // 设置游客用户信息
      this.currentUser = {
        id: 'guest',
        username: '游客用户',
        isGuest: true
      };
      
      // 设置本地标识符
      localStorage.setItem('user_mode', 'guest');
      localStorage.setItem('guest_user', JSON.stringify(this.currentUser));
      
      // 更新UI
      this.updateUserUI();
      this.hideAuthModal();
      
      // 设置数据适配器为离线模式
      dataAdapter?.setLoginStatus(false);
      dataAdapter?.setGuestMode(true);
      
      // 设置同步管理器为游客模式
      this.syncManager.setLoginStatus(false);
      this.syncManager.setGuestMode(true);
      
      showNotification('已进入游客模式，数据仅保存在本设备', '👤');
    } catch (error) {
      showNotification('进入游客模式失败: ' + error.message, '❌');
      console.error('Guest login error:', error);
    }
  }

  async handleLogout() {
    try {
      // 如果是游客模式
      if (this.currentUser?.isGuest) {
        this.currentUser = null;
        localStorage.removeItem('user_mode');
        localStorage.removeItem('guest_user');
        this.updateUserUI();
        this.hideUserMenu();
        
        // 重置数据适配器状态
        dataAdapter?.setLoginStatus(false);
        dataAdapter?.setGuestMode(false);
        this.syncManager.setLoginStatus(false);
        this.syncManager.setGuestMode(false);
        
        showNotification('已退出游客模式', 'ℹ️');
        return;
      }
      
      // 正常登录用户的退出逻辑
      await this.api.logout();
      this.currentUser = null;
      this.updateUserUI();
      this.hideUserMenu();
      
      // 设置数据适配器登录状态
      dataAdapter?.setLoginStatus(false);
      
      this.syncManager.setLoginStatus(false);
      showNotification('已退出登录', 'ℹ️');
    } catch (error) {
      console.error('Logout error:', error);
      // 即使请求失败，也要执行本地登出
      this.api.setToken(null);
      this.currentUser = null;
      this.updateUserUI();
      this.hideUserMenu();
      
      // 设置数据适配器登录状态
      dataAdapter?.setLoginStatus(false);
      
      this.syncManager.setLoginStatus(false);
    }
  }

  async handleSyncData() {
    try {
      await this.syncManager.forceSyncAll();
      this.hideUserMenu();
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  toggleUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    userDropdown?.classList.toggle('show');
  }

  hideUserMenu() {
    const userDropdown = document.getElementById('userDropdown');
    userDropdown?.classList.remove('show');
  }

  async checkAuthStatus() {
    // 首先检查是否是游客模式
    const userMode = localStorage.getItem('user_mode');
    if (userMode === 'guest') {
      const guestUser = localStorage.getItem('guest_user');
      if (guestUser) {
        try {
          this.currentUser = JSON.parse(guestUser);
          this.updateUserUI();
          
          // 设置游客模式
          dataAdapter?.setLoginStatus(false);
          dataAdapter?.setGuestMode(true);
          this.syncManager.setLoginStatus(false);
          this.syncManager.setGuestMode(true);
          
          return;
        } catch (error) {
          console.error('Failed to parse guest user:', error);
        }
      }
    }

    // 检查正常的登录状态
    if (this.api.token && navigator.onLine) {
      try {
        // 验证token是否有效
        await this.api.getSettings();
        // Token有效，获取用户信息（这里简化处理）
        this.currentUser = { username: 'User' }; // 实际应该从API获取
        this.updateUserUI();
        this.syncManager.setLoginStatus(true);
        await this.loadCloudData();
      } catch (error) {
        // Token无效，清除本地token
        this.api.setToken(null);
        this.updateUserUI();
      }
    } else {
      this.updateUserUI();
    }
  }

  async loadCloudData() {
    try {
      // 加载云端设置
      const cloudSettings = await this.api.getSettings();
      saveSettings(cloudSettings);
      
      // 加载云端历史记录
      const cloudHistory = await this.api.getHistory();
      localStorage.setItem('spinHistory', JSON.stringify(cloudHistory));
      
      // 加载今日抽取次数
      const today = getBeijingDateString();
      try {
        const cloudSpinCount = await this.api.getSpinCount(today);
        saveTodaySpinCount(cloudSpinCount.count);
      } catch (error) {
        // 如果没有今日记录，忽略错误
      }
      
      // 更新UI
      updateAllUI();
      showNotification('云端数据加载成功', '☁️');
    } catch (error) {
      console.error('Load cloud data error:', error);
      showNotification('云端数据加载失败: ' + error.message, '⚠️');
    }
  }

  updateUserUI() {
    const guestPrompt = document.getElementById('guestPrompt');
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (this.currentUser) {
      // 已登录状态（包括游客模式）
      guestPrompt?.classList.remove('show');
      userInfo?.classList.remove('hidden');
      
      if (userName) {
        userName.textContent = this.currentUser.username;
        // 如果是游客模式，在用户名后面添加标识
        if (this.currentUser.isGuest) {
          userName.textContent = this.currentUser.username + ' (游客)';
        }
      }
      
      if (userAvatar) {
        if (this.currentUser.isGuest) {
          userAvatar.textContent = '👤';
        } else {
          userAvatar.textContent = this.currentUser.username.charAt(0).toUpperCase();
        }
      }
    } else {
      // 未登录状态
      userInfo?.classList.add('hidden');
      setTimeout(() => {
        guestPrompt?.classList.add('show');
      }, 1000);
    }
    
    this.syncManager.updateSyncStatus();
  }
}

// 初始化认证系统
function initializeAuth() {
  lubuluAPI = new LubuluAPI();
  dataSyncManager = new DataSyncManager(lubuluAPI);
  
  // 初始化数据适配器
  initializeDataAdapter(lubuluAPI, dataSyncManager);
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const authManager = new AuthManager(lubuluAPI, dataSyncManager);
      
      // 监听网络状态变化，更新数据适配器
      window.addEventListener('online', () => dataAdapter?.setOnlineStatus(true));
      window.addEventListener('offline', () => dataAdapter?.setOnlineStatus(false));
    });
  } else {
    const authManager = new AuthManager(lubuluAPI, dataSyncManager);
    
    // 监听网络状态变化，更新数据适配器
    window.addEventListener('online', () => dataAdapter?.setOnlineStatus(true));
    window.addEventListener('offline', () => dataAdapter?.setOnlineStatus(false));
  }
}