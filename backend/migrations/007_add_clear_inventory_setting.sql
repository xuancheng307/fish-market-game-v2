-- ========================================
-- Migration 007: 新增庫存清零設定欄位
-- ========================================
-- 創建日期: 2025-12-05
-- 說明:
--   - 在 games 表新增 clear_inventory_daily 布林值
--   - TRUE = 每日結束時清空庫存 (預設，現有行為)
--   - FALSE = 庫存可以累積到隔天
--   - 使用 MySQL 8.x 相容語法

ALTER TABLE games
ADD COLUMN clear_inventory_daily TINYINT(1) NOT NULL DEFAULT 1 COMMENT '每日結束時是否清空庫存 (1=清空, 0=保留)';
