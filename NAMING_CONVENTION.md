# 命名規範 - 最關鍵的系統規則

## ⚠️ 重要警告

**參數名稱一致性是整個系統最關鍵的部分！**

舊版本最大的問題就是命名不一致，導致需要反覆修補。這個重構版本的首要目標就是**徹底解決命名問題**。

---

## 一、鐵律：絕不混用

### 資料庫層 → 永遠使用 snake_case

```javascript
// ✅ 正確
const dbRow = {
    game_id: 1,
    current_budget: 100000,
    fish_a_inventory: 500,
    total_loan: 5000,
    created_at: '2025-12-02'
};

// ❌ 錯誤 - 絕不在資料庫層使用 camelCase
const dbRow = {
    gameId: 1,              // 錯誤！
    currentBudget: 100000,  // 錯誤！
    fishAInventory: 500     // 錯誤！
};
```

### API/前端層 → 永遠使用 camelCase

```javascript
// ✅ 正確
const apiResponse = {
    gameId: 1,
    currentBudget: 100000,
    fishAInventory: 500,
    totalLoan: 5000,
    createdAt: '2025-12-02'
};

// ❌ 錯誤 - 絕不在 API 回應使用 snake_case
const apiResponse = {
    game_id: 1,              // 錯誤！
    current_budget: 100000,  // 錯誤！
    fish_a_inventory: 500    // 錯誤！
};
```

---

## 二、完整欄位對應表

### games 表
| 資料庫 (snake_case) | API (camelCase) | 說明 |
|---------------------|-----------------|------|
| `id` | `id` | ID 不變 |
| `name` | `gameName` | ⚠️ 特別注意：不是 game_name |
| `status` | `gameStatus` | 遊戲狀態 |
| `total_days` | `totalDays` | 總天數 |
| `current_day` | `currentDay` | 當前天數 |
| `num_teams` | `numTeams` | 團隊數量 |
| `initial_budget` | `initialBudget` | 初始預算 |
| `daily_interest_rate` | `dailyInterestRate` | 每日利息率 |
| `loan_interest_rate` | `loanInterestRate` | 借貸利息率 |
| `max_loan_ratio` | `maxLoanRatio` | 最大借貸比率 |
| `unsold_fee_per_kg` | `unsoldFeePerKg` | 滯銷費用/公斤 |
| `fixed_unsold_ratio` | `fixedUnsoldRatio` | 固定滯銷比率 |
| `distributor_floor_price_a` | `distributorFloorPriceA` | A魚底價 |
| `distributor_floor_price_b` | `distributorFloorPriceB` | B魚底價 |
| `target_price_a` | `targetPriceA` | A魚目標價 |
| `target_price_b` | `targetPriceB` | B魚目標價 |
| `buying_duration` | `buyingDuration` | 買入時長 |
| `selling_duration` | `sellingDuration` | 賣出時長 |
| `team_names` | `teamNames` | 團隊名稱 (JSON) |
| `is_force_ended` | `isForceEnded` | 是否強制結束 |
| `force_ended_at` | `forceEndedAt` | 強制結束時間 |
| `force_end_day` | `forceEndDay` | 強制結束天數 |
| `created_at` | `createdAt` | 創建時間 |
| `updated_at` | `updatedAt` | 更新時間 |

### game_days 表
| 資料庫 (snake_case) | API (camelCase) |
|---------------------|-----------------|
| `id` | `id` |
| `game_id` | `gameId` |
| `day_number` | `dayNumber` |
| `status` | `status` |
| `fish_a_supply` | `fishASupply` |
| `fish_a_restaurant_budget` | `fishARestaurantBudget` |
| `fish_b_supply` | `fishBSupply` |
| `fish_b_restaurant_budget` | `fishBRestaurantBudget` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### game_participants 表
| 資料庫 (snake_case) | API (camelCase) |
|---------------------|-----------------|
| `id` | `id` |
| `game_id` | `gameId` |
| `user_id` | `userId` |
| `team_name` | `teamName` |
| `current_budget` | `currentBudget` |
| `initial_budget` | `initialBudget` |
| `total_loan` | `totalLoan` |
| `total_loan_principal` | `totalLoanPrincipal` |
| `fish_a_inventory` | `fishAInventory` |
| `fish_b_inventory` | `fishBInventory` |
| `cumulative_profit` | `cumulativeProfit` |
| `roi` | `roi` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

### bids 表
| 資料庫 (snake_case) | API (camelCase) |
|---------------------|-----------------|
| `id` | `id` |
| `game_id` | `gameId` |
| `game_day_id` | `gameDayId` |
| `day_number` | `dayNumber` |
| `team_id` | `teamId` |
| `bid_type` | `bidType` |
| `fish_type` | `fishType` |
| `price` | `price` |
| `quantity_submitted` | `quantitySubmitted` |
| `quantity_fulfilled` | `quantityFulfilled` |
| `status` | `status` |
| `created_at` | `createdAt` |

### daily_results 表
| 資料庫 (snake_case) | API (camelCase) |
|---------------------|-----------------|
| `id` | `id` |
| `game_id` | `gameId` |
| `team_id` | `teamId` |
| `day_number` | `dayNumber` |
| `revenue` | `revenue` |
| `cost` | `cost` |
| `profit` | `profit` |
| `interest_paid` | `interestPaid` |
| `unsold_fee` | `unsoldFee` |
| `current_budget` | `currentBudget` |
| `total_loan` | `totalLoan` |
| `fish_a_inventory` | `fishAInventory` |
| `fish_b_inventory` | `fishBInventory` |
| `cumulative_profit` | `cumulativeProfit` |
| `roi` | `roi` |
| `created_at` | `createdAt` |

