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
