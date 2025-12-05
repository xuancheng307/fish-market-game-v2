-- ========================================
-- Migration 006: 新增預設供給量和餐廳資金池欄位
-- ========================================
-- 創建日期: 2025-12-05
-- 說明:
--   - 在 games 表新增預設每日供給量和餐廳資金池
--   - 這些值在創建遊戲時設定，每天開始時自動帶入作為預設值
--   - 使用 MySQL 8.x 相容語法

-- ========================================
-- 新增所有欄位（若已存在會報錯但被 run.js 忽略）
-- ========================================
ALTER TABLE games
ADD COLUMN default_fish_a_supply INT NOT NULL DEFAULT 100;

ALTER TABLE games
ADD COLUMN default_fish_b_supply INT NOT NULL DEFAULT 100;

ALTER TABLE games
ADD COLUMN default_fish_a_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00;

ALTER TABLE games
ADD COLUMN default_fish_b_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00
