# 魚市場遊戲 - 重構架構設計文件

**建立日期**: 2025-12-02
**專案目標**: 從零開始重構，避免舊版本的系統性問題
**核心原則**: 命名一致性、參數化配置、清晰的狀態管理、統一的 API 格式

---

## 一、重構原因與目標

### 1.1 舊版本的系統性問題

1. **命名不一致** - snake_case vs camelCase 混用，導致 25+ 處需要修正
2. **硬編碼值** - 25+ 處硬編碼，難以調整參數
3. **狀態管理混亂** - games.phase 與 game_days.status 雙軌制，邏輯複雜
4. **API 格式不統一** - 部分返回 snake_case，部分返回 camelCase

### 1.2 重構目標

- ✅ **統一命名規範**: 資料庫 snake_case，API/前端 camelCase，明確轉換層
- ✅ **完全參數化**: 所有遊戲參數可調整，存儲於 games 表
- ✅ **單一狀態源**: 使用 games.phase 作為唯一階段狀態
- ✅ **統一 API 格式**: 所有 API 返回 camelCase
- ✅ **清晰的商業邏輯**: 借貸、結算、利息計算邏輯明確且正確

---

## 二、核心商業邏輯（已確認正確）

### 2.1 借貸邏輯 (CRITICAL - 多次修正後的最終版本)

**重要**: 借貸發生在**投標時**，不是結算時！

```javascript
// 投標時的邏輯
async function submitBuyBid(teamId, fishType, price, quantity) {
    const team = await getTeam(teamId);
    const bidAmount = price * quantity;

    // 1. 計算可用資金
    const maxLoan = team.initialBudget * team.maxLoanRatio;
    const remainingLoanCapacity = maxLoan - team.totalLoan;
    const availableFunds = team.cash + remainingLoanCapacity;

    // 2. 檢查資金是否足夠
    if (bidAmount > availableFunds) {
        throw new Error('資金不足，無法投標');
    }

    // 3. 如果需要借貸 (關鍵: 現金會增加!)
    if (bidAmount > team.cash) {
        const loanNeeded = bidAmount - team.cash;
        team.totalLoan += loanNeeded;
        team.totalLoanPrincipal += loanNeeded;
        team.cash += loanNeeded;  // ← 現金增加!
    }

    // 4. 此時不扣除現金，只保存借貸記錄
    await saveTeam(team);

    // 5. 創建投標記錄
    return await createBid({
        teamId,
        fishType,
        price,
        quantity,
        status: 'pending'
    });
}
```

**關鍵點**:
- ✅ 借貸時機: 提交投標時
- ✅ 現金變化: `cash += loanNeeded` (增加!)
- ✅ 此時不扣除現金，只是確保有錢可以下單
- ✅ 借的錢即使沒用到也不退款，會持續計息

### 2.2 結算邏輯

**重要**: 現金扣除發生在**結算時**，只扣除成交數量的金額！

```javascript
// 買入結算邏輯
async function settleBuyingPhase(gameId, dayNumber) {
    // 1. 取得所有買入投標，按價格降序、時間升序排序
    const bids = await getBids({
        gameId,
        dayNumber,
        bidType: 'buy',
        orderBy: [
            ['price', 'DESC'],      // 價格高優先
            ['createdAt', 'ASC']    // 相同價格，早提交優先
        ]
    });

    const supply = await getDaySupply(gameId, dayNumber, fishType);
    let remainingSupply = supply;

    // 2. 處理固定滯銷 (2.5%)
    const unsoldQuantity = Math.floor(supply * 0.025);
    remainingSupply -= unsoldQuantity;

    // 3. 分配給投標者
    for (const bid of bids) {
        const team = await getTeam(bid.teamId);

        // 計算成交數量
        const fulfilledQty = Math.min(bid.quantitySubmitted, remainingSupply);

        if (fulfilledQty > 0) {
            // 4. 扣除現金 (只扣除成交部分!)
            const transactionAmount = bid.price * fulfilledQty;
            team.cash -= transactionAmount;

            // 5. 增加庫存
            if (bid.fishType === 'A') {
                team.fishAInventory += fulfilledQty;
            } else {
                team.fishBInventory += fulfilledQty;
            }

            // 6. 更新投標狀態
            bid.quantityFulfilled = fulfilledQty;
            bid.status = fulfilledQty === bid.quantitySubmitted ? 'fulfilled' : 'partial';

            await saveBid(bid);
            remainingSupply -= fulfilledQty;
        } else {
            bid.status = 'failed';
            await saveBid(bid);
        }

        await saveTeam(team);
    }

    // 7. 重要: 未成交的投標，借的錢不退款!
    // 這些錢會持續計息直到遊戲結束
}
```

