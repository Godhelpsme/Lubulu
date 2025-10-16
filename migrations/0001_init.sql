-- Migration: 初始化数据库结构
-- Date: 2025-01-01

-- 抽取历史记录表
CREATE TABLE IF NOT EXISTS spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD 格式
  result TEXT NOT NULL CHECK(result IN ('lu', 'no_lu')),
  is_pity INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,  -- Unix timestamp
  UNIQUE(user_id, date)
);

-- 索引优化查询
CREATE INDEX IF NOT EXISTS idx_user_date ON spin_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_timestamp ON spin_history(user_id, timestamp);

-- 用户配置表 (可选,也可以全部用 KV)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  lu_probability INTEGER DEFAULT 1 CHECK(lu_probability BETWEEN 1 AND 98),
  pity_days INTEGER DEFAULT 0,
  multi_mode INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
