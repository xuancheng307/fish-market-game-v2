-- ========================================
-- Migration 006: 新增預設供給量和餐廳資金池欄位
-- ========================================
-- 創建日期: 2025-12-05
-- 說明:
--   - 在 games 表新增預設每日供給量和餐廳資金池
--   - 這些值在創建遊戲時設定，每天開始時自動帶入作為預設值

-- ========================================
-- 1. 新增 A級魚預設每日供給量
-- ========================================
ALTER TABLE games
ADD COLUMN IF NOT EXISTS default_fish_a_supply INT NOT NULL DEFAULT 100;

-- ========================================
-- 2. 新增 B級魚預設每日供給量
-- ========================================
ALTER TABLE games
ADD COLUMN IF NOT EXISTS default_fish_b_supply INT NOT NULL DEFAULT 100;

-- ========================================
-- 3. 新增 A級魚餐廳預設每日資金池
-- ========================================
ALTER TABLE games
ADD COLUMN IF NOT EXISTS default_fish_a_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00;

-- ========================================
-- 4. 新增 B級魚餐廳預設每日資金池
-- ========================================
ALTER TABLE games
ADD COLUMN IF NOT EXISTS default_fish_b_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 50000.00;

-- ========================================
-- 完成
-- ========================================
SELECT '✅ 預設供給量和餐廳資金池欄位新增完成！' AS message;
