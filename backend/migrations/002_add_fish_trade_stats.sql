-- ========================================
-- Migration 002: 新增魚類交易量統計欄位
-- ========================================
-- 目的: 在 daily_results 表中新增每日買入/賣出的魚數量統計
-- 日期: 2025-12-03

-- 新增交易量統計欄位到 daily_results 表
ALTER TABLE daily_results
ADD COLUMN fish_a_purchased INT DEFAULT 0 COMMENT 'A級魚買入數量' AFTER fish_b_inventory,
ADD COLUMN fish_a_sold INT DEFAULT 0 COMMENT 'A級魚賣出數量' AFTER fish_a_purchased,
ADD COLUMN fish_b_purchased INT DEFAULT 0 COMMENT 'B級魚買入數量' AFTER fish_a_sold,
ADD COLUMN fish_b_sold INT DEFAULT 0 COMMENT 'B級魚賣出數量' AFTER fish_b_purchased
