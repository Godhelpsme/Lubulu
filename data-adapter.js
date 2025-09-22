// 数据存储适配器 - 统一管理本地和云端数据存储
class DataStorageAdapter {
  constructor(api, syncManager) {
    this.api = api;
    this.syncManager = syncManager;
    this.isOnline = navigator.onLine;
    this.isLoggedIn = !!api.token;
    this.isGuestMode = false; // 游客模式标识
  }

  setLoginStatus(isLoggedIn) {
    this.isLoggedIn = isLoggedIn;
    // 如果不是登录状态，则不是游客模式
    if (!isLoggedIn) {
      this.isGuestMode = false;
    }
  }

  setGuestMode(isGuest) {
    this.isGuestMode = isGuest;
  }

  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
  }

  // 获取设置 - 优先使用云端，无网络时使用本地
  async getSettings() {
    // 游客模式直接使用本地数据
    if (this.isGuestMode) {
      const settings = localStorage.getItem('lubuluSettings');
      return settings ? JSON.parse(settings) : { 
        pityDays: 0, 
        luProbability: 1,
        multiMode: false 
      };
    }

    if (this.isLoggedIn && this.isOnline) {
      try {
        const cloudSettings = await this.api.getSettings();
        // 同步到本地作为缓存
        localStorage.setItem('lubuluSettings', JSON.stringify(cloudSettings));
        return cloudSettings;
      } catch (error) {
        console.warn('Failed to get cloud settings, using local:', error.message);
      }
    }
    
    // 使用本地设置作为后备
    const settings = localStorage.getItem('lubuluSettings');
    return settings ? JSON.parse(settings) : { 
      pityDays: 0, 
      luProbability: 1,
      multiMode: false 
    };
  }

  // 保存设置
  async saveSettings(settings) {
    // 立即保存到本地
    localStorage.setItem('lubuluSettings', JSON.stringify(settings));
    
    // 游客模式只保存到本地
    if (this.isGuestMode) {
      return settings;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.saveSettings(settings);
      } catch (error) {
        console.warn('Failed to save settings to cloud, queued for sync:', error.message);
        this.syncManager.addToSyncQueue('saveSettings', settings);
      }
    } else if (this.isLoggedIn) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('saveSettings', settings);
    }
  }

  // 获取历史记录
  async getHistory() {
    if (this.isLoggedIn && this.isOnline) {
      try {
        const cloudHistory = await this.api.getHistory();
        // 同步到本地作为缓存
        localStorage.setItem('spinHistory', JSON.stringify(cloudHistory));
        return cloudHistory;
      } catch (error) {
        console.warn('Failed to get cloud history, using local:', error.message);
      }
    }
    
    // 使用本地历史作为后备
    return JSON.parse(localStorage.getItem('spinHistory') || '{}');
  }

  // 保存历史记录
  async saveHistoryRecord(date, result, isPityTriggered = false) {
    // 立即保存到本地
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    history[date] = result;
    localStorage.setItem('spinHistory', JSON.stringify(history));
    
    // 游客模式只保存到本地
    if (this.isGuestMode) {
      return;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.saveHistoryRecord(date, result, isPityTriggered);
      } catch (error) {
        console.warn('Failed to save history to cloud, queued for sync:', error.message);
        this.syncManager.addToSyncQueue('saveHistory', { date, result, isPityTriggered });
      }
    } else if (this.isLoggedIn) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('saveHistory', { date, result, isPityTriggered });
    }
  }

  // 更新历史记录
  async updateHistoryRecord(date, result) {
    // 立即更新本地
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    history[date] = result;
    localStorage.setItem('spinHistory', JSON.stringify(history));
    
    // 游客模式只保存到本地
    if (this.isGuestMode) {
      return;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.updateHistoryRecord(date, result);
      } catch (error) {
        console.warn('Failed to update history in cloud, queued for sync:', error.message);
        this.syncManager.addToSyncQueue('updateHistory', { date, result });
      }
    } else if (this.isLoggedIn) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('updateHistory', { date, result });
    }
  }

  // 删除历史记录
  async deleteHistoryRecord(date) {
    // 立即从本地删除
    const history = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    delete history[date];
    localStorage.setItem('spinHistory', JSON.stringify(history));
    
    // 游客模式只在本地操作
    if (this.isGuestMode) {
      return;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.deleteHistoryRecord(date);
      } catch (error) {
        console.warn('Failed to delete history from cloud, queued for sync:', error.message);
        this.syncManager.addToSyncQueue('deleteHistory', { date });
      }
    } else if (this.isLoggedIn) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('deleteHistory', { date });
    }
  }

  // 获取今日抽取次数
  async getTodaySpinCount() {
    const today = getBeijingDateString();
    
    // 游客模式直接使用本地数据
    if (this.isGuestMode) {
      const localCount = localStorage.getItem(`spinCount_${today}`);
      return localCount ? parseInt(localCount) : 0;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        const cloudCount = await this.api.getSpinCount(today);
        // 同步到本地
        localStorage.setItem(`spinCount_${today}`, cloudCount.count.toString());
        return cloudCount.count;
      } catch (error) {
        console.warn('Failed to get cloud spin count, using local:', error.message);
      }
    }
    
    // 使用本地计数作为后备
    const localCount = localStorage.getItem(`spinCount_${today}`);
    return localCount ? parseInt(localCount) : 0;
  }

  // 保存今日抽取次数
  async saveTodaySpinCount(count) {
    const today = getBeijingDateString();
    
    // 立即保存到本地
    localStorage.setItem(`spinCount_${today}`, count.toString());
    
    // 游客模式只保存到本地
    if (this.isGuestMode) {
      return;
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.updateSpinCount(count, today);
      } catch (error) {
        console.warn('Failed to save spin count to cloud, queued for sync:', error.message);
        this.syncManager.addToSyncQueue('updateSpinCount', { count, date: today });
      }
    } else if (this.isLoggedIn) {
      // 离线时添加到同步队列
      this.syncManager.addToSyncQueue('updateSpinCount', { count, date: today });
    }
  }

  // 导出数据
  async exportData() {
    if (this.isLoggedIn && this.isOnline) {
      try {
        return await this.api.exportData();
      } catch (error) {
        console.warn('Failed to export cloud data, using local:', error.message);
      }
    }
    
    // 使用本地数据导出
    const localHistory = JSON.parse(localStorage.getItem('spinHistory') || '{}');
    const localSettings = this.getSettingsSync();
    
    return {
      history: localHistory,
      settings: localSettings,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
  }

  // 导入数据
  async importData(data) {
    if (!data.history || typeof data.history !== 'object') {
      throw new Error('历史记录数据格式无效');
    }
    
    // 导入到本地
    localStorage.setItem('spinHistory', JSON.stringify(data.history));
    if (data.settings) {
      localStorage.setItem('lubuluSettings', JSON.stringify(data.settings));
    }
    
    if (this.isLoggedIn && this.isOnline) {
      try {
        await this.api.importData(data);
      } catch (error) {
        console.warn('Failed to import data to cloud:', error.message);
        // 数据已保存到本地，将在下次同步时上传
        if (this.isLoggedIn) {
          showNotification('数据已导入本地，将在联网时同步到云端', 'ℹ️');
        }
        throw error;
      }
    }
  }

  // 同步获取设置（不使用async，用于兼容旧代码）
  getSettingsSync() {
    const settings = localStorage.getItem('lubuluSettings');
    return settings ? JSON.parse(settings) : { 
      pityDays: 0, 
      luProbability: 1,
      multiMode: false 
    };
  }

  // 更新网络状态
  setOnlineStatus(isOnline) {
    this.isOnline = isOnline;
  }
}

