# 後端 API 需求清單

**日期**: 2025-12-03
**前端完成度**: 90%
**後端 API 完成度**: 約 50%

---

## 📊 API 實作狀態總覽

| 類別 | 已實作 | 待補充 | 完成度 |
|------|--------|--------|--------|
| 認證相關 | 1 | 0 | 100% |
| 遊戲管理 | 3 | 2 | 60% |
| 遊戲流程控制 | 9 | 1 | 90% |
| 團隊管理 | 0 | 3 | 0% |
| 投標管理 | 0 | 4 | 0% |
| 每日結果 | 0 | 3 | 0% |
| 帳號管理 | 0 | 2 | 0% |
| **總計** | **13** | **15** | **46%** |

---

## ✅ 已實作的 API

### 認證相關
- ✅ `POST /api/auth/login` - 登入

### 遊戲管理
- ✅ `POST /api/admin/games` - 創建遊戲
- ✅ `GET /api/admin/games` - 獲取所有遊戲
- ✅ `GET /api/admin/games/:id` - 獲取遊戲詳情

### 遊戲流程控制
- ✅ `POST /api/admin/games/:id/start-buying` - 開始買入投標
- ✅ `POST /api/admin/games/:id/close-buying` - 關閉買入投標
- ✅ `POST /api/admin/games/:id/start-selling` - 開始賣出投標
- ✅ `POST /api/admin/games/:id/close-selling` - 關閉賣出投標
- ✅ `POST /api/admin/games/:id/settle` - 執行結算
- ✅ `POST /api/admin/games/:id/next-day` - 進入次日
- ✅ `POST /api/admin/games/:id/force-end` - 強制結束遊戲
- ✅ `POST /api/admin/games/:id/pause` - 暫停遊戲
- ✅ `POST /api/admin/games/:id/resume` - 恢復遊戲

---

## ⚠️ 待補充的 API

### 1. 遊戲管理 (2 個)

#### ❌ `GET /api/games/active` - 獲取進行中的遊戲
**前端調用位置**:
- `app/admin/control/page.tsx:30`
- `app/admin/bids/page.tsx:24`
- `app/admin/stats/page.tsx:23`
- `app/admin/accounts/page.tsx:30`
- `app/team/layout.tsx:48`
- `app/team/page.tsx:23`
- `app/team/stats/page.tsx:20`

**回應格式**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "gameName": "測試遊戲",
    "status": "active",
    "currentDay": 1,
    "totalDays": 10,
    "initialBudget": 100000,
    ...
  }
}
```

**實作建議**:
```javascript
// AdminController.js
static getActiveGame = asyncHandler(async (req, res) => {
  const game = await Game.getActiveGame();

  if (!game) {
    return res.status(404).json({
      success: false,
      error: '沒有進行中的遊戲'
    });
  }

  res.json({
    success: true,
    data: gameToApi(game)
  });
});
```

**路由**:
```javascript
// routes/admin.js or routes/game.js (public)
router.get('/games/active', AdminController.getActiveGame);
```

---

#### ❌ `PATCH /api/admin/games/:id/status` - 更新遊戲狀態
**前端調用位置**:
- `app/admin/control/page.tsx:135` (pause/resume)
- `app/admin/control/page.tsx:156` (force-end)

**請求格式**:
```json
{
  "status": "paused" | "active" | "force_ended"
}
```

**回應格式**:
```json
{
  "success": true,
  "message": "遊戲狀態已更新",
  "data": {
    "id": 1,
    "status": "paused",
    ...
  }
}
```

**實作建議**:
- 可以合併到現有的 pause/resume/forceEnd 方法中
- 或創建通用的狀態更新方法

---

### 2. 遊戲天數 (1 個)

#### ❌ `GET /api/games/:id/current-day` - 獲取當天資訊
**前端調用位置**:
- `app/admin/control/page.tsx:36`
- `app/team/layout.tsx:52`
- `app/team/page.tsx:27`

**回應格式**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "gameId": 1,
    "dayNumber": 1,
    "status": "buying_open",
    "buyingStartTime": "2025-12-03T10:00:00Z",
    "buyingEndTime": "2025-12-03T10:05:00Z",
    ...
  }
}
```

