-- 魚市場遊戲 - 資料庫初始化腳本
-- 重構版本 v2.0
-- 建立日期: 2025-12-02

-- ========================================
-- 1. 用戶表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'team') NOT NULL DEFAULT 'team',
    display_name VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. 遊戲表 (移除 phase 欄位!)
-- ========================================
CREATE TABLE IF NOT EXISTS games (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('pending', 'active', 'paused', 'finished', 'force_ended') DEFAULT 'pending',

    -- 基本設定
    total_days INT NOT NULL DEFAULT 10,
    current_day INT DEFAULT 1,
    num_teams INT NOT NULL,

    -- 財務參數
    initial_budget DECIMAL(10, 2) NOT NULL DEFAULT 100000.00,
    daily_interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    loan_interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0300,
    max_loan_ratio DECIMAL(3, 2) NOT NULL DEFAULT 2.00,

    -- 滯銷參數
    unsold_fee_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    fixed_unsold_ratio DECIMAL(5, 4) NOT NULL DEFAULT 0.0250,

    -- 底價參數
    distributor_floor_price_a DECIMAL(10, 2) DEFAULT 0.00,
    distributor_floor_price_b DECIMAL(10, 2) DEFAULT 0.00,
    target_price_a DECIMAL(10, 2) DEFAULT 0.00,
    target_price_b DECIMAL(10, 2) DEFAULT 0.00,

    -- 時間參數
    buying_duration INT DEFAULT 300,
    selling_duration INT DEFAULT 300,

    -- 其他
    team_names TEXT,
    is_force_ended BOOLEAN DEFAULT FALSE,
    force_ended_at TIMESTAMP NULL,
    force_end_day INT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_current_day (current_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. 每日資料表 (唯一狀態來源)
-- ========================================
CREATE TABLE IF NOT EXISTS game_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    day_number INT NOT NULL,

    -- 唯一狀態欄位
    status ENUM(
        'pending',
        'buying_open',
        'buying_closed',
        'selling_open',
        'selling_closed',
        'settled'
    ) DEFAULT 'pending',

    -- 每日供給與需求 (A魚)
    fish_a_supply INT NOT NULL DEFAULT 0,
    fish_a_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- 每日供給與需求 (B魚)
    fish_b_supply INT NOT NULL DEFAULT 0,
    fish_b_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY unique_game_day (game_id, day_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. 參與團隊表
-- ========================================
CREATE TABLE IF NOT EXISTS game_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,

    -- 財務狀態
    current_budget DECIMAL(12, 2) NOT NULL,
    initial_budget DECIMAL(12, 2) NOT NULL,
    total_loan DECIMAL(12, 2) DEFAULT 0.00,
    total_loan_principal DECIMAL(12, 2) DEFAULT 0.00,

    -- 庫存
    fish_a_inventory INT DEFAULT 0,
    fish_b_inventory INT DEFAULT 0,

    -- 累計損益
    cumulative_profit DECIMAL(12, 2) DEFAULT 0.00,
    roi DECIMAL(10, 4) DEFAULT 0.0000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_game_user (game_id, user_id),
    INDEX idx_game_id (game_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. 投標記錄表
-- ========================================
CREATE TABLE IF NOT EXISTS bids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    game_day_id INT NOT NULL,
    day_number INT NOT NULL,
    team_id INT NOT NULL,

    bid_type ENUM('buy', 'sell') NOT NULL,
    fish_type ENUM('A', 'B') NOT NULL,

    price DECIMAL(10, 2) NOT NULL,
    quantity_submitted INT NOT NULL,
    quantity_fulfilled INT DEFAULT 0,

    status ENUM('pending', 'fulfilled', 'partial', 'failed') DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (game_day_id) REFERENCES game_days(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES game_participants(id) ON DELETE CASCADE,

    INDEX idx_game_day (game_id, day_number),
    INDEX idx_team (team_id),
    INDEX idx_type (bid_type, fish_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 6. 每日結算結果表
-- ========================================
CREATE TABLE IF NOT EXISTS daily_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    team_id INT NOT NULL,
    day_number INT NOT NULL,

    -- 當日財務數據
    revenue DECIMAL(12, 2) DEFAULT 0.00,
    cost DECIMAL(12, 2) DEFAULT 0.00,
    profit DECIMAL(12, 2) DEFAULT 0.00,
    interest_paid DECIMAL(12, 2) DEFAULT 0.00,
    unsold_fee DECIMAL(12, 2) DEFAULT 0.00,

    -- 當日結束時狀態
    current_budget DECIMAL(12, 2) NOT NULL,
    total_loan DECIMAL(12, 2) NOT NULL,
    fish_a_inventory INT DEFAULT 0,
    fish_b_inventory INT DEFAULT 0,

    -- 累計數據
    cumulative_profit DECIMAL(12, 2) DEFAULT 0.00,
    roi DECIMAL(10, 4) DEFAULT 0.0000,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES game_participants(id) ON DELETE CASCADE,

    UNIQUE KEY unique_team_day (game_id, team_id, day_number),
    INDEX idx_game_day (game_id, day_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. 初始化管理員帳號
-- ========================================
-- 密碼: admin (使用 bcrypt hash)
-- $2b$10$YourHashHere - 實際使用時需要更新
INSERT INTO users (username, password_hash, role, display_name)
VALUES ('admin', '$2b$10$YourHashHere', 'admin', '系統管理員')
ON DUPLICATE KEY UPDATE username = username;

-- ========================================
-- 完成
-- ========================================
SELECT '✅ 資料庫初始化完成！' AS message;
