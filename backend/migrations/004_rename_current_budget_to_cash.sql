/**
 * Migration 004 - 將 current_budget 重命名為 cash
 * 日期: 2025-01-XX
 *
 * 目的: 統一使用更直觀的欄位名稱 cash
 */

-- 1. game_participants 表：current_budget → cash
ALTER TABLE game_participants
CHANGE COLUMN current_budget cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '當前現金';

-- 2. daily_results 表：current_budget → cash
ALTER TABLE daily_results
CHANGE COLUMN current_budget cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT '期末現金';

-- 完成
SELECT '✅ Migration 004 完成：current_budget 已重命名為 cash' AS status;