**關鍵點**:
- ✅ 現金扣除時機: 結算時
- ✅ 扣除金額: `price × fulfilledQty` (只扣除成交部分)
- ✅ 未成交部分: 不退款，借的錢會持續計息
- ✅ 優先順序: 價格高優先，相同價格早提交優先

### 2.3 賣出結算邏輯

```javascript
// 賣出結算邏輯
async function settleSellingPhase(gameId, dayNumber) {
    // 1. 取得所有賣出投標，按價格升序、時間升序排序
    const bids = await getBids({
        gameId,
        dayNumber,
        bidType: 'sell',
        orderBy: [
            ['price', 'ASC'],       // 價格低優先
            ['createdAt', 'ASC']    // 相同價格，早提交優先
        ]
    });

    const restaurantBudget = await getDayRestaurantBudget(gameId, dayNumber, fishType);
    let remainingBudget = restaurantBudget;

    // 2. 處理固定滯銷 (2.5%) - 標價最高的優先滯銷
    const highestPriceBids = getHighestPriceBids(bids);
    const totalHighestPriceQty = highestPriceBids.reduce((sum, b) => sum + b.quantitySubmitted, 0);
    const totalSupply = bids.reduce((sum, b) => sum + b.quantitySubmitted, 0);
    const unsoldQuantity = Math.floor(totalSupply * 0.025);

    // 標記滯銷
    markUnsold(highestPriceBids, unsoldQuantity);

    // 3. 分配給餐廳買家
    for (const bid of bids) {
        if (bid.markedAsUnsold > 0) {
            // 處理滯銷部分
            const team = await getTeam(bid.teamId);
            const unsoldFee = bid.markedAsUnsold * team.unsoldFeePerKg;
            team.cash -= unsoldFee;

            // 減少庫存
            if (bid.fishType === 'A') {
                team.fishAInventory -= bid.markedAsUnsold;
            } else {
                team.fishBInventory -= bid.markedAsUnsold;
            }

            await saveTeam(team);
        }

        const sellableQty = bid.quantitySubmitted - (bid.markedAsUnsold || 0);
        const maxAffordable = Math.floor(remainingBudget / bid.price);
        const fulfilledQty = Math.min(sellableQty, maxAffordable);

        if (fulfilledQty > 0) {
            const team = await getTeam(bid.teamId);

            // 4. 增加現金
            const revenue = bid.price * fulfilledQty;
            team.cash += revenue;

            // 5. 減少庫存
            if (bid.fishType === 'A') {
                team.fishAInventory -= fulfilledQty;
            } else {
                team.fishBInventory -= fulfilledQty;
            }

            // 6. 更新投標狀態
            bid.quantityFulfilled = fulfilledQty;
            bid.status = (fulfilledQty + (bid.markedAsUnsold || 0)) === bid.quantitySubmitted ? 'fulfilled' : 'partial';

            await saveBid(bid);
            await saveTeam(team);

            remainingBudget -= revenue;
        }
    }
}
```

**關鍵點**:
- ✅ 優先順序: 價格低優先，相同價格早提交優先
- ✅ 固定滯銷: 最高價的 2.5% 自動滯銷
- ✅ 滯銷費用: `unsoldQuantity × unsoldFeePerKg`
- ✅ 現金增加: `cash += revenue`

### 2.4 每日結算 (利息與ROI)

