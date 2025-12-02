# 魚市場交易遊戲 - 重構版本 v2.0

一個教育性質的線上交易模擬遊戲，學生團隊扮演魚市場中間商，透過買入和賣出決策來最大化收益。

## 專案概述

這是魚市場遊戲的完全重構版本，解決了原版本的系統性問題：
- ✅ 統一命名規範 (資料庫 snake_case，API camelCase)
- ✅ 完全參數化 (所有遊戲參數可調整)
- ✅ 單一狀態源 (使用 game_days.status，移除 games.phase)
- ✅ 清晰的商業邏輯 (借貸、結算、利息計算)

## 核心商業邏輯

### 借貸邏輯
- 借貸發生在**投標時** (不是結算時)
- 借貸時現金增加: `currentBudget += loanNeeded`
- 無退款機制: 借的錢持續計息直到遊戲結束

### 結算邏輯
- 現金扣除發生在**結算時**
- 只扣除成交數量的金額: `currentBudget -= price × fulfilledQty`
- 優先順序: 買入按價格降序、賣出按價格升序，相同價格早提交優先

### 滯銷處理
- 固定滯銷 2.5%: 最高價投標優先滯銷
- 滯銷費用: `unsoldQuantity × unsoldFeePerKg`

## 專案結構

```
魚市場遊戲重構/
├── backend/                    # 後端程式碼
│   ├── src/
│   │   ├── config/            # 配置 (database, constants)
│   │   ├── models/            # 資料模型 (返回 snake_case)
│   │   ├── services/          # 業務邏輯
│   │   ├── controllers/       # 控制器 (返回 camelCase)
│   │   ├── routes/            # 路由
│   │   ├── middleware/        # 中介層
│   │   ├── utils/             # 工具 (transformers 等)
│   │   └── server.js          # 主伺服器
│   ├── migrations/            # 資料庫遷移
│   └── tests/                 # 測試
├── frontend/                   # 前端程式碼
│   ├── admin/                 # 管理員介面
│   ├── team/                  # 團隊介面
│   ├── shared/                # 共用組件
│   └── login/                 # 登入頁面
├── docs/                       # 文檔
│   └── ARCHITECTURE.md        # 架構文件
└── README.md                   # 本文件
```

## 技術棧

- **後端**: Node.js, Express, MySQL, Socket.IO
- **前端**: HTML, CSS, Vanilla JavaScript
- **認證**: JWT
- **部署**: Railway

## 安裝與運行

### 前置需求
- Node.js >= 18.0.0
- MySQL 8.0
- Railway CLI (可選)

### 安裝步驟

1. 克隆專案
```bash
git clone <repository-url>
cd 魚市場遊戲重構
```

2. 安裝依賴
```bash
cd backend
npm install
```

3. 配置環境變數
```bash
cp .env.example .env
# 編輯 .env 填入資料庫連線資訊
```

4. 初始化資料庫
```bash
# 連線到 MySQL 並執行
mysql -u root -p < migrations/001_initial_schema.sql
```

5. 啟動伺服器
```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

6. 訪問應用
- 管理員介面: http://localhost:3000/admin.html
- 團隊介面: http://localhost:3000/team.html
- 登入頁面: http://localhost:3000/login.html

## API 文檔

詳細的 API 文檔請參考 [ARCHITECTURE.md](ARCHITECTURE.md#五api-設計規範)

主要端點：
- `POST /api/admin/games` - 創建遊戲
- `POST /api/admin/games/:id/start-buying` - 開始買入投標
- `POST /api/admin/games/:id/close-buying` - 關閉買入投標
- `POST /api/bids` - 提交投標
- `GET /api/games/:id/my-status` - 獲取我的狀態

## 開發指南

### 命名規範

**資料庫層 (snake_case)**:
```javascript
const dbRow = {
    game_id: 1,
    current_budget: 100000,
    fish_a_inventory: 500
};
```

**API 層 (camelCase)**:
```javascript
const apiData = {
    gameId: 1,
    currentBudget: 100000,
    fishAInventory: 500
};
```

**轉換使用 transformers**:
```javascript
const { gameToApi, apiToGame } = require('./utils/transformers');

// DB → API
const apiGame = gameToApi(dbRow);

// API → DB
const dbGame = apiToGame(apiData);
```

### 錯誤處理

使用 AppError 類別：
```javascript
const { AppError } = require('./middleware/errorHandler');
const { ERROR_CODES } = require('./config/constants');

throw new AppError(
    '資金不足，無法投標',
    ERROR_CODES.INSUFFICIENT_FUNDS,
    400,
    { required: 50000, available: 45000 }
);
```

### 狀態管理

使用 game_days.status 作為唯一狀態：
```javascript
const { DAY_STATUS } = require('./config/constants');

// 檢查狀態
if (currentDay.status !== DAY_STATUS.BUYING_OPEN) {
    throw new AppError('當前不在買入投標階段', ERROR_CODES.INVALID_PHASE, 400);
}

// 更新狀態
await db.query(
    'UPDATE game_days SET status = ? WHERE id = ?',
    [DAY_STATUS.BUYING_CLOSED, currentDay.id]
);
```

## 測試

```bash
# 執行所有測試
npm test

# 執行測試並監聽變更
npm run test:watch
```

## 部署到 Railway

```bash
# 安裝 Railway CLI
npm install -g @railway/cli

# 登入
railway login

# 部署
railway up
```

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 授權

MIT License

## 聯絡方式

如有問題或建議，請開啟 Issue。

---

**重構版本 v2.0** - 2025-12-02
