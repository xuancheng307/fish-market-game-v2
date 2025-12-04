-- ========================================
-- Migration 003: 新增缺失的資料庫欄位
-- ========================================
-- 目的: 補齊前後端對接所需的欄位
-- 日期: 2025-12-04
--
-- 新增欄位:
-- 1. daily_results.game_day_id - 遊戲天數 ID (關聯到 game_days 表)
-- 2. daily_results.fish_a_unsold - A級魚滯銷數量
-- 3. daily_results.fish_b_unsold - B級魚滯銷數量
-- 4. game_participants.team_number - 團隊編號

-- 1. 新增 daily_results 表的欄位
ALTER TABLE daily_results
ADD COLUMN game_day_id INT AFTER game_id,
ADD COLUMN fish_a_unsold INT DEFAULT 0 COMMENT 'A級魚滯銷數量' AFTER fish_b_sold,
ADD COLUMN fish_b_unsold INT DEFAULT 0 COMMENT 'B級魚滯銷數量' AFTER fish_a_unsold;

-- 2. 新增外鍵約束 (game_day_id → game_days.id)
-- ⚠️ 已存在，跳過此語句
-- ALTER TABLE daily_results
-- ADD CONSTRAINT fk_daily_results_game_day
-- FOREIGN KEY (game_day_id) REFERENCES game_days(id) ON DELETE CASCADE;

-- 3. 新增 game_participants 表的團隊編號欄位
ALTER TABLE game_participants
ADD COLUMN team_number INT COMMENT '團隊編號 (01, 02, ...)' AFTER team_name;

-- 4. 新增索引以提升查詢效能
ALTER TABLE game_participants
ADD INDEX idx_team_number (team_number);