```javascript
async function dailySettlement(gameId, dayNumber) {
    const teams = await getGameTeams(gameId);
    const game = await getGame(gameId);

    for (const team of teams) {
        // 1. 計算利息
        const interestRate = game.loanInterestRate; // 例: 0.03 (3%)
        const dailyInterest = team.totalLoan * interestRate;

        // 2. 更新貸款餘額 (複利)
        team.totalLoan += dailyInterest;

        // 3. 從現金扣除利息
        team.cash -= dailyInterest;

        // 4. 計算當日損益
        const dayProfit = calculateDayProfit(team, dayNumber);
        team.cumulativeProfit += dayProfit;

        // 5. 計算 ROI
        const totalInvestment = team.initialBudget + team.totalLoanPrincipal;
        team.roi = (team.cumulativeProfit / totalInvestment) * 100;

        // 6. 保存
        await saveTeam(team);

        // 7. 記錄每日結果
        await saveDailyResult({
            gameId,
            teamId: team.id,
            dayNumber,
            revenue: team.dailyRevenue,
            cost: team.dailyCost,
            profit: dayProfit,
            interestPaid: dailyInterest,
            cash: team.cash,
            totalLoan: team.totalLoan,
            roi: team.roi
        });
    }
}
```

**關鍵公式**:
- 利息: `dailyInterest = totalLoan × loanInterestRate`
- 複利: `totalLoan += dailyInterest`
- ROI: `roi = (cumulativeProfit / (initialBudget + totalLoanPrincipal)) × 100%`

---

## 三、資料庫架構設計

### 3.1 設計原則

1. **單一狀態源**: 使用 `games.phase` 作為唯一階段狀態
2. **games.status**: 管理遊戲整體狀態（active/paused/finished）
3. **完整參數化**: 所有遊戲參數存儲於 `games` 表
4. **清晰關聯**: 明確的外鍵關係

### 3.2 核心表結構

#### games 表 (遊戲)
```sql
CREATE TABLE games (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('pending', 'active', 'paused', 'finished', 'force_ended') DEFAULT 'pending',

    -- 階段狀態 (唯一狀態源)
    phase ENUM('pending', 'buying_open', 'buying_closed', 'selling_open', 'selling_closed', 'settled') DEFAULT 'pending',

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
);
```

#### game_days 表 (每日資料)
```sql
CREATE TABLE game_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    day_number INT NOT NULL,

    -- 注意: 狀態已移至 games.phase，此表只存每日參數

    -- 每日供給與需求 (A魚)
    fish_a_supply INT NOT NULL DEFAULT 0,
    fish_a_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    -- 每日供給與需求 (B魚)
    fish_b_supply INT NOT NULL DEFAULT 0,
    fish_b_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE KEY unique_game_day (game_id, day_number)
);
```

#### game_participants 表 (參與團隊)
```sql
CREATE TABLE game_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,

    -- 財務狀態
    cash DECIMAL(12, 2) NOT NULL,
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
);
```

#### bids 表 (投標記錄)
```sql
CREATE TABLE bids (
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
);
```

#### daily_results 表 (每日結算結果)
```sql
CREATE TABLE daily_results (
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
    cash DECIMAL(12, 2) NOT NULL,
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
);
```

#### users 表 (用戶)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'team') NOT NULL DEFAULT 'team',
    display_name VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_username (username),
    INDEX idx_role (role)
);
```

### 3.3 關鍵設計決策

1. **games.phase 為唯一階段狀態**: 簡化狀態管理，game_days 只存每日參數
2. **bids 表包含 game_id**: 方便查詢和級聯刪除
3. **分離 A/B 魚**: fish_a_* 和 fish_b_* 欄位分開，邏輯清晰
4. **完整參數化**: 所有遊戲規則參數都存儲在 games 表
5. **時間戳記**: created_at 記錄投標順序，用於相同價格的優先順序判斷

---

## 四、狀態流轉設計

### 4.1 遊戲狀態流程

```
創建遊戲
  ↓
games.status = 'active'
games.phase = 'pending' (第1天)
  ↓
開始買入投標
  ↓
games.phase = 'buying_open'
  ↓
關閉買入投標 + 買入結算
  ↓
games.phase = 'buying_closed'
[執行 settleBuyingPhase()]
  ↓
開始賣出投標
  ↓
games.phase = 'selling_open'
  ↓
關閉賣出投標 + 賣出結算
  ↓
games.phase = 'selling_closed'
[執行 settleSellingPhase()]
  ↓
執行每日結算
  ↓
