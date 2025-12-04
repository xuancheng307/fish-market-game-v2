# 魚市場遊戲重構 - 專案狀態文件
最後更新：2025-12-04

## 專案概述

**專案名稱：** 魚市場交易遊戲（重構版）
**技術棧：**
- 前端：Next.js 14 + TypeScript + Ant Design
- 後端：Express + Socket.IO + MySQL
- 部署：Railway (後端 + 資料庫)

---

## 目錄結構

```
D:\徐景輝\魚市場遊戲重構\
├── backend/                    # 後端服務
│   ├── src/
│   │   ├── controllers/        # 控制器 (AuthController, GameController...)
│   │   ├── models/            # 資料模型 (User, Game, Team, Bid...)
│   │   ├── services/          # 商業邏輯 (SettlementService, LoanService...)
│   │   ├── routes/            # API 路由
│   │   ├── middleware/        # 中介軟體 (auth, errorHandler...)
│   │   ├── config/            # 配置檔案
│   │   ├── utils/             # 工具函數 (transformers...)
│   │   └── server.js          # 主伺服器
│   ├── migrations/            # 資料庫遷移檔案
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_fish_trade_stats.sql
│   │   ├── 003_add_missing_fields.sql  # ⚠️ 已修復外鍵問題
│   │   ├── 004_rename_current_budget_to_cash.sql
│   │   ├── 005_add_default_users.sql   # 建立預設用戶
│   │   └── run.js             # Migration 執行腳本
│   └── .env                   # 後端環境變數
│
└── frontend/                  # 前端應用
    ├── app/                   # Next.js App Router
    │   ├── login/            # 登入頁面
    │   ├── admin/            # 管理員介面
    │   └── team/             # 團隊介面
    ├── lib/                  # 工具庫
    │   ├── api.ts           # API 客戶端
    │   └── types.ts         # TypeScript 類型定義
    └── .env.local           # 前端環境變數
```

---

## Railway 部署資訊

### 專案名稱
- **fish-market-game-v2**

### 服務列表
1. **backend** - Express 後端服務
   - URL: `https://backend-production-42d3.up.railway.app`
   - 環境: production

2. **MySQL** - 資料庫服務
   - 內部連接: `mysql.railway.internal:3306`
   - 資料庫名稱: `railway`

### 重要環境變數（Railway 上已設定）
```env
DATABASE_URL=mysql://user:password@host:port/railway
MYSQL_PUBLIC_URL=mysql://user:password@host:port/railway
JWT_SECRET=your-secret-key
PORT=8080
NODE_ENV=production
```

---

## 資料庫狀態

### Migration 狀態
✅ **所有 5 個 migrations 已成功執行**

1. ✅ `001_initial_schema.sql` - 基礎資料表結構
2. ✅ `002_add_fish_trade_stats.sql` - 魚類交易統計欄位
3. ✅ `003_add_missing_fields.sql` - 補齊缺失欄位（已修復外鍵重複問題）
4. ✅ `004_rename_current_budget_to_cash.sql` - 重命名 current_budget → cash
5. ✅ `005_add_default_users.sql` - 建立預設用戶

### 預設帳號（已建立）

**管理員帳號：**
- 使用者名稱: `admin`
- 密碼: `123`
- 角色: `admin`
- 顯示名稱: 系統管理員

**團隊帳號（共 12 組）：**
- 使用者名稱: `01`, `02`, `03`, ..., `12`
- 密碼: 與使用者名稱相同（例如：`01` 的密碼是 `01`）
- 角色: `participant`
- 顯示名稱: 第 01 隊, 第 02 隊, ...

---

## 已修復的問題

### 1. AuthController 錯誤處理 (已修復 ✅)
**問題：** AuthController 拋出未處理的 AppError，導致伺服器崩潰
**修復：** 所有方法都使用 `asyncHandler` 包裝
**檔案：** `backend/src/controllers/AuthController.js`