**實作建議**:
```javascript
// AdminController.js
static getCurrentGameDay = asyncHandler(async (req, res) => {
  const gameDay = await GameDay.findByGameAndDay(
    req.params.id,
    await Game.getCurrentDayNumber(req.params.id)
  );

  res.json({
    success: true,
    data: gameDayToApi(gameDay)
  });
});
```

---

### 3. 團隊管理 (3 個)

#### ❌ `GET /api/games/:id/teams` - 獲取所有團隊
**前端調用位置**:
- `app/admin/control/page.tsx:40`
- `app/admin/accounts/page.tsx:34`

**回應格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "gameId": 1,
      "userId": 2,
      "teamNumber": 1,
      "currentBudget": 100000,
      "loanAmount": 0,
      "fishAInventory": 0,
      "fishBInventory": 0,
      ...
    },
    ...
  ]
}
```

---

#### ❌ `GET /api/games/:id/team` - 獲取我的團隊資訊
**前端調用位置**:
- 暫未使用，但 API 設計中有此端點

---

#### ❌ `GET /api/games/:id/my-status` - 獲取我的團隊狀態
**前端調用位置**:
- `app/team/layout.tsx:56`

**回應格式**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "teamNumber": 1,
    "currentBudget": 98500,
    "loanAmount": 1500,
    "fishAInventory": 50,
    "fishBInventory": 30,
    ...
  }
}
```

**實作建議**:
- 從 JWT token 中獲取 userId
- 根據 userId 查詢團隊資訊

---

### 4. 投標管理 (4 個)

#### ❌ `POST /api/bids` - 提交投標
**前端調用位置**:
- `app/team/page.tsx:48`

**請求格式**:
```json
{
  "gameId": 1,
  "dayNumber": 1,
  "bidType": "buy" | "sell",
  "fishType": "A" | "B",
  "price": 50,
  "quantitySubmitted": 100
}
```

**回應格式**:
```json
{
  "success": true,
  "message": "投標提交成功",
  "data": {
    "bid": {
      "id": 1,
      "teamId": 1,
      "bidType": "buy",
      "fishType": "A",
      "price": 50,
      "quantitySubmitted": 100,
      "status": "pending",
      ...
    },
    "loanInfo": {
      "loanNeeded": 1500,
      "newLoanAmount": 1500
    }
  }
}
```

**實作建議**:
- 使用 BidService.submitBid() 方法
- 自動處理借貸邏輯

---

#### ❌ `GET /api/games/:id/bids` - 獲取我的投標記錄
**前端調用位置**:
- `app/team/page.tsx:31`

**查詢參數**:
- `dayNumber` (optional): 篩選特定天數

**回應格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "bidType": "buy",
      "fishType": "A",
      "price": 50,
      "quantitySubmitted": 100,
      "quantityFulfilled": 80,
      "totalCost": 4000,
      "status": "partial",
      "createdAt": "2025-12-03T10:01:00Z"
    },
    ...
  ]
}
```

---

#### ❌ `GET /api/games/:id/all-bids` - 獲取所有投標記錄（管理員）
**前端調用位置**:
- `app/admin/bids/page.tsx:48`

**查詢參數**:
- `dayNumber` (optional): 篩選特定天數

**回應格式**: 同上，但包含所有團隊的投標

---

#### ❌ `DELETE /api/bids/:id` - 刪除投標
**前端調用位置**:
- 暫未使用，但 API 設計中有此端點

---

### 5. 每日結果 (3 個)

#### ❌ `GET /api/games/:id/daily-results` - 獲取每日結果（管理員）
**前端調用位置**:
- `app/admin/stats/page.tsx:47`

**查詢參數**:
- `dayNumber` (optional): 篩選特定天數

**回應格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "teamId": 1,
      "teamNumber": 1,
      "dayNumber": 1,
      "dayStartCash": 100000,
      "dayEndCash": 98500,
      "fishAPurchased": 50,
      "fishBPurchased": 30,
      "fishASold": 0,
      "fishBSold": 0,
      "totalRevenue": 0,
      "totalCost": 4500,
      "unsoldPenalty": 0,
      "loanInterest": 0,
      "dailyProfit": -4500,
      "accumulatedProfit": -1500,
      "roi": -0.015
    },
    ...
  ]
}
```

