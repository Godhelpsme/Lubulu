-- =====================================================
-- Lubulu 数据库完整迁移脚本
-- =====================================================
-- 用途: 在 Cloudflare D1 Console 中一次性执行所有迁移
-- 使用方法: 复制本文件全部内容,粘贴到 D1 Console 并执行
-- =====================================================

-- Migration 1: 初始化数据库结构
-- Date: 2025-01-01

CREATE TABLE IF NOT EXISTS spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('lu', 'no_lu')),
  is_pity BOOLEAN DEFAULT FALSE,
  timestamp INTEGER NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_date ON spin_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_timestamp ON spin_history(user_id, timestamp);

-- Migration 2: 删除未使用的 user_settings 表
-- Date: 2025-10-17

DROP TABLE IF EXISTS user_settings;

-- =====================================================
-- 迁移完成!
-- 执行以下 SQL 验证表结构:
-- SELECT name FROM sqlite_master WHERE type='table';
-- =====================================================