### 2. Migration 003 外鍵重複錯誤 (已修復 ✅)
**問題：** `fk_daily_results_game_day` 外鍵約束已存在，導致 migration 失敗
**修復：** 註解掉重複的外鍵約束語句
**檔案：** `backend/migrations/003_add_missing_fields.sql` (第 19-23 行)

### 3. Migration 執行器錯誤處理 (已優化 ✅)
**問題：** Migration 遇到重複錯誤時直接失敗
**修復：** 增加對 `ER_DUP_KEYNAME` 和 `Duplicate foreign key constraint` 的處理
**檔案：** `backend/migrations/run.js` (第 72-77 行)

---

## 前端配置

### 環境變數 (.env.local)
```env
NEXT_PUBLIC_API_URL=https://backend-production-42d3.up.railway.app
NEXT_PUBLIC_WS_URL=https://backend-production-42d3.up.railway.app
```

### 啟動前端
```bash
cd "D:\徐景輝\魚市場遊戲重構\frontend"
npm run dev
```
前端會運行在: `http://localhost:3000`

---

## 後端配置

### 環境變數 (.env)
位置: `D:\徐景輝\魚市場遊戲重構\backend\.env`

```env
# Railway 環境變數（自動注入，本地開發可能需要手動設定）
DATABASE_URL=
MYSQL_PUBLIC_URL=

# JWT 密鑰
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 伺服器設定
PORT=8080
NODE_ENV=production

# CORS 設定
CORS_ORIGIN=*
```

### 部署到 Railway
```bash
cd "D:\徐景輝\魚市場遊戲重構\backend"
railway up --detach
```

### 查看 Railway 日誌
```bash
cd "D:\徐景輝\魚市場遊戲重構\backend"
railway logs
```

---

## API 端點

### 基礎 URL
- **Railway (生產環境):** `https://backend-production-42d3.up.railway.app`
- **本地開發:** `http://localhost:8080`

### 認證相關
- `POST /api/auth/login` - 登入
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 獲取當前用戶資訊
- `POST /api/auth/reset-passwords` - 重置密碼（管理員）

### 管理員功能
- `POST /api/admin/games` - 建立遊戲
- `GET /api/admin/games` - 獲取遊戲列表
- `GET /api/admin/games/:gameId` - 獲取遊戲詳情
- `POST /api/admin/games/:gameId/start` - 開始遊戲
- `POST /api/admin/games/:gameId/force-end` - 強制結束遊戲

### 團隊功能
- `GET /api/team/games/:gameId/status` - 獲取遊戲狀態
- `POST /api/team/bids` - 提交投標
- `GET /api/team/bids/:gameId` - 獲取投標記錄

### 健康檢查
- `GET /api/health` - 伺服器健康狀態

---

## 測試登入

### 選項 1: 使用本地前端 + Railway 後端（推薦）
1. 啟動前端: `cd frontend && npm run dev`
2. 訪問: `http://localhost:3000/login`
3. 使用上述預設帳號登入

### 選項 2: 直接測試 API
```bash
curl -X POST https://backend-production-42d3.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123"}'
```