games.phase = 'settled'
[執行 dailySettlement()]
  ↓
推進到下一天
  ↓
games.current_day++
games.phase = 'pending'
  ↓
如果 current_day > total_days
  ↓
games.status = 'finished'
```

### 4.2 前端狀態對應

前端需要顯示友善的狀態文字，透過映射函數轉換：

```javascript
function getPhaseDisplayText(gamePhase) {
    const mapping = {
        'pending': '等待開始',
        'buying_open': '買入投標中',
        'buying_closed': '買入已關閉',
        'selling_open': '賣出投標中',
        'selling_closed': '賣出已關閉',
        'settled': '結算完成'
    };
    return mapping[gamePhase] || '未知狀態';
}

function getAvailableActions(gamePhase) {
    const actions = {
        'pending': ['startBuying'],
        'buying_open': ['closeBuying'],
        'buying_closed': ['startSelling'],
        'selling_open': ['closeSelling'],
        'selling_closed': ['settle'],
        'settled': ['nextDay']
    };
    return actions[gamePhase] || [];
}
```

---

## 五、API 設計規範

### 5.1 命名轉換層

所有 API 回應必須統一使用 camelCase：

```javascript
// 資料庫轉換函數
function dbToApi(dbRow) {
    return {
        id: dbRow.id,
        gameName: dbRow.name,  // name → gameName
        gameStatus: dbRow.status,
        totalDays: dbRow.total_days,
        currentDay: dbRow.current_day,
        initialBudget: dbRow.initial_budget,
        loanInterestRate: dbRow.loan_interest_rate,
        maxLoanRatio: dbRow.max_loan_ratio,
        unsoldFeePerKg: dbRow.unsold_fee_per_kg,
        fixedUnsoldRatio: dbRow.fixed_unsold_ratio,
        // ... 其他欄位
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at
    };
}

// game_days 轉換 (不含 status，狀態在 games.phase)
function gameDayToApi(dbRow) {
    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        dayNumber: dbRow.day_number,
        fishASupply: dbRow.fish_a_supply,
        fishARestaurantBudget: dbRow.fish_a_restaurant_budget,
        fishBSupply: dbRow.fish_b_supply,
        fishBRestaurantBudget: dbRow.fish_b_restaurant_budget,
        createdAt: dbRow.created_at
    };
}

// team 轉換
function teamToApi(dbRow) {
    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        userId: dbRow.user_id,
        teamName: dbRow.team_name,
        cash: dbRow.cash,
        initialBudget: dbRow.initial_budget,
        totalLoan: dbRow.total_loan,
        totalLoanPrincipal: dbRow.total_loan_principal,
        fishAInventory: dbRow.fish_a_inventory,
        fishBInventory: dbRow.fish_b_inventory,
        cumulativeProfit: dbRow.cumulative_profit,
        roi: dbRow.roi
    };
}
```

### 5.2 API 端點規範

#### 管理員 API

**POST /api/admin/games** - 創建遊戲
```json
// Request
{
    "gameName": "測試遊戲",
    "description": "這是一個測試遊戲",
    "totalDays": 10,
    "numTeams": 6,
    "initialBudget": 100000,
    "loanInterestRate": 0.03,
    "maxLoanRatio": 2.0,
    "unsoldFeePerKg": 5.0,
    "teamNames": ["A組", "B組", "C組", "D組", "E組", "F組"]
}

