-- Lubulu 数据库架构
-- 用于 Cloudflare D1

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  settings TEXT NOT NULL, -- JSON格式
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 抽取历史记录表
CREATE TABLE IF NOT EXISTS spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT NOT NULL,
  spin_count INTEGER DEFAULT 1,
  is_pity_triggered INTEGER DEFAULT 0,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_spin_history_user_date ON spin_history(user_id, date);
CREATE INDEX idx_spin_history_date ON spin_history(date);

-- 用户统计表 (可选，用于快速查询)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_spins INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_updated TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
