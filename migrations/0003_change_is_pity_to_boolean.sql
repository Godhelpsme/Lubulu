-- Migration: 将 is_pity 从 INTEGER 改为 BOOLEAN
-- Date: 2025-10-17
-- Reason: SQLite 支持 BOOLEAN,使用正确的类型避免客户端转换

-- SQLite 不支持直接 ALTER COLUMN,需要重建表
-- 1. 创建新表
CREATE TABLE spin_history_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('lu', 'no_lu')),
  is_pity BOOLEAN DEFAULT FALSE,  -- 改为 BOOLEAN
  timestamp INTEGER NOT NULL,
  UNIQUE(user_id, date)
);

-- 2. 复制数据 (将 INTEGER 0/1 转换为 BOOLEAN)
INSERT INTO spin_history_new (id, user_id, date, result, is_pity, timestamp)
SELECT id, user_id, date, result, CAST(is_pity AS BOOLEAN), timestamp
FROM spin_history;

-- 3. 删除旧表
DROP TABLE spin_history;

-- 4. 重命名新表
ALTER TABLE spin_history_new RENAME TO spin_history;

-- 5. 重建索引
CREATE INDEX idx_user_date ON spin_history(user_id, date);
CREATE INDEX idx_user_timestamp ON spin_history(user_id, timestamp);
