# 重構進度追蹤

**最後更新**: 2025-12-02

---

## ✅ 已完成

### 文檔與架構設計
- [x] ARCHITECTURE.md - 完整架構設計 (310行)
- [x] NAMING_CONVENTION.md - 命名規範聖經 (強調參數一致性)
- [x] README.md - 專案說明
- [x] .gitignore - Git 忽略規則

### 專案結構
- [x] 完整目錄結構
- [x] backend/package.json
- [x] backend/.env.example

### 核心配置
- [x] src/config/database.js - 資料庫連線池
- [x] src/config/constants.js - 常數定義
- [x] src/utils/transformers.js - 命名轉換工具 ⭐
- [x] src/middleware/errorHandler.js - 錯誤處理

### 資料庫
- [x] migrations/001_initial_schema.sql - 6個表完整定義

### Models (資料層 - snake_case)
- [x] models/User.js
- [x] models/Game.js (⚠️ 注意：name 欄位不是 game_name)
- [x] models/GameDay.js (⚠️ status 是唯一狀態源)
- [x] models/Team.js (game_participants 表)
- [ ] models/Bid.js (進行中)
- [ ] models/DailyResult.js (待建立)

---

## 🚧 進行中

### Models
- 正在創建 Bid 和 DailyResult 模型

---

## 📋 待完成

### Services (業務邏輯層)
- [ ] services/LoanService.js - 借貸邏輯 (⚠️ 投標時借貸、現金增加)
- [ ] services/BidService.js - 投標邏輯
- [ ] services/SettlementService.js - 結算邏輯 (買入/賣出/每日)
- [ ] services/GameService.js - 遊戲管理邏輯

### Controllers (控制器層 - camelCase)
- [ ] controllers/AuthController.js - 認證
- [ ] controllers/AdminController.js - 管理員操作
- [ ] controllers/TeamController.js - 團隊操作

### Routes (路由層)
- [ ] routes/auth.js
- [ ] routes/admin.js
- [ ] routes/team.js

### Middleware (中介層)
- [ ] middleware/auth.js - JWT 認證
- [ ] middleware/validation.js - 輸入驗證

### 主程式
- [ ] src/server.js - Express 伺服器 + Socket.IO

### 前端
- [ ] frontend/login/ - 登入介面
- [ ] frontend/admin/ - 管理員介面
- [ ] frontend/team/ - 團隊介面
- [ ] frontend/shared/ - 共用組件

### 測試與部署
- [ ] 單元測試
- [ ] 整合測試
- [ ] 完整遊戲流程測試
- [ ] Railway 部署配置

---

## 🎯 核心原則提醒

### 命名一致性 (最關鍵!)
```
資料庫/SQL → snake_case
API/前端 → camelCase
永遠使用 transformers.js 轉換
```

### 商業邏輯正確性
- 借貸在投標時 (現金增加)
- 結算時扣除現金 (只扣成交部分)
- 無退款機制
- 固定滯銷 2.5%

### 狀態管理
- 使用 game_days.status 作為唯一狀態源
- 移除所有 games.phase 相關代碼

---

## 📊 預估進度

- 架構設計: 100% ✅
- Models: 66% (4/6) 🚧
- Services: 0%
- Controllers: 0%
- Routes: 0%
- Frontend: 0%
- Testing: 0%

**總體進度**: ~15%
