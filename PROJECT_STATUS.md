# 魚市場遊戲 - 專案狀態

**最後更新**: 2025-12-05

## 部署狀態

| 服務 | 平台 | 狀態 | URL |
|------|------|------|-----|
| 後端 | Railway | 運行中 | https://backend-production-42d3.up.railway.app |
| 前端 | Vercel | 運行中 | https://fish-market-game-v2.vercel.app |
| 資料庫 | Railway MySQL | 運行中 | mysql.railway.internal:3306 |

## 資料庫 Migrations

所有 migrations 已執行完成：

| 檔案 | 說明 | 狀態 |
|------|------|------|
| 001_initial_schema.sql | 基礎資料表結構 | ✅ 已執行 |
| 002_add_fish_trade_stats.sql | 魚類交易統計欄位 | ✅ 已執行 |
| 003_add_missing_fields.sql | 補齊缺失欄位 | ✅ 已執行 |
| 004_move_phase_to_games.sql | 將 phase 移至 games 表 | ✅ 已執行 |
| 004_rename_current_budget_to_cash.sql | 重命名 current_budget → cash | ✅ 已執行 |
| 005_add_default_users.sql | 建立預設用戶 | ✅ 已執行 |
| 006_add_default_supply_budget.sql | 預設供給與預算欄位 | ✅ 已執行 |
| 007_add_clear_inventory_setting.sql | 清空庫存設定欄位 | ✅ 已執行 |

## 預設帳號

| 角色 | 帳號 | 密碼 | 說明 |
|------|------|------|------|
| 管理員 | admin | admin | 系統管理員 |
| 團隊 | 01 | 01 | 第 01 隊 |
| 團隊 | 02 | 02 | 第 02 隊 |
| ... | ... | ... | ... |
| 團隊 | 12 | 12 | 第 12 隊 |

## 核心架構

### 狀態管理
- **`games.status`**: 遊戲整體狀態 (`pending`, `active`, `paused`, `finished`, `force_ended`)
- **`games.phase`**: 當天階段狀態 (`pending`, `buying_open`, `buying_closed`, `selling_open`, `selling_closed`, `settled`)
- **`game_days`** 表只存每日參數（供給量、餐廳預算），不存狀態

### 財務欄位
- **`cash`**: 當前現金
- **`initial_budget`**: 初始預算
- **`total_loan`**: 總貸款金額
- **`total_loan_principal`**: 貸款本金

### 命名規範
- 資料庫：`snake_case`
- API：`camelCase`
- 轉換器：`backend/src/utils/transformers.js`

## 主要檔案位置

### 後端
```
backend/src/
├── controllers/
│   ├── AdminController.js    # 管理員 API
│   ├── TeamController.js     # 團隊 API
│   └── AuthController.js     # 認證 API
├── services/
│   ├── GameService.js        # 遊戲邏輯
│   ├── BidService.js         # 投標邏輯
│   ├── SettlementService.js  # 結算邏輯
│   └── LoanService.js        # 借貸邏輯
├── models/
│   ├── Game.js               # 遊戲模型
│   ├── Team.js               # 團隊模型
│   ├── Bid.js                # 投標模型
│   └── DailyResult.js        # 每日結果模型
└── utils/
    └── transformers.js       # snake_case ↔ camelCase 轉換
```

### 前端
```
frontend/
├── app/
│   ├── admin/
│   │   ├── control/page.tsx  # 遊戲控制台
│   │   ├── bids/page.tsx     # 競標結果
│   │   ├── stats/page.tsx    # 每日統計
│   │   ├── history/page.tsx  # 歷史遊戲
│   │   └── accounts/page.tsx # 帳號管理
│   └── team/
│       ├── page.tsx          # 團隊投標頁
│       └── stats/page.tsx    # 我的統計
└── lib/
    ├── api.ts                # API 客戶端
    ├── websocket.ts          # WebSocket 連線
    ├── types.ts              # TypeScript 類型
    └── constants.ts          # 常數定義
```

## 常用命令

```bash
# 後端部署
cd backend && railway up --detach

# 查看後端日誌
cd backend && railway logs

# 前端開發
cd frontend && npm run dev

# 前端部署（自動，推送到 GitHub 即可）
git push origin master
```

## 注意事項

1. **前端 Vercel 自動部署**：推送到 GitHub master 分支會自動觸發 Vercel 部署
2. **後端需手動部署**：使用 `railway up --detach` 部署
3. **Migrations 自動執行**：後端啟動時會自動執行未完成的 migrations
4. **WebSocket**：使用 `games.phase` 進行階段變更通知，前端監聽 `phaseChange` 事件

## GitHub Repository

- URL: https://github.com/xuancheng307/fish-market-game-v2
- Branch: master