// Response
{
    "success": true,
    "message": "遊戲創建成功",
    "data": {
        "gameId": 1,
        "gameName": "測試遊戲",
        "status": "active",
        "phase": "pending",
        "currentDay": 1
    }
}
```

**POST /api/admin/games/:id/start-buying** - 開始買入投標
```json
// Response
{
    "success": true,
    "message": "買入投標已開始",
    "data": {
        "id": 1,
        "phase": "buying_open",
        "currentDay": 1
    }
}
```

**POST /api/admin/games/:id/close-buying** - 關閉買入投標
```json
// Response
{
    "success": true,
    "message": "買入投標已關閉，結算完成",
    "data": {
        "game": {
            "id": 1,
            "phase": "buying_closed",
            "currentDay": 1
        },
        "settlementResults": { ... }
    }
}
```

**POST /api/admin/games/:id/start-selling** - 開始賣出投標
```json
// Response
{
    "success": true,
    "message": "賣出投標已開始",
    "data": {
        "id": 1,
        "phase": "selling_open",
        "currentDay": 1
    }
}
```

**POST /api/admin/games/:id/close-selling** - 關閉賣出投標
```json
// Response
{
    "success": true,
    "message": "賣出投標已關閉，結算完成",
    "data": {
        "game": {
            "id": 1,
            "phase": "selling_closed",
            "currentDay": 1
        },
        "settlementResults": { ... }
    }
}
```

**POST /api/admin/games/:id/settle** - 執行每日結算
```json
// Response
{
    "success": true,
    "message": "每日結算完成",
    "data": {
        "game": {
            "id": 1,
            "phase": "settled",
            "currentDay": 1
        },
        "settlementResults": { ... }
    }
}
```

**POST /api/admin/games/:id/next-day** - 推進到下一天
```json
// Response
{
    "success": true,
    "message": "已推進到第2天",
    "data": {
        "game": {
            "id": 1,
            "phase": "pending",
            "currentDay": 2
        },
        "finished": false
    }
}
```

**GET /api/admin/games/:id** - 獲取遊戲詳情
```json
// Response
{
    "success": true,
    "data": {
        "game": {
            "id": 1,
            "gameName": "測試遊戲",
            "status": "active",
            "phase": "pending",
            "currentDay": 1,
            "totalDays": 10
        },
        "currentDay": {
            "id": 1,
            "dayNumber": 1,
            "fishASupply": 1000,
            "fishBSupply": 800,
            "fishARestaurantBudget": 80000,
            "fishBRestaurantBudget": 60000
        },
        "teams": [
            {
                "id": 1,
                "teamName": "A組",
                "cash": 100000,
                "totalLoan": 0,
                "fishAInventory": 0,
                "fishBInventory": 0,
                "roi": 0
            }
        ]
    }
}
```

#### 團隊 API

**POST /api/bids** - 提交投標
```json
// Request
{
    "gameId": 1,
    "fishType": "A",
    "bidType": "buy",
    "price": 90,
    "quantity": 500
}