---

#### ❌ `GET /api/games/:id/team/daily-results` - 獲取我的每日結果
**前端調用位置**:
- `app/team/stats/page.tsx:26`

**回應格式**: 同上，但只包含我的團隊數據

---

#### ❌ `GET /api/games/:id/my-daily-results` - 獲取我的歷史統計
**前端調用位置**:
- `app/team/stats/page.tsx:26` (可能的替代端點)

---

### 6. 帳號管理 (2 個)

#### ❌ `POST /api/admin/accounts/:id/reset` - 重置單一團隊密碼
**前端調用位置**:
- `app/admin/accounts/page.tsx:60`

**請求格式**:
```json
{
  "userId": 2
}
```

**回應格式**:
```json
{
  "success": true,
  "message": "密碼已重置為預設值"
}
```

**實作建議**:
- 重置密碼為團隊編號（如 "01", "02"）
- 使用 bcrypt 加密

---

#### ❌ `POST /api/admin/accounts/reset-all` - 重置所有團隊密碼
**前端調用位置**:
- `app/admin/accounts/page.tsx:75`

**回應格式**:
```json
{
  "success": true,
  "message": "所有團隊密碼已重置"
}
```

---

### 7. 歷史遊戲 (1 個)

#### ❌ `GET /api/admin/games/history` - 獲取歷史遊戲列表
**前端調用位置**:
- `app/admin/history/page.tsx:17`

**回應格式**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "gameName": "第一場遊戲",
      "status": "completed",
      "currentDay": 10,
      "totalDays": 10,
      "createdAt": "2025-12-01T00:00:00Z",
      ...
    },
    ...
  ]
}
```

**實作建議**:
```javascript
static getHistoryGames = asyncHandler(async (req, res) => {
  const games = await Game.getHistoryGames(); // status IN ('completed', 'force_ended')

  res.json({
    success: true,
    data: games.map(game => gameToApi(game))
  });
});
```

---

## 🔧 實作優先順序

### 優先級 1: 核心功能（必要）
1. ✅ `GET /api/games/active` - 獲取進行中的遊戲
2. ✅ `GET /api/games/:id/current-day` - 獲取當天資訊
3. ✅ `GET /api/games/:id/teams` - 獲取所有團隊
4. ✅ `GET /api/games/:id/my-status` - 獲取我的團隊狀態
5. ✅ `POST /api/bids` - 提交投標
6. ✅ `GET /api/games/:id/bids` - 獲取我的投標
7. ✅ `GET /api/games/:id/all-bids` - 獲取所有投標
8. ✅ `GET /api/games/:id/daily-results` - 獲取每日結果

### 優先級 2: 統計與管理（重要）
9. ⏳ `GET /api/games/:id/team/daily-results` - 獲取我的每日結果
10. ⏳ `GET /api/admin/games/history` - 獲取歷史遊戲
11. ⏳ `PATCH /api/admin/games/:id/status` - 更新遊戲狀態

### 優先級 3: 帳號管理（選配）
12. ⏳ `POST /api/admin/accounts/:id/reset` - 重置單一密碼
13. ⏳ `POST /api/admin/accounts/reset-all` - 重置所有密碼
14. ⏳ `DELETE /api/bids/:id` - 刪除投標
15. ⏳ `GET /api/games/:id/team` - 獲取團隊資訊

---

## 📁 建議的檔案結構

### 需要新增的路由
```javascript
// routes/game.js (公開路由)
router.get('/games/active', GameController.getActiveGame);
router.get('/games/:id/current-day', GameController.getCurrentGameDay);
router.get('/games/:id/teams', GameController.getAllTeams);
router.get('/games/:id/all-bids', GameController.getAllBids);
router.get('/games/:id/daily-results', GameController.getDailyResults);

