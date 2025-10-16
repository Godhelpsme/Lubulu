-- Migration: 删除未使用的 user_settings 表
-- Date: 2025-10-17
-- Reason: 此表在代码中从未使用,所有配置存储在 KV 中

DROP TABLE IF EXISTS user_settings;