成功回應範例：
```json
{
  "success": true,
  "message": "登入成功",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "displayName": "系統管理員"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 目前問題

### ❌ 登入仍有錯誤（待修復）
**症狀：** 用戶報告登入時仍有錯誤
**可能原因：**
1. 前端可能連接到錯誤的 API 端點
2. 環境變數配置問題
3. CORS 設定問題
4. JWT Token 驗證問題

**下一步診斷：**
1. 檢查前端 Network 請求（開發者工具）
2. 確認請求的 URL 是否正確
3. 檢查 Railway 後端日誌
4. 確認前端 `.env.local` 配置

---

## 重要檔案位置

### 核心商業邏輯
- **結算服務:** `backend/src/services/SettlementService.js`
  - 買入結算、賣出結算、每日結算
  - 滯銷計算、利息計算、ROI 計算

- **貸款服務:** `backend/src/services/LoanService.js`
  - 貸款申請、還款、利息計算

- **投標服務:** `backend/src/services/BidService.js`
  - 投標提交、驗證、查詢

### 資料模型
- `backend/src/models/User.js` - 用戶
- `backend/src/models/Game.js` - 遊戲
- `backend/src/models/Team.js` - 團隊
- `backend/src/models/Bid.js` - 投標
- `backend/src/models/DailyResult.js` - 每日結果

### 前端頁面
- `frontend/app/login/page.tsx` - 登入頁面
- `frontend/app/admin/create/page.tsx` - 建立遊戲
- `frontend/app/admin/control/page.tsx` - 遊戲控制台
- `frontend/app/admin/history/page.tsx` - 歷史記錄
- `frontend/app/team/bid/page.tsx` - 團隊投標頁面
- `frontend/app/team/status/page.tsx` - 團隊狀態頁面

---

## 常用命令

### Railway 操作
```bash
# 連結到 Railway 專案
cd "D:\徐景輝\魚市場遊戲重構\backend"
railway link

# 部署到 Railway
railway up --detach

# 查看日誌
railway logs

# 查看服務狀態
railway status

# 查看網域
railway domain

# 查看環境變數
railway variables
```

### 本地開發
```bash
# 啟動前端
cd "D:\徐景輝\魚市場遊戲重構\frontend"
npm run dev

# 啟動後端（本地）
cd "D:\徐景輝\魚市場遊戲重構\backend"
npm start

# 執行 migrations（本地）
cd "D:\徐景輝\魚市場遊戲重構\backend"
node migrations/run.js
```

---

## 參數命名規範

### 資料庫 (snake_case)
```
game_id, team_id, fish_a_inventory, current_day, total_days
```

### API 回應 (camelCase)
```
gameId, teamId, fishAInventory, currentDay, totalDays
```

### 轉換器
使用 `backend/src/utils/transformers.js` 進行轉換：
- `userToApi()` - User 物件轉換
- `gameToApi()` - Game 物件轉換
- `teamToApi()` - Team 物件轉換
- `bidToApi()` - Bid 物件轉換
- `dailyResultToApi()` - DailyResult 物件轉換

---

## 舊版專案（參考用）

**位置：** `C:\Dcopy\舊電腦備份\徐景輝\魚市場遊戲3`
**Railway URL：** `https://backend-production-dc27.up.railway.app`
**架構：** 全端部署（後端同時提供前端靜態文件）

**用途：**
- 參考舊版商業邏輯
- 對比測試
- 備份方案

⚠️ **注意：不要將新版連接到舊版後端！**

---

## 下一步工作

1. **診斷登入錯誤**
   - 檢查前端 Network 請求
   - 確認 API URL 配置
   - 檢查 CORS 設定
   - 查看 Railway 後端日誌

2. **修復登入問題**
   - 根據錯誤訊息調整

3. **測試完整遊戲流程**
   - 建立遊戲
   - 開始遊戲
   - 投標功能
   - 結算功能
   - 歷史記錄

4. **考慮前端部署**
   - 部署前端到 Vercel 或 Railway
   - 提供公開網址讓用戶測試

---

## 聯絡資訊

**專案維護者：** Claude AI Assistant
**最後更新：** 2025-12-04
**專案狀態：** 開發中，登入功能待修復

---

## 快速恢復工作檢查清單

重新開始工作時，請檢查：

- [ ] 前端是否正在運行？ (`http://localhost:3000`)
- [ ] Railway 後端是否正常？ (檢查 `railway status`)
- [ ] 資料庫連接是否正常？ (檢查 `railway logs`)
- [ ] 環境變數是否正確？ (檢查 `.env` 和 `.env.local`)
- [ ] API 健康檢查是否通過？ (`GET /api/health`)
- [ ] 預設用戶是否已建立？ (嘗試用 `admin/123` 登入)

**如果有任何疑問，請參考本文件！**