// routes/team.js (團隊路由)
router.use(verifyToken); // 需要認證
router.get('/games/:id/my-status', TeamController.getMyStatus);
router.get('/games/:id/bids', TeamController.getMyBids);
router.get('/games/:id/team/daily-results', TeamController.getMyDailyResults);
router.post('/bids', TeamController.submitBid);

// routes/admin.js (管理員路由 - 已存在，需補充)
router.get('/games/history', AdminController.getHistoryGames);
router.patch('/games/:id/status', AdminController.updateGameStatus);
router.post('/accounts/:id/reset', AdminController.resetTeamPassword);
router.post('/accounts/reset-all', AdminController.resetAllPasswords);
```

---

## 🎯 快速實作指南

### 1. 創建 GameController.js
```javascript
const Game = require('../models/Game');
const GameDay = require('../models/GameDay');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const DailyResult = require('../models/DailyResult');
const { gameToApi, gameDayToApi, teamToApi, bidToApi, dailyResultToApi } = require('../utils/transformers');
const { asyncHandler } = require('../middleware/errorHandler');

class GameController {
  static getActiveGame = asyncHandler(async (req, res) => {
    // 實作...
  });

  static getCurrentGameDay = asyncHandler(async (req, res) => {
    // 實作...
  });

  static getAllTeams = asyncHandler(async (req, res) => {
    // 實作...
  });

  static getAllBids = asyncHandler(async (req, res) => {
    // 實作...
  });

  static getDailyResults = asyncHandler(async (req, res) => {
    // 實作...
  });
}

module.exports = GameController;
```

### 2. 創建 TeamController.js
```javascript
const BidService = require('../services/BidService');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const DailyResult = require('../models/DailyResult');
const { teamToApi, bidToApi, dailyResultToApi } = require('../utils/transformers');
const { asyncHandler } = require('../middleware/errorHandler');

class TeamController {
  static getMyStatus = asyncHandler(async (req, res) => {
    // 從 req.user.id 獲取用戶 ID
    // 查詢團隊資訊
  });

  static submitBid = asyncHandler(async (req, res) => {
    // 使用 BidService.submitBid()
  });

  static getMyBids = asyncHandler(async (req, res) => {
    // 查詢我的投標
  });

  static getMyDailyResults = asyncHandler(async (req, res) => {
    // 查詢我的每日結果
  });
}

module.exports = TeamController;
```

### 3. 補充 AdminController.js
```javascript
static getHistoryGames = asyncHandler(async (req, res) => {
  // 查詢已完成的遊戲
});

static updateGameStatus = asyncHandler(async (req, res) => {
  // 更新遊戲狀態
});

static resetTeamPassword = asyncHandler(async (req, res) => {
  // 重置單一密碼
});

static resetAllPasswords = asyncHandler(async (req, res) => {
  // 重置所有密碼
});
```

---

## 📝 命名規範提醒

**重要**: 所有新增的 API 回應必須使用 transformers 轉換為 camelCase！

```javascript
// ✓ 正確
res.json({
  success: true,
  data: gameToApi(game)  // 轉換為 camelCase
});

// ✗ 錯誤
res.json({
  success: true,
  data: game  // 直接返回 snake_case
});
```

---

## 🔍 測試建議

完成 API 實作後，建議按以下順序測試：

1. **基礎測試**: 使用 Postman 或 curl 測試各個 API 端點
2. **前端整合**: 啟動前端，測試完整流程
3. **遊戲流程**: 創建遊戲 → 階段控制 → 投標 → 結算
4. **邊界測試**: 測試錯誤情況（現金不足、庫存不足等）

---

**備註**: 本文件列出所有前端調用的 API 端點。建議按優先級逐步實作，優先完成核心功能以實現完整遊戲流程。