// 全局数据适配器实例
let dataAdapter;

// 初始化数据适配器
function initializeDataAdapter(api, syncManager) {
  dataAdapter = new DataStorageAdapter(api, syncManager);
  return dataAdapter;
}

// 为了兼容现有代码，保留原有函数名但使用数据适配器
async function getSettings() {
  return dataAdapter ? await dataAdapter.getSettings() : {
    pityDays: 0, 
    luProbability: 1,
    multiMode: false 
  };
}

async function saveSettings(settings) {
  if (dataAdapter) {
    await dataAdapter.saveSettings(settings);
  } else {
    localStorage.setItem('lubuluSettings', JSON.stringify(settings));
  }
}

async function getTodaySpinCount() {
  if (dataAdapter) {
    return await dataAdapter.getTodaySpinCount();
  } else {
    const today = getBeijingDateString();
    const todaySpins = localStorage.getItem(`spinCount_${today}`);
    return todaySpins ? parseInt(todaySpins) : 0;
  }
}

async function saveTodaySpinCount(count) {
  if (dataAdapter) {
    await dataAdapter.saveTodaySpinCount(count);
  } else {
    const today = getBeijingDateString();
    localStorage.setItem(`spinCount_${today}`, count.toString());
  }
}

// 修改现有的导出/导入函数
async function exportData() {
  if (dataAdapter) {
    const data = await dataAdapter.exportData();
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lubulu-data-${getBeijingDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // 使用原有的导出逻辑
    const data = {
      spinHistory: JSON.parse(localStorage.getItem('spinHistory') || '{}'),
      settings: JSON.parse(localStorage.getItem('lubuluSettings') || '{}'),
      exportDate: getBeijingDate().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lubulu-data-${getBeijingDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// 修改executeImport函数
async function executeImport() {
  if (!pendingImportData) return;
  
  try {
    if (dataAdapter) {
      await dataAdapter.importData(pendingImportData);
    } else {
      // 使用原有的导入逻辑
      localStorage.setItem('spinHistory', JSON.stringify(pendingImportData.spinHistory));
      if (pendingImportData.settings) {
        localStorage.setItem('lubuluSettings', JSON.stringify(pendingImportData.settings));
      }
    }
    
    // 更新UI
    await updateAllUI();
    hideImportConfirmDialog();
    showNotification('数据导入成功！', '✅');
  } catch (error) {
    console.error('Import error:', error);
    showNotification('数据导入失败: ' + error.message, '❌');
  }
}