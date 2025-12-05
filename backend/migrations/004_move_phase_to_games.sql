-- Migration: 將 phase 從 game_days.status 移到 games.phase
-- 這樣更直覺：「當前階段」是遊戲的屬性，不是某一天的屬性

-- 1. 在 games 表新增 phase 欄位
ALTER TABLE games ADD COLUMN phase VARCHAR(20) DEFAULT 'pending' AFTER current_day;

-- 2. 將現有 active 遊戲的 phase 從 game_days.status 複製過來
UPDATE games g
SET phase = (
    SELECT gd.status
    FROM game_days gd
    WHERE gd.game_id = g.id AND gd.day_number = g.current_day
    LIMIT 1
)
WHERE g.status = 'active';

-- 3. 對於已結束的遊戲，設定 phase 為 'settled'
UPDATE games SET phase = 'settled' WHERE status IN ('finished', 'force_ended');

-- 注意：game_days.status 欄位暫時保留，待確認穩定後可以移除
