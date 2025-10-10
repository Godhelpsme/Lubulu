/**
 * Lubulu 应用配置常量
 * 集中管理所有魔法数字和配置参数
 */

// ========== Canvas 配置 ==========
export const CANVAS_CONFIG = {
  SIZE: 480, // Canvas尺寸
  CENTER_X: 240, // 中心点X坐标
  CENTER_Y: 240, // 中心点Y坐标
  RADIUS: 220, // 轮盘半径
  SEGMENTS: 99, // 扇形数量
  TEXT_RADIUS: 170, // 文字显示半径
};

// ========== 动画配置 ==========
export const ANIMATION_CONFIG = {
  SPIN_DURATION: 3000, // 旋转持续时间(ms)
  SPIN_MIN_SPEED: 10, // 最小旋转速度
  SPIN_MAX_SPEED: 30, // 最大旋转速度
  SPIN_EASING: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // 缓动函数
  FRAME_RATE: 60, // 目标帧率
};

// ========== API 配置 ==========
export const API_CONFIG = {
  TIMEOUT: 10000, // 请求超时时间(ms)
  MAX_RETRIES: 3, // 最大重试次数
  RETRY_DELAY: 1000, // 重试延迟(ms)
  HEALTH_CHECK_INTERVAL: 60000, // 健康检查间隔(ms)
};

// ========== 存储配置 ==========
export const STORAGE_CONFIG = {
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 缓存过期时间(24小时)
  MAX_HISTORY_DAYS: 365, // 最大历史记录天数
  SYNC_DEBOUNCE: 2000, // 同步防抖时间(ms)
  LOCAL_STORAGE_PREFIX: 'lubulu_', // LocalStorage键前缀
};

// ========== 业务逻辑配置 ==========
export const BUSINESS_CONFIG = {
  MIN_LU_PROBABILITY: 1, // 最小Lu概率(%)
  MAX_LU_PROBABILITY: 98, // 最大Lu概率(%)
  DEFAULT_LU_PROBABILITY: 1, // 默认Lu概率(%)
  MIN_PITY_DAYS: 0, // 最小保底天数
  MAX_PITY_DAYS: 365, // 最大保底天数
  DEFAULT_PITY_DAYS: 0, // 默认保底天数
};

// ========== 认证配置 ==========
export const AUTH_CONFIG = {
  MIN_USERNAME_LENGTH: 3, // 最小用户名长度
  MAX_USERNAME_LENGTH: 20, // 最大用户名长度
  MIN_PASSWORD_LENGTH: 8, // 最小密码长度
  TOKEN_KEY: 'lubulu_auth_token', // Token存储键
  USER_KEY: 'lubulu_user_info', // 用户信息存储键
};

// ========== UI 配置 ==========
export const UI_CONFIG = {
  NOTIFICATION_DURATION: 3000, // 通知显示时间(ms)
  TOAST_DURATION: 2000, // Toast显示时间(ms)
  DIALOG_ANIMATION_DURATION: 300, // 对话框动画时间(ms)
  LOADING_MIN_DURATION: 500, // 最小加载时间(ms)
};

// ========== 颜色配置 ==========
export const COLORS = {
  LU_COLOR: '#F44336', // Lu结果颜色(红色)
  NO_LU_COLOR: '#4CAF50', // 不Lu结果颜色(绿色)
  PRIMARY: '#673AB7', // 主色调(紫色)
  SECONDARY: '#7E57C2', // 次要色调
  SUCCESS: '#4CAF50', // 成功色
  WARNING: '#FF9800', // 警告色
  ERROR: '#F44336', // 错误色
  INFO: '#2196F3', // 信息色
};

// ========== 时区配置 ==========
export const TIMEZONE_CONFIG = {
  BEIJING_OFFSET: 8 * 60 * 60 * 1000, // 北京时区偏移(UTC+8)
  DATE_FORMAT: 'YYYY-MM-DD', // 日期格式
};

// ========== 性能配置 ==========
export const PERFORMANCE_CONFIG = {
  SLOW_OPERATION_THRESHOLD: 1000, // 慢操作阈值(ms)
  WARNING_THRESHOLD: 100, // 警告阈值(ms)
  DEBOUNCE_DELAY: 300, // 默认防抖延迟(ms)
  THROTTLE_DELAY: 1000, // 默认节流延迟(ms)
};

// ========== 验证规则 ==========
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // 邮箱验证正则
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/, // 用户名验证正则
};

// ========== 导出默认配置 ==========
export const DEFAULT_SETTINGS = {
  luProbability: BUSINESS_CONFIG.DEFAULT_LU_PROBABILITY,
  pityDays: BUSINESS_CONFIG.DEFAULT_PITY_DAYS,
  multiMode: false,
  soundEnabled: true,
  animationEnabled: true,
};

// ========== API端点 ==========
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  VALIDATE: '/api/auth/validate',
  LOGOUT: '/api/auth/logout',
  SETTINGS: '/api/settings',
  HISTORY: '/api/history',
  DAILY_COUNT: '/api/daily-count',
};