// Response
{
    "success": true,
    "message": "投標提交成功",
    "data": {
        "bidId": 1,
        "gameId": 1,
        "dayNumber": 1,
        "fishType": "A",
        "bidType": "buy",
        "price": 90,
        "quantitySubmitted": 500,
        "status": "pending",
        "loanTaken": 5000,
        "cashAfter": 105000
    }
}
```

**GET /api/games/:id/my-status** - 獲取我的狀態
```json
// Response
{
    "success": true,
    "data": {
        "team": {
            "id": 1,
            "teamName": "A組",
            "cash": 105000,
            "totalLoan": 5000,
            "totalLoanPrincipal": 5000,
            "fishAInventory": 0,
            "fishBInventory": 0,
            "cumulativeProfit": 0,
            "roi": 0
        },
        "game": {
            "id": 1,
            "phase": "buying_open",
            "currentDay": 1
        },
        "currentDay": {
            "dayNumber": 1,
            "fishASupply": 1000,
            "fishBSupply": 800
        },
        "myBids": [
            {
                "id": 1,
                "fishType": "A",
                "bidType": "buy",
                "price": 90,
                "quantitySubmitted": 500,
                "quantityFulfilled": 0,
                "status": "pending"
            }
        ]
    }
}
```

### 5.3 錯誤處理

統一錯誤格式：

```json
{
    "success": false,
    "error": {
        "code": "INSUFFICIENT_FUNDS",
        "message": "資金不足，無法投標",
        "details": {
            "required": 50000,
            "available": 45000,
            "maxLoan": 200000,
            "currentLoan": 155000
        }
    }
}
```

常見錯誤碼：
- `INSUFFICIENT_FUNDS` - 資金不足
- `INVALID_PHASE` - 當前階段不允許此操作
- `GAME_NOT_FOUND` - 遊戲不存在
- `INVALID_BID` - 無效的投標
- `DUPLICATE_BID` - 重複投標
- `UNAUTHORIZED` - 未授權

---

## 六、專案結構設計

```
魚市場遊戲重構/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # 資料庫連線配置
│   │   │   └── constants.js         # 常數定義
│   │   ├── models/
│   │   │   ├── Game.js              # 遊戲模型
│   │   │   ├── GameDay.js           # 每日資料模型
│   │   │   ├── Team.js              # 團隊模型
│   │   │   ├── Bid.js               # 投標模型
│   │   │   ├── DailyResult.js       # 每日結果模型
│   │   │   └── User.js              # 用戶模型
│   │   ├── services/
│   │   │   ├── GameService.js       # 遊戲業務邏輯
│   │   │   ├── BidService.js        # 投標業務邏輯
│   │   │   ├── SettlementService.js # 結算業務邏輯
│   │   │   └── LoanService.js       # 借貸業務邏輯
│   │   ├── controllers/
│   │   │   ├── AdminController.js   # 管理員控制器
│   │   │   ├── TeamController.js    # 團隊控制器
│   │   │   └── AuthController.js    # 認證控制器
│   │   ├── routes/
│   │   │   ├── admin.js             # 管理員路由
│   │   │   ├── team.js              # 團隊路由
│   │   │   └── auth.js              # 認證路由
│   │   ├── middleware/
│   │   │   ├── auth.js              # 認證中介層
│   │   │   ├── errorHandler.js     # 錯誤處理
│   │   │   └── validation.js        # 輸入驗證
│   │   ├── utils/
│   │   │   ├── transformers.js      # 資料轉換 (snake_case ↔ camelCase)
│   │   │   ├── validators.js        # 驗證函數
│   │   │   └── logger.js            # 日誌工具
│   │   └── server.js                # 主伺服器檔案
│   ├── tests/
│   │   ├── unit/                    # 單元測試
│   │   └── integration/             # 整合測試
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # 資料庫初始化
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── admin/
│   │   ├── index.html               # 管理員介面
│   │   ├── styles/
│   │   │   └── admin.css
│   │   └── scripts/
│   │       ├── admin.js
│   │       ├── gameControl.js
│   │       └── dashboard.js
│   ├── team/
│   │   ├── index.html               # 團隊介面
│   │   ├── styles/
│   │   │   └── team.css
│   │   └── scripts/
│   │       ├── team.js
│   │       ├── bidding.js
│   │       └── status.js
│   ├── shared/
│   │   ├── styles/
│   │   │   └── common.css
│   │   └── scripts/
│   │       ├── api.js               # API 呼叫封裝
│   │       ├── websocket.js         # WebSocket 連線
│   │       └── utils.js
│   └── login/
│       ├── index.html
│       └── login.js
├── docs/
│   ├── ARCHITECTURE.md              # 本文件
│   ├── API.md                       # API 詳細文檔
│   ├── GAME_RULES.md                # 遊戲規則文檔
│   └── DEPLOYMENT.md                # 部署指南
├── .gitignore
├── README.md
└── package.json
```

### 6.1 模組職責劃分

#### Models (資料模型層)
- 負責資料庫 CRUD 操作
- 返回 snake_case 格式（資料庫原生格式）
- 不包含業務邏輯

#### Services (業務邏輯層)
- 處理複雜的業務邏輯
- 呼叫多個 Model 完成事務
- 使用 transformers 轉換資料格式

#### Controllers (控制器層)
- 處理 HTTP 請求
- 呼叫 Service 執行業務邏輯
- 返回統一格式的 API 回應

#### Middleware (中介層)
- 認證授權
- 輸入驗證
- 錯誤處理

#### Utils (工具層)
- 資料轉換 (transformers)
- 通用驗證函數
- 日誌記錄

---

## 七、開發計劃

### 7.1 第一階段：基礎設施 (2-3 小時)

- [x] 創建專案目錄結構
- [ ] 初始化 npm 專案
- [ ] 安裝必要依賴 (express, mysql2, socket.io, bcrypt, jsonwebtoken, dotenv)
- [ ] 設定資料庫連線
- [ ] 創建資料庫表 (執行 migrations)
- [ ] 建立 transformers 工具函數
- [ ] 建立基本的錯誤處理中介層

### 7.2 第二階段：認證與用戶管理 (2-3 小時)

- [ ] User Model (CRUD)
- [ ] AuthController (登入、登出、驗證)
- [ ] JWT 中介層
- [ ] 登入頁面 (frontend/login)

### 7.3 第三階段：遊戲管理 (3-4 小時)

- [ ] Game Model
- [ ] GameDay Model
- [ ] Team Model
- [ ] GameService (創建遊戲、狀態轉換)
- [ ] AdminController (遊戲管理 API)
- [ ] 管理員介面基本功能

### 7.4 第四階段：投標系統 (3-4 小時)

- [ ] Bid Model
- [ ] LoanService (借貸邏輯)
- [ ] BidService (投標提交、驗證)
- [ ] TeamController (投標 API)
- [ ] 團隊介面投標功能

### 7.5 第五階段：結算系統 (3-4 小時)

- [ ] DailyResult Model
- [ ] SettlementService (買入結算、賣出結算、每日結算)
- [ ] 固定滯銷邏輯
- [ ] 利息計算邏輯
- [ ] ROI 計算邏輯

### 7.6 第六階段：前端整合 (2-3 小時)

- [ ] WebSocket 即時更新
- [ ] 管理員儀表板完整功能
- [ ] 團隊狀態顯示
- [ ] 結算結果顯示
- [ ] QR Code 生成

### 7.7 第七階段：測試與部署 (2-3 小時)

- [ ] 單元測試
- [ ] 整合測試
- [ ] 完整遊戲流程測試
- [ ] Railway 部署
- [ ] 環境變數配置
- [ ] 文檔完善

**預計總時間**: 17-24 小時

---

## 八、關鍵檢查清單

### 8.1 開發過程檢查

**命名一致性**:
- [ ] 所有資料庫欄位使用 snake_case
- [ ] 所有 API 回應使用 camelCase
- [ ] 轉換函數覆蓋所有資料模型
- [ ] 前端使用 camelCase 存取資料

**狀態管理**:
- [ ] 使用 games.phase 作為唯一階段狀態
- [ ] game_days 表只存每日參數（供給、預算）
- [ ] 狀態轉換邏輯正確
- [ ] WebSocket 更新正確

**商業邏輯**:
- [ ] 借貸發生在投標時
- [ ] 借貸時現金增加
- [ ] 結算時現金減少
- [ ] 無退款邏輯
- [ ] 固定滯銷 2.5%
- [ ] 利息複利計算
- [ ] ROI 公式正確

**API 格式**:
- [ ] 所有回應統一格式
- [ ] 錯誤處理完善
- [ ] 驗證邏輯完整

### 8.2 測試檢查

- [ ] 創建遊戲測試
- [ ] 投標流程測試 (有錢、借貸、資金不足)
- [ ] 買入結算測試 (價格排序、早提交優先、固定滯銷)
- [ ] 賣出結算測試 (價格排序、早提交優先、滯銷費用)
- [ ] 每日結算測試 (利息、ROI)
- [ ] 完整10天遊戲流程測試
- [ ] 多團隊競爭測試
- [ ] 邊界條件測試 (供給不足、預算不足)

### 8.3 部署檢查

- [ ] Railway MySQL 連線正常
- [ ] 環境變數正確配置
- [ ] 資料庫表創建成功
- [ ] WebSocket 連線正常
- [ ] 靜態檔案服務正常
- [ ] HTTPS 配置正確

---

## 九、總結

這份架構文件記錄了魚市場遊戲重構的完整設計，核心目標是解決舊版本的系統性問題：

1. **統一命名**: 資料庫 snake_case，API camelCase，明確轉換
2. **單一狀態**: 使用 games.phase 管理階段狀態
3. **正確邏輯**: 借貸在投標時、現金在結算時扣除、無退款
4. **完全參數化**: 所有遊戲參數可調整
5. **清晰結構**: 分層架構，職責明確

**開始開發前請確認**:
- ✅ 理解借貸邏輯 (投標時借貸，現金增加)
- ✅ 理解結算邏輯 (結算時扣除，無退款)
- ✅ 理解狀態管理 (games.phase 唯一階段狀態)
- ✅ 理解命名轉換 (transformers 函數)

讓我們開始建立一個乾淨、可維護的系統！
