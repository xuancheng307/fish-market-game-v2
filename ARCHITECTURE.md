# 魚市場遊戲 - 架構設計文件

**最後更新**: 2025-12-05

## 一、核心設計原則

1. **統一命名規範**: 資料庫 `snake_case`，API `camelCase`
2. **單一狀態源**: `games.phase` 為唯一階段狀態
3. **完全參數化**: 所有遊戲參數存儲於 `games` 表
4. **清晰的商業邏輯**: 借貸、結算、利息計算邏輯明確

---

## 二、核心商業邏輯

### 2.1 借貸邏輯

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
    return await createBid({ teamId, fishType, price, quantity, status: 'pending' });
}
```

**關鍵點**:
- 借貸時機: 提交投標時
- 現金變化: `cash += loanNeeded` (增加!)
- 借的錢即使沒用到也不退款，會持續計息

### 2.2 結算邏輯

**重要**: 現金扣除發生在**結算時**，只扣除成交數量的金額！

```javascript
// 買入結算邏輯
async function settleBuyingPhase(gameId, dayNumber) {
    // 1. 取得所有買入投標，按價格降序、時間升序排序
    const bids = await getBids({
        gameId, dayNumber, bidType: 'buy',
        orderBy: [['price', 'DESC'], ['createdAt', 'ASC']]
    });

    // 2. 處理固定滯銷 (2.5%)
    const unsoldQuantity = Math.floor(supply * 0.025);

    // 3. 分配給投標者
    for (const bid of bids) {
        const fulfilledQty = Math.min(bid.quantitySubmitted, remainingSupply);
        if (fulfilledQty > 0) {
            // 4. 扣除現金 (只扣除成交部分!)
            team.cash -= bid.price * fulfilledQty;
            // 5. 增加庫存
            team.fishAInventory += fulfilledQty; // or fishBInventory
        }
    }
}
```

### 2.3 每日結算

```javascript
async function dailySettlement(gameId, dayNumber) {
    for (const team of teams) {
        // 1. 計算利息
        const dailyInterest = team.totalLoan * game.loanInterestRate;

        // 2. 更新貸款餘額 (複利)
        team.totalLoan += dailyInterest;

        // 3. 從現金扣除利息
        team.cash -= dailyInterest;

        // 4. 計算 ROI
        const totalInvestment = team.initialBudget + team.totalLoanPrincipal;
        team.roi = (team.cumulativeProfit / totalInvestment) * 100;
    }
}
```

---

## 三、資料庫架構

### 3.1 games 表
```sql
CREATE TABLE games (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    status ENUM('pending', 'active', 'paused', 'finished', 'force_ended') DEFAULT 'pending',
    phase ENUM('pending', 'buying_open', 'buying_closed', 'selling_open', 'selling_closed', 'settled') DEFAULT 'pending',
    total_days INT NOT NULL DEFAULT 10,
    current_day INT DEFAULT 1,
    num_teams INT NOT NULL,
    initial_budget DECIMAL(10, 2) NOT NULL DEFAULT 100000.00,
    loan_interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0300,
    max_loan_ratio DECIMAL(3, 2) NOT NULL DEFAULT 2.00,
    unsold_fee_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    fixed_unsold_ratio DECIMAL(5, 4) NOT NULL DEFAULT 0.0250,
    -- ... 其他參數
);
```

### 3.2 game_days 表
```sql
CREATE TABLE game_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    day_number INT NOT NULL,
    -- 注意: 狀態已移至 games.phase，此表只存每日參數
    fish_a_supply INT NOT NULL DEFAULT 0,
    fish_a_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    fish_b_supply INT NOT NULL DEFAULT 0,
    fish_b_restaurant_budget DECIMAL(12, 2) NOT NULL DEFAULT 0.00
);
```

### 3.3 game_participants 表
```sql
CREATE TABLE game_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_id INT NOT NULL,
    user_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    cash DECIMAL(12, 2) NOT NULL,            -- 當前現金
    initial_budget DECIMAL(12, 2) NOT NULL,  -- 初始預算
    total_loan DECIMAL(12, 2) DEFAULT 0.00,
    total_loan_principal DECIMAL(12, 2) DEFAULT 0.00,
    fish_a_inventory INT DEFAULT 0,
    fish_b_inventory INT DEFAULT 0,
    cumulative_profit DECIMAL(12, 2) DEFAULT 0.00,
    roi DECIMAL(10, 4) DEFAULT 0.0000
);
```

### 3.4 bids 表
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、狀態流程

### 4.1 遊戲狀態流程

```
創建遊戲 (status=active, phase=pending)
  ↓
