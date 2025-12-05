# 魚市場交易遊戲 - 重構版本 v2.0

一個教育性質的線上交易模擬遊戲，學生團隊扮演魚市場中間商，透過買入和賣出決策來最大化收益。

## 專案概述

這是魚市場遊戲的完全重構版本，採用前後端分離架構：
- **後端**: Railway (Node.js + Express + MySQL)
- **前端**: Vercel (Next.js + TypeScript + Ant Design)

### 核心設計原則
- 統一命名規範：資料庫 `snake_case`，API `camelCase`
- 單一狀態源：`games.phase` 為唯一階段狀態
- 完全參數化：所有遊戲參數可調整

## 部署資訊

| 服務 | 平台 | URL |
|------|------|-----|
| 後端 API | Railway | `https://backend-production-42d3.up.railway.app` |
| 前端 | Vercel | `https://fish-market-game-v2.vercel.app` |
| 資料庫 | Railway MySQL | 內部連接 |

## 專案結構

```
魚市場遊戲重構/
├── backend/                    # 後端 (Express + MySQL)
│   ├── src/
│   │   ├── config/            # 配置 (database, constants)
│   │   ├── models/            # 資料模型 (返回 snake_case)
│   │   ├── services/          # 業務邏輯
│   │   ├── controllers/       # 控制器 (返回 camelCase)
│   │   ├── routes/            # API 路由
│   │   ├── middleware/        # 中介層 (auth, errorHandler)
│   │   ├── utils/             # 工具 (transformers)
│   │   └── server.js          # 主伺服器
│   └── migrations/            # 資料庫遷移腳本
│
├── frontend/                   # 前端 (Next.js 14)
│   ├── app/
│   │   ├── login/             # 登入頁面
│   │   ├── admin/             # 管理員介面
│   │   │   ├── control/       # 遊戲控制
│   │   │   ├── bids/          # 競標結果
│   │   │   ├── stats/         # 每日統計
│   │   │   ├── history/       # 歷史遊戲
│   │   │   └── accounts/      # 帳號管理
│   │   └── team/              # 團隊介面
│   ├── lib/
│   │   ├── api.ts             # API 客戶端
│   │   ├── websocket.ts       # WebSocket 連線
│   │   ├── types.ts           # TypeScript 類型
│   │   └── constants.ts       # 常數定義
│   └── components/            # 共用組件
│
├── ARCHITECTURE.md            # 架構設計文件
├── PROJECT_STATUS.md          # 專案狀態文件
└── README.md                  # 本文件
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Node.js, Express, MySQL, Socket.IO |
| 前端 | Next.js 14, TypeScript, Ant Design |
| 認證 | JWT |
| 即時通訊 | Socket.IO |
| 部署 | Railway (後端), Vercel (前端) |

## 核心商業邏輯

### 狀態管理
- `games.status`: 遊戲整體狀態 (`active`, `paused`, `finished`, `force_ended`)
- `games.phase`: 當天階段狀態 (`pending`, `buying_open`, `buying_closed`, `selling_open`, `selling_closed`, `settled`)

### 借貸邏輯
- 借貸發生在**投標時**（不是結算時）
- 借貸時現金增加：`cash += loanNeeded`
- 無退款機制：借的錢持續計息直到遊戲結束

### 結算邏輯
- 現金扣除發生在**結算時**
- 只扣除成交數量的金額：`cash -= price × fulfilledQty`
- 買入優先順序：價格高優先，相同價格早提交優先
- 賣出優先順序：價格低優先，相同價格早提交優先

### 滯銷處理
- 固定滯銷比例：2.5%
- 滯銷對象：最高價投標優先滯銷
- 滯銷費用：`unsoldQuantity × unsoldFeePerKg`

## 預設帳號

| 角色 | 帳號 | 密碼 |
|------|------|------|
| 管理員 | admin | admin |
| 團隊 01 | 01 | 01 |
| 團隊 02 | 02 | 02 |
| ... | ... | ... |
| 團隊 12 | 12 | 12 |

## 開發指南

### 命名規範

**資料庫層 (snake_case)**:
```javascript
const dbRow = {
    game_id: 1,
    cash: 100000,
    fish_a_inventory: 500
};
```

**API 層 (camelCase)**:
```javascript
const apiData = {
    gameId: 1,
    cash: 100000,
    fishAInventory: 500
};
```

**轉換使用 transformers**:
```javascript
const { gameToApi, teamToApi } = require('./utils/transformers');

// DB → API
const apiGame = gameToApi(dbRow);
```

### 階段狀態流程

```
pending → buying_open → buying_closed → selling_open → selling_closed → settled
                                                                          ↓
                                                                    (next day)
                                                                          ↓
                                                                      pending
```

## 部署命令

### 後端部署到 Railway
```bash
cd backend
railway up --detach
```

### 前端部署到 Vercel
前端已連接 GitHub，推送到 master 分支會自動部署。

### 查看後端日誌
```bash
cd backend
railway logs
```

## 主要 API 端點

### 認證
- `POST /api/auth/login` - 登入
- `GET /api/auth/me` - 獲取當前用戶

### 管理員
- `POST /api/admin/games` - 創建遊戲
- `GET /api/admin/games` - 獲取遊戲列表
- `POST /api/admin/games/:id/start-buying` - 開始買入投標
- `POST /api/admin/games/:id/close-buying` - 關閉買入投標
- `POST /api/admin/games/:id/start-selling` - 開始賣出投標
- `POST /api/admin/games/:id/close-selling` - 關閉賣出投標
- `POST /api/admin/games/:id/settle` - 每日結算
- `POST /api/admin/games/:id/next-day` - 推進到下一天

### 團隊
- `GET /api/team/active-game` - 獲取當前遊戲
- `POST /api/team/bids` - 提交投標
- `GET /api/team/games/:id/my-status` - 獲取我的狀態

---

**版本**: v2.0
**最後更新**: 2025-12-05