### users 表
| 資料庫 (snake_case) | API (camelCase) |
|---------------------|-----------------|
| `id` | `id` |
| `username` | `username` |
| `password_hash` | - (不返回) |
| `role` | `role` |
| `display_name` | `displayName` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

---

## 三、轉換規則

### 必須使用 transformers.js

**絕不手動轉換！永遠使用 transformers.js 提供的函數！**

```javascript
const {
    gameToApi,
    gameDayToApi,
    teamToApi,
    bidToApi,
    dailyResultToApi,
    userToApi,
    apiToGame,
    apiToBid
} = require('../utils/transformers');

// ✅ 正確 - 使用轉換函數
const apiGame = gameToApi(dbRow);

// ❌ 錯誤 - 手動轉換容易出錯
const apiGame = {
    gameId: dbRow.game_id,  // 容易遺漏或拼錯
    gameName: dbRow.name     // 可能會錯寫成 dbRow.game_name
};
```

### 各層職責

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (camelCase)                      │
│  - 所有變數使用 camelCase                                  │
│  - 所有 API 請求/回應使用 camelCase                         │
└─────────────────────────────────────────────────────────┘
                            ↕
              【transformers.js 轉換層】
                            ↕
┌─────────────────────────────────────────────────────────┐
│                 後端 Controllers (camelCase)              │
│  - 接收 camelCase 請求                                    │
│  - 返回 camelCase 回應                                    │
│  - 呼叫 Services                                          │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                 後端 Services (轉換)                       │
│  - 使用 transformers 轉換 API → DB                        │
│  - 呼叫 Models                                            │
│  - 使用 transformers 轉換 DB → API                        │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                 後端 Models (snake_case)                  │
│  - 所有 SQL 使用 snake_case                               │
│  - 返回 snake_case 格式                                   │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                 資料庫 (snake_case)                       │
│  - 所有欄位都是 snake_case                                │
└─────────────────────────────────────────────────────────┘
```

---

## 四、常見錯誤範例

### ❌ 錯誤 1: SQL 查詢使用 camelCase

```javascript
// ❌ 錯誤
const sql = `
    SELECT gameId, currentBudget, fishAInventory
    FROM game_participants
    WHERE teamId = ?
`;
// 資料庫沒有 gameId、currentBudget 這些欄位！

// ✅ 正確
const sql = `
    SELECT game_id, current_budget, fish_a_inventory
    FROM game_participants
    WHERE team_id = ?
`;
```

### ❌ 錯誤 2: API 回應使用 snake_case

```javascript
// ❌ 錯誤
res.json({
    success: true,
    data: {
        game_id: 1,
        current_budget: 100000
    }
});

// ✅ 正確
const apiData = gameToApi(dbRow);
res.json({
    success: true,
    data: apiData
});
```

### ❌ 錯誤 3: 前端使用 snake_case

```javascript
// ❌ 錯誤
document.getElementById('budget').textContent = data.current_budget;

// ✅ 正確
document.getElementById('budget').textContent = data.currentBudget;
```

### ❌ 錯誤 4: 欄位名稱拼錯

```javascript
// ❌ 錯誤 - games 表的名稱欄位是 name，不是 game_name
const sql = `SELECT game_name FROM games WHERE id = ?`;

// ✅ 正確
const sql = `SELECT name FROM games WHERE id = ?`;
// 然後轉換時映射為 gameName
```

---

## 五、檢查清單

### 寫程式碼前必須確認：

- [ ] 我現在在哪一層？(資料庫/Model/Service/Controller/前端)
- [ ] 這一層應該使用什麼命名？(snake_case 或 camelCase)
- [ ] 我有使用 transformers.js 轉換嗎？
- [ ] SQL 查詢的欄位名稱對嗎？(對照資料庫架構)
- [ ] API 回應的欄位名稱對嗎？(對照 transformers.js)

### 測試時必須檢查：

- [ ] API 回應是否全部 camelCase？
- [ ] SQL 查詢是否全部 snake_case？
- [ ] 前端是否能正確讀取所有欄位？
- [ ] 沒有 undefined 或 null 的意外情況？

---

## 六、快速參考

### 最容易錯的欄位

| ⚠️ 注意 | 資料庫 | API | 說明 |
|---------|--------|-----|------|
| games 表的名稱 | `name` | `gameName` | 不是 game_name！ |
| games 表的狀態 | `status` | `gameStatus` | 避免與其他表的 status 混淆 |
| 所有 A 魚欄位 | `fish_a_*` | `fishA*` | 注意大小寫 |
| 所有 B 魚欄位 | `fish_b_*` | `fishB*` | 注意大小寫 |
| 所有金額欄位 | `*_budget`, `*_loan` | `*Budget`, `*Loan` | 統一格式 |
| 所有時間欄位 | `created_at`, `updated_at` | `createdAt`, `updatedAt` | 統一格式 |

---

## 七、總結

**記住這三點：**

1. **資料庫/SQL → snake_case**
2. **API/前端 → camelCase**
3. **永遠使用 transformers.js 轉換**

**如果記不清楚，就查這份文件！**

不要憑記憶，不要猜測，不要手動轉換。

**嚴格遵守命名規範 = 系統穩定可靠！**