開始買入投標 → phase = 'buying_open'
  ↓
關閉買入投標 + 買入結算 → phase = 'buying_closed'
  ↓
開始賣出投標 → phase = 'selling_open'
  ↓
關閉賣出投標 + 賣出結算 → phase = 'selling_closed'
  ↓
每日結算 → phase = 'settled'
  ↓
推進到下一天 → current_day++, phase = 'pending'
  ↓
如果 current_day > total_days → status = 'finished'
```

### 4.2 前端狀態映射

```javascript
const STATUS_DISPLAY_TEXT = {
    'pending': '等待開始',
    'buying_open': '買入投標中',
    'buying_closed': '買入已關閉',
    'selling_open': '賣出投標中',
    'selling_closed': '賣出已關閉',
    'settled': '結算完成'
};
```

---

## 五、API 設計

### 5.1 命名轉換

所有 API 回應使用 camelCase：

```javascript
// 資料庫 → API
function teamToApi(dbRow) {
    return {
        id: dbRow.id,
        gameId: dbRow.game_id,
        teamName: dbRow.team_name,
        cash: parseFloat(dbRow.cash),
        initialBudget: parseFloat(dbRow.initial_budget),
        totalLoan: parseFloat(dbRow.total_loan),
        fishAInventory: dbRow.fish_a_inventory,
        fishBInventory: dbRow.fish_b_inventory,
        cumulativeProfit: parseFloat(dbRow.cumulative_profit),
        roi: parseFloat(dbRow.roi)
    };
}
```

### 5.2 主要 API 端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | /api/auth/login | 登入 |
| GET | /api/auth/me | 獲取當前用戶 |
| POST | /api/admin/games | 創建遊戲 |
| GET | /api/admin/games | 獲取遊戲列表 |
| GET | /api/admin/games/:id | 獲取遊戲詳情 |
| POST | /api/admin/games/:id/start-buying | 開始買入投標 |
| POST | /api/admin/games/:id/close-buying | 關閉買入投標 |
| POST | /api/admin/games/:id/start-selling | 開始賣出投標 |
| POST | /api/admin/games/:id/close-selling | 關閉賣出投標 |
| POST | /api/admin/games/:id/settle | 每日結算 |
| POST | /api/admin/games/:id/next-day | 推進到下一天 |
| GET | /api/team/active-game | 獲取當前遊戲 |
| POST | /api/team/bids | 提交投標 |
| GET | /api/team/games/:id/my-status | 獲取我的狀態 |

### 5.3 錯誤處理

```json
{
    "success": false,
    "error": {
        "code": "INSUFFICIENT_FUNDS",
        "message": "資金不足，無法投標",
        "details": {
            "required": 50000,
            "available": 45000
        }
    }
}
```

---

## 六、WebSocket 事件

| 事件名稱 | 方向 | 說明 |
|----------|------|------|
| phaseChange | Server → Client | 階段變更通知 |
| bidSubmitted | Server → Client | 有新投標提交 |
| settlementComplete | Server → Client | 結算完成通知 |
| gameUpdate | Server → Client | 遊戲更新通知 |

---

## 七、關鍵檔案位置

| 功能 | 檔案路徑 |
|------|----------|
| 資料轉換 | `backend/src/utils/transformers.js` |
| 結算邏輯 | `backend/src/services/SettlementService.js` |
| 借貸邏輯 | `backend/src/services/LoanService.js` |
| 投標邏輯 | `backend/src/services/BidService.js` |
| 遊戲控制 | `backend/src/services/GameService.js` |
| 前端 API | `frontend/lib/api.ts` |
| 類型定義 | `frontend/lib/types.ts` |
| WebSocket | `frontend/lib/websocket.ts` |
