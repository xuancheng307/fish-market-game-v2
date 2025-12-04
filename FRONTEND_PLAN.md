# 魚市場遊戲重構版 - 前端開發規劃

**日期**: 2025-12-03
**技術選型**: React + Next.js + Ant Design
**目標**: 長期維護運行版本

---

## 一、技術棧確認

### 核心框架
- **Next.js 14** (App Router)
  - React Server Components
  - 自動路由
  - 內建 API routes
  - 優秀的 SEO（雖然本項目用不太到）

- **React 18**
  - Hooks
  - Context API (狀態管理)
  - Suspense (載入狀態)

### UI 組件庫
- **Ant Design 5.x**
  - 企業級 UI 組件
  - 豐富的圖表支援
  - 完整的中文文檔
  - 主題客製化

### 狀態管理
- **React Context + Hooks**
  - 對於10組學生的規模足夠
  - 避免過度工程化
  - 簡單易維護

### 即時通訊
- **Socket.IO Client**
  - 與後端 Socket.IO 配對
  - 自動重連機制
  - 房間管理

### 數據視覺化
- **ECharts for React**
  - 功能強大
  - 中文文檔完善
  - 可客製化程度高

### HTTP 請求
- **Axios**
  - 攔截器支援 (Token注入)
  - 錯誤統一處理
  - Request/Response 轉換

### 表單驗證
- **React Hook Form**
  - 效能優異
  - 輕量級
  - 與 Ant Design 整合良好

### 工具函數
- **Day.js** - 時間處理
- **numeral.js** - 數字格式化

---

## 二、項目結構設計

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # 認證相關頁面群組
│   │   ├── login/
│   │   │   └── page.tsx        # 登入頁面
│   │   └── layout.tsx          # 認證布局
│   │
│   ├── admin/                   # 管理員頁面
│   │   ├── layout.tsx          # 管理員布局
│   │   ├── page.tsx            # 主控台首頁
│   │   ├── games/
│   │   │   ├── create/
│   │   │   │   └── page.tsx   # 創建遊戲
│   │   │   ├── [id]/
│   │   │   │   ├── control/
│   │   │   │   │   └── page.tsx # 遊戲控制
│   │   │   │   ├── results/
│   │   │   │   │   └── page.tsx # 競標結果
│   │   │   │   └── stats/
│   │   │   │       └── page.tsx # 每日統計
│   │   │   └── history/
│   │   │       └── page.tsx   # 歷史遊戲
│   │   └── settings/
│   │       └── page.tsx        # 設定
│   │
│   ├── team/                    # 團隊頁面
│   │   ├── layout.tsx          # 團隊布局
│   │   ├── page.tsx            # 團隊首頁
│   │   ├── dashboard/
│   │   │   └── page.tsx        # 狀態儀表板
│   │   ├── bidding/
│   │   │   ├── buy/
│   │   │   │   └── page.tsx   # 買入投標
│   │   │   └── sell/
│   │   │       └── page.tsx   # 賣出投標
│   │   ├── history/
│   │   │   └── page.tsx        # 歷史記錄
│   │   └── settings/
│   │       └── page.tsx        # 團隊設定（改密碼）
│   │
│   ├── api/                     # API routes (Optional)
│   │   └── auth/
│   │       └── route.ts        # 認證相關 API
│   │
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首頁（重定向）
│   └── globals.css              # 全局樣式
│
├── components/                   # 共用組件
│   ├── common/                  # 通用組件
│   │   ├── AppHeader.tsx       # 頁面頭部
│   │   ├── AppFooter.tsx       # 頁面底部
│   │   ├── Loading.tsx         # 載入指示器
│   │   ├── ErrorBoundary.tsx   # 錯誤邊界
│   │   └── ProtectedRoute.tsx  # 路由保護
│   │
│   ├── admin/                   # 管理員專用組件
│   │   ├── GameControlPanel.tsx   # 遊戲控制面板
│   │   ├── TeamStatusTable.tsx    # 團隊狀態表格
│   │   ├── BiddingResultsTable.tsx # 競標結果表格
│   │   ├── DailyStatsTable.tsx    # 每日統計表格
│   │   ├── GameForm.tsx           # 遊戲創建表單
│   │   └── QRCodeModal.tsx        # QR Code 彈窗
│   │
│   ├── team/                    # 團隊專用組件
│   │   ├── GameStatus.tsx      # 遊戲狀態顯示
│   │   ├── FinanceCard.tsx     # 財務卡片
│   │   ├── BiddingForm.tsx     # 投標表單
│   │   ├── CountdownTimer.tsx  # 倒計時計時器
│   │   └── RankingCard.tsx     # 排名卡片
│   │
│   └── charts/                  # 圖表組件
│       ├── PriceDistributionChart.tsx  # 價格分佈圖
│       ├── ROITrendChart.tsx           # ROI趨勢圖
│       └── MarketSupplyDemandChart.tsx # 供需曲線圖
│
├── contexts/                     # React Context
│   ├── AuthContext.tsx          # 認證狀態
│   ├── GameContext.tsx          # 遊戲狀態
│   └── WebSocketContext.tsx     # WebSocket 連線
│
├── hooks/                        # 自定義 Hooks
│   ├── useAuth.ts               # 認證 Hook
│   ├── useGame.ts               # 遊戲數據 Hook
│   ├── useWebSocket.ts          # WebSocket Hook
│   ├── useBidding.ts            # 投標 Hook
│   └── useCountdown.ts          # 倒計時 Hook
│
├── lib/                          # 核心函數庫
│   ├── api/                     # API 呼叫
│   │   ├── client.ts           # Axios 客戶端配置
│   │   ├── auth.ts             # 認證 API
│   │   ├── admin.ts            # 管理員 API
│   │   ├── team.ts             # 團隊 API
│   │   └── types.ts            # API 類型定義
│   │
│   ├── utils/                   # 工具函數
│   │   ├── format.ts           # 格式化工具
│   │   ├── calculate.ts        # 計算工具
│   │   ├── validation.ts       # 驗證工具
│   │   └── storage.ts          # LocalStorage 工具
│   │
│   └── constants.ts             # 常數定義
│
├── types/                        # TypeScript 類型定義
│   ├── auth.ts                  # 認證相關類型
│   ├── game.ts                  # 遊戲相關類型
│   ├── bid.ts                   # 投標相關類型
│   └── team.ts                  # 團隊相關類型
│
├── styles/                       # 樣式文件
│   ├── variables.css            # CSS 變數
│   ├── admin.module.css         # 管理員樣式
│   └── team.module.css          # 團隊樣式
│
├── public/                       # 靜態資源
│   ├── images/                  # 圖片
│   └── fonts/                   # 字體
│
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.local                    # 環境變數
```

---

## 三、核心功能模塊

### 3.1 認證系統

#### 登入頁面 (`/login`)

**功能需求**：
- [x] 帳號密碼登入
- [x] 記住帳號（LocalStorage）
- [x] 登入狀態持久化（Token）
- [x] 根據角色跳轉（admin → /admin，team → /team）
- [x] 錯誤訊息顯示

**UI 設計**：
```
┌──────────────────────────────────┐
│                                  │
│        魚市場交易遊戲           │
│     Fish Market Trading Game     │
│                                  │
│  ┌────────────────────────────┐ │
│  │                            │ │
│  │  帳號：[_______________]   │ │
│  │                            │ │
│  │  密碼：[_______________]   │ │
│  │                            │ │
│  │  □ 記住帳號               │ │
│  │                            │ │
│  │     [     登入     ]       │ │
│  │                            │ │
│  │  測試帳號：              │ │
│  │  • 學生：01-12 / 01-12   │ │
│  │  • 管理員：admin / admin  │ │
│  │                            │ │
│  └────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

**API 對接**：
```typescript
// POST /api/auth/login
{
  username: string,
  password: string
}

// Response
{
  success: boolean,
  data: {
    token: string,
    role: 'admin' | 'team',
    username: string,
    userId: number
  }
}
```

---

### 3.2 管理員介面

#### A. 遊戲控制台 (`/admin/games/[id]/control`)

**功能需求**：
- [x] 實時顯示遊戲狀態（WebSocket）
- [x] 當前階段顯示（買入/賣出/結算）
- [x] 倒計時顯示
- [x] 遊戲控制按鈕
- [x] 團隊狀態總覽
- [x] 一鍵操作確認

**主要組件**：
1. **GameStatusCard** - 遊戲狀態卡片
2. **PhaseControlPanel** - 階段控制面板
3. **TeamStatusTable** - 團隊狀態表格
4. **MarketParamsCard** - 市場參數卡片

**控制流程**：
```
準備中 → [開始買入] → 買入中 → [結束買入] →
買入已關閉 → [開始賣出] → 賣出中 → [結束賣出] →
賣出已關閉 → [執行結算] → 已結算 → [下一天] → ...
```

**API 對接**：
```typescript
// 遊戲控制 API
POST /api/admin/games/:id/start-buying
POST /api/admin/games/:id/close-buying
POST /api/admin/games/:id/start-selling
POST /api/admin/games/:id/close-selling
POST /api/admin/games/:id/settle
POST /api/admin/games/:id/next-day

// WebSocket 事件
socket.on('gameStateUpdate', (data) => {
  // 遊戲狀態更新
})

socket.on('phaseChange', (data) => {
  // 階段變更
})
```

---

#### B. 創建遊戲 (`/admin/games/create`)

**功能需求**：
- [x] 11個遊戲參數設定
- [x] 實時驗證
- [x] 預設值建議
- [x] 參數說明 Tooltip
- [x] 創建結果展示
- [x] 快速操作按鈕

**表單欄位**：
```typescript
interface GameCreateForm {
  name: string;               // 遊戲名稱
  totalDays: number;          // 遊戲天數（預設7）
  numTeams: number;           // 參與組數（預設12）
  initialBudget: number;      // 初始資金（預設1,000,000）
  dailyInterestRate: number;  // 每日利率（預設0%）
  loanInterestRate: number;   // 貸款利率（預設3%）
  maxLoanRatio: number;       // 最大貸款比例（預設2.0 = 200%）
  unsoldFeePerKg: number;     // 滯銷費用（預設10）
  distributorFloorPriceA: number;  // A魚底價（預設100）
  distributorFloorPriceB: number;  // B魚底價（預設100）
  targetPriceA: number;       // A魚目標價（預設500）
  targetPriceB: number;       // B魚目標價（預設300）
  fixedUnsoldRatio: number;   // 固定滯銷比例（預設0.025 = 2.5%）
  buyingDuration: number;     // 買入時間（預設7分鐘）
  sellingDuration: number;    // 賣出時間（預設4分鐘）
}
```

**驗證規則**：
- 遊戲名稱：必填，1-50字
- 遊戲天數：1-30天
- 參與組數：1-20組
- 初始資金：>= 100,000
- 利率：0-100%
- 時間：1-60分鐘

---

#### C. 競標結果 (`/admin/games/[id]/results`)

**功能需求**：
- [x] 查詢特定天數
- [x] 篩選投標類型（全部/買入/賣出）
- [x] A/B級魚分開顯示
- [x] 統計摘要
- [x] 滯銷標記
- [x] 價格分佈圖表
- [x] 可排序表格
- [x] 匯出功能

**表格欄位**：
| 團隊 | 出價 | 提交量 | 成交量 | 成交率 | 狀態 |
|------|------|--------|--------|--------|------|
| 01組 | 520  | 100 kg | 80 kg  | 80%    | 部分成交 🟡 |
| 03組 | 550  | 150 kg | 0 kg   | 0%     | 滯銷 🔴 |

**統計摘要**：
- 總投標數
- 總提交量
- 總成交量
- 平均成交率

---

#### D. 每日統計 (`/admin/games/[id]/stats`)

**功能需求**：
- [x] 查詢特定天數
- [x] 完整財務報表
- [x] ROI 排名
- [x] 累積收益排名（參考用）
- [x] 趨勢圖表
- [x] 市場總結
- [x] 匯出功能

**統計表格**：
| 排名 | 團隊 | 期初現金 | 買入成本 | 賣出收入 | 滯銷費用 | 利息 | 當日損益 | 累積損益 | ROI |
|------|------|----------|----------|----------|----------|------|----------|----------|-----|
| 1    | 05組 | 950,000  | -300,000 | 380,000  | -5,000   | -10K | +65,000  | +150,000 | 15% |
| 2    | 02組 | 920,000  | -350,000 | 400,000  | -8,000   | -12K | +30,000  | +120,000 | 12% |

**圖表展示**：
- ROI 趨勢線圖（多團隊對比）
- 累積損益柱狀圖
- 市場供需曲線

---

#### E. 歷史遊戲 (`/admin/games/history`)

**功能需求**：
- [x] 遊戲列表
- [x] 狀態篩選
- [x] 搜尋功能
- [x] 快速跳轉控制
- [x] 刪除確認

---

#### F. 設定 (`/admin/settings`)

**功能需求**：
- [x] 重置所有密碼（確認對話框）
- [x] QR Code 生成（單一QR）
- [x] 系統資訊
- [x] 登出

---

### 3.3 團隊介面

#### A. 狀態儀表板 (`/team/dashboard`)

**功能需求**：
- [x] 遊戲狀態顯示
- [x] 倒計時（WebSocket同步）
- [x] 財務卡片
- [x] 排名顯示（ROI + 累積收益）
- [x] 快速導航

**UI 設計**：
```
┌─────────────────────────────────────────┐
│  🎮 第 3 天 / 共 7 天                   │
│  ⏰ 當前階段: 買入投標中                │
│  ⏱️ 剩餘時間: 05:24                    │
├─────────────────────────────────────────┤
│  ┌──────────────┬─────────────────────┐│
│  │ 💰 當前現金  │ 📊 總借貸            ││
│  │ $850,000     │ $150,000            ││
│  ├──────────────┼─────────────────────┤│
│  │ 🐟 A魚庫存   │ 🐟 B魚庫存          ││
│  │ 120 kg       │ 80 kg               ││
│  ├──────────────┴─────────────────────┤│
│  │ 📈 累積損益: +$50,000  (排名 4/12) ││
│  │ 🏆 ROI: 5.2%            (排名 3/12) ││
│  └──────────────────────────────────────┘│
│                                           │
│  [  去投標  ]  [  查看歷史  ]           │
└─────────────────────────────────────────┘
```

---

#### B. 買入投標 (`/team/bidding/buy`)

**功能需求**：
- [x] A/B級魚分開表單
- [x] 各最多2個價格
- [x] 實時計算總出價
- [x] 資金檢查
- [x] 底價驗證
- [x] 提交確認
- [x] 已提交顯示（可刪除/修改）

**表單設計**：
```
┌─ 買入投標 ─────────────────────────┐
│                                     │
│ A級魚 🐟                            │
│ ┌─────────────────────────────────┐│
│ │ 價格1: [520] 元/kg              ││
│ │ 數量1: [100] kg                 ││
│ │                                 ││
│ │ 價格2: [___] 元/kg (選填)       ││
│ │ 數量2: [___] kg (選填)          ││
│ └─────────────────────────────────┘│
│                                     │
│ B級魚 🐟                            │
│ ┌─────────────────────────────────┐│
│ │ 價格1: [310] 元/kg              ││
│ │ 數量1: [150] kg                 ││
│ │                                 ││
│ │ 價格2: [300] 元/kg (選填)       ││
│ │ 數量2: [50] kg (選填)           ││
│ └─────────────────────────────────┘│
│                                     │
│ 💡 總出價: $98,500                  │
│ 💰 可用資金: $850,000               │
│ ⚠️ 注意: 超出資金將自動借貸         │
│                                     │
│ [    確認提交    ]                  │
└─────────────────────────────────────┘

已提交投標：
┌─────────────────────────────────────┐
│ A魚 - 520元/kg × 100kg = $52,000   │
│ [修改] [刪除]                       │
├─────────────────────────────────────┤
│ B魚 - 310元/kg × 150kg = $46,500   │
│ [修改] [刪除]                       │
└─────────────────────────────────────┘
```

**驗證規則**：
- 價格必須 >= 底價
- 數量必須 > 0
- 同一魚種最多2個不同價格
- 不能重複相同價格

---

#### C. 賣出投標 (`/team/bidding/sell`)

**功能需求**：
- [x] A/B級魚分開表單
- [x] 各最多2個價格
- [x] 庫存檢查
- [x] 實時計算總數量
- [x] 提交確認
- [x] 已提交顯示（可刪除/修改）

**驗證規則**：
- 價格必須 > 0
- 數量必須 > 0 且 <= 庫存
- 同一魚種最多2個不同價格

---

#### D. 歷史記錄 (`/team/history`)

**功能需求**：
- [x] 投標歷史
- [x] 成交記錄
- [x] 每日損益
- [x] ROI 趨勢圖

---

#### E. 團隊設定 (`/team/settings`)

**功能需求**：
- [x] 修改密碼
- [x] 修改小組名稱（可選）
- [x] 登出

**修改密碼表單**：
```
┌─ 修改密碼 ──────────────────┐
│                             │
│ 舊密碼: [_______________]   │
│                             │
│ 新密碼: [_______________]   │
│                             │
│ 確認新密碼: [___________]   │
│                             │
│ [    確認修改    ]          │
└─────────────────────────────┘
```

**API 對接**：
```typescript
// PUT /api/auth/change-password
{
  oldPassword: string,
  newPassword: string
}
```

---

## 四、WebSocket 事件設計

### 連線管理
```typescript
// 連線
socket.connect()

// 加入遊戲房間
socket.emit('joinGame', { gameId, userId, role })

// 離開房間
socket.emit('leaveGame', { gameId })

// 斷線重連
socket.on('connect', () => {
  // 重新加入房間
})
```

### 事件監聽

#### 管理員事件
```typescript
// 團隊投標通知
socket.on('bidSubmitted', (data) => {
  // { teamId, bidType, fishType, price, quantity }
})

// 遊戲狀態更新
socket.on('gameStateUpdate', (data) => {
  // { gameId, status, phase, currentDay }
})
```

#### 團隊事件
```typescript
// 階段變更
socket.on('phaseChange', (data) => {
  // { phase, duration, startTime }
})

// 倒計時更新
socket.on('countdownUpdate', (data) => {
  // { remaining }
})

// 結算完成
socket.on('settlementComplete', (data) => {
  // { day, results }
})
```

---

## 五、開發時程規劃

### 第一階段：基礎架構（3-4天）

#### Day 1-2: 項目初始化與核心配置
- [x] Next.js 專案初始化
- [x] Ant Design 配置
- [x] TypeScript 配置
- [x] Axios 客戶端設定
- [x] Socket.IO 客戶端設定
- [x] 認證 Context 建立
- [x] API 類型定義
- [x] 共用工具函數

#### Day 3-4: 認證系統
- [x] 登入頁面 UI
- [x] 登入邏輯實現
- [x] Token 管理
- [x] 路由保護
- [x] 角色判斷跳轉

**交付產物**：
- 可正常登入的系統
- Token 持久化
- 路由保護機制

---

### 第二階段：管理員介面（5-6天）

#### Day 5-6: 遊戲控制與創建
- [x] 創建遊戲頁面
- [x] 遊戲控制台
- [x] GameControlPanel 組件
- [x] TeamStatusTable 組件
- [x] API 整合

#### Day 7-8: 數據查看
- [x] 競標結果頁面
- [x] 每日統計頁面
- [x] 表格組件優化
- [x] 篩選與排序功能

#### Day 9-10: 輔助功能
- [x] 歷史遊戲頁面
- [x] 設定頁面
- [x] QR Code 生成
- [x] 重置密碼功能

**交付產物**：
- 完整的管理員介面
- 所有CRUD功能
- QR Code 生成

---

### 第三階段：團隊介面（4-5天）

#### Day 11-12: 核心頁面
- [x] 狀態儀表板
- [x] 財務卡片組件
- [x] 遊戲狀態組件
- [x] 排名卡片組件

#### Day 13-14: 投標功能
- [x] 買入投標頁面
- [x] 賣出投標頁面
- [x] 投標表單組件
- [x] 驗證邏輯
- [x] API 整合

#### Day 15: 輔助功能
- [x] 歷史記錄頁面
- [x] 團隊設定頁面
- [x] 修改密碼功能

**交付產物**：
- 完整的團隊介面
- 投標功能
- 修改密碼功能

---

### 第四階段：即時功能（3-4天）

#### Day 16-17: WebSocket 整合
- [x] WebSocket Context
- [x] useWebSocket Hook
- [x] 事件監聽與處理
- [x] 斷線重連機制

#### Day 18-19: 倒計時與實時更新
- [x] CountdownTimer 組件
- [x] 遊戲狀態實時更新
- [x] 投標通知
- [x] 結算結果推送

**交付產物**：
- WebSocket 即時通訊
- 倒計時同步
- 狀態實時更新

---

### 第五階段：數據視覺化（2-3天）

#### Day 20-21: 圖表整合
- [x] ECharts 配置
- [x] 價格分佈圖
- [x] ROI 趨勢圖
- [x] 市場供需曲線

#### Day 22: 圖表優化
- [x] 響應式設計
- [x] 主題配置
- [x] 動畫效果

**交付產物**：
- 完整的數據視覺化
- 圖表互動功能

---

### 第六階段：優化與測試（3-4天）

#### Day 23-24: UI/UX 優化
- [x] 響應式設計調整
- [x] Loading 狀態優化
- [x] 錯誤處理完善
- [x] Toast 通知系統
- [x] 確認對話框

#### Day 25-26: 測試與修正
- [x] 功能測試
- [x] API 整合測試
- [x] 跨瀏覽器測試
- [x] Bug 修正
- [x] 效能優化

**交付產物**：
- 穩定可用的系統
- 完整的錯誤處理
- 優秀的用戶體驗

---

### 第七階段：部署與文檔（1-2天）

#### Day 27: 部署準備
- [x] 環境變數配置
- [x] 構建優化
- [x] Railway 部署配置

#### Day 28: 文檔與交付
- [x] 用戶使用手冊
- [x] 開發文檔
- [x] API 文檔整理
- [x] 最終測試

**交付產物**：
- 上線運行的系統
- 完整的文檔

---

## 六、技術細節規範

### 6.1 API 呼叫規範

#### Axios 客戶端配置
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 攔截器 - 注入 Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response 攔截器 - 統一錯誤處理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期，跳轉登入
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### API 模組範例
```typescript
// lib/api/admin.ts
import apiClient from './client';
import type { Game, GameCreateParams, Team } from '@/types';

export const adminAPI = {
  // 創建遊戲
  createGame: (params: GameCreateParams) =>
    apiClient.post<{ data: Game }>('/api/admin/games', params),

  // 獲取活動遊戲
  getActiveGame: () =>
    apiClient.get<{ data: Game }>('/api/admin/active-game'),

  // 遊戲控制
  startBuying: (gameId: number) =>
    apiClient.post(`/api/admin/games/${gameId}/start-buying`),

  closeB buying: (gameId: number) =>
    apiClient.post(`/api/admin/games/${gameId}/close-buying`),

  // 獲取團隊列表
  getTeams: (gameId: number) =>
    apiClient.get<{ data: Team[] }>(`/api/admin/games/${gameId}/teams`),

  // 重置所有密碼
  resetPasswords: () =>
    apiClient.post('/api/auth/reset-passwords'),
};
```

---

### 6.2 狀態管理規範

#### Auth Context 範例
```typescript
// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api/auth';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 初始化：從 localStorage 恢復登入狀態
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      // 驗證 token 並獲取用戶資訊
      authAPI.verifyToken()
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await authAPI.login(username, password);
    setToken(data.token);
    setUser({ id: data.userId, username, role: data.role });
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

### 6.3 組件開發規範

#### 命名規範
- 組件名稱：PascalCase（如 `GameControlPanel`）
- 文件名稱：PascalCase.tsx（如 `GameControlPanel.tsx`）
- Hook 名稱：camelCase，以 use 開頭（如 `useAuth`）
- 工具函數：camelCase（如 `formatCurrency`）
- 常數：UPPER_SNAKE_CASE（如 `API_BASE_URL`）

#### 組件結構範例
```typescript
// components/admin/GameControlPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Modal, message } from 'antd';
import { useGame } from '@/hooks/useGame';
import { adminAPI } from '@/lib/api/admin';
import type { Game } from '@/types';

interface GameControlPanelProps {
  gameId: number;
}

export default function GameControlPanel({ gameId }: GameControlPanelProps) {
  const { game, loading, refetch } = useGame(gameId);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartBuying = async () => {
    Modal.confirm({
      title: '確認開始買入投標',
      content: '開始後團隊可以提交買入標單',
      onOk: async () => {
        try {
          setIsProcessing(true);
          await adminAPI.startBuying(gameId);
          message.success('已開始買入投標');
          refetch();
        } catch (error) {
          message.error('操作失敗');
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  if (loading) return <Card loading />;

  return (
    <Card title="遊戲控制">
      <Space>
        <Button
          type="primary"
          onClick={handleStartBuying}
          loading={isProcessing}
          disabled={game?.phase !== 'pending'}
        >
          開始買入投標
        </Button>
        {/* 其他按鈕... */}
      </Space>
    </Card>
  );
}
```

---

### 6.4 類型定義規範

```typescript
// types/game.ts

// 遊戲狀態枚舉
export enum GameStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
}

// 階段狀態枚舉
export enum DayStatus {
  PENDING = 'pending',
  BUYING_OPEN = 'buying_open',
  BUYING_CLOSED = 'buying_closed',
  SELLING_OPEN = 'selling_open',
  SELLING_CLOSED = 'selling_closed',
  SETTLED = 'settled',
}

// 遊戲實體
export interface Game {
  id: number;
  name: string;
  status: GameStatus;
  currentDay: number;
  totalDays: number;
  numTeams: number;
  initialBudget: number;
  // ... 其他欄位
  createdAt: string;
  updatedAt: string;
}

// 創建遊戲參數
export interface GameCreateParams {
  name: string;
  totalDays: number;
  numTeams: number;
  initialBudget: number;
  dailyInterestRate: number;
  loanInterestRate: number;
  maxLoanRatio: number;
  unsoldFeePerKg: number;
  distributorFloorPriceA: number;
  distributorFloorPriceB: number;
  targetPriceA: number;
  targetPriceB: number;
  fixedUnsoldRatio: number;
  buyingDuration: number;
  sellingDuration: number;
}
```

---

## 七、環境配置

### 開發環境變數 (`.env.local`)
```env
# API 端點
NEXT_PUBLIC_API_URL=http://localhost:3000

# WebSocket 端點
NEXT_PUBLIC_WS_URL=http://localhost:3000

# 環境
NODE_ENV=development
```

### 生產環境變數 (`.env.production`)
```env
# API 端點
NEXT_PUBLIC_API_URL=https://backend-production-42d3.up.railway.app

# WebSocket 端點
NEXT_PUBLIC_WS_URL=https://backend-production-42d3.up.railway.app

# 環境
NODE_ENV=production
```

---

## 八、部署配置

### Next.js 配置 (`next.config.js`)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,

  // Railway 部署配置
  experimental: {
    serverActions: true,
  },

  // API 代理（可選）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
```

### Railway 部署
1. 連接 Git Repository
2. 選擇 Next.js 模板
3. 設定環境變數
4. 自動部署

---

## 九、測試策略

### 功能測試清單

#### 認證系統
- [ ] 正確的帳號密碼可以登入
- [ ] 錯誤的帳號密碼會顯示錯誤
- [ ] Admin 登入後跳轉到 /admin
- [ ] Team 登入後跳轉到 /team
- [ ] Token 過期後會自動登出
- [ ] 記住帳號功能正常

#### 管理員功能
- [ ] 創建遊戲成功
- [ ] 遊戲參數驗證正確
- [ ] 遊戲控制按鈕根據階段顯示
- [ ] 階段切換成功
- [ ] 團隊狀態實時更新（WebSocket）
- [ ] 競標結果正確顯示
- [ ] 每日統計數據正確
- [ ] 重置密碼功能正常
- [ ] QR Code 生成成功

#### 團隊功能
- [ ] 狀態儀表板數據正確
- [ ] 倒計時同步（WebSocket）
- [ ] 買入投標表單驗證正確
- [ ] 底價檢查正常
- [ ] 最多2個價格限制生效
- [ ] 賣出投標庫存檢查正確
- [ ] 修改密碼成功
- [ ] 歷史記錄顯示正確

#### WebSocket
- [ ] 連線成功
- [ ] 斷線自動重連
- [ ] 事件接收正常
- [ ] 多用戶同時在線正常

#### 響應式
- [ ] 桌面版顯示正常
- [ ] 平板顯示正常
- [ ] 手機版顯示正常
- [ ] 表格在小螢幕可閱讀

---

## 十、風險與應對

### 技術風險

1. **Next.js App Router 學習曲線**
   - 風險：開發效率降低
   - 應對：先熟悉官方文檔，參考最佳實踐

2. **WebSocket 連線穩定性**
   - 風險：頻繁斷線影響體驗
   - 應對：實作自動重連機制，heartbeat 檢測

3. **TypeScript 類型定義複雜**
   - 風險：開發時間增加
   - 應對：逐步完善類型，先用 any 快速開發

### 開發風險

1. **時程延遲**
   - 風險：無法按時完成
   - 應對：分階段交付，優先完成核心功能

2. **需求變更**
   - 風險：返工導致延遲
   - 應對：及時溝通，模組化設計便於修改

---

## 十一、下一步行動

### 立即行動
1. ✅ 確認技術選型 - **React + Next.js + Ant Design**
2. ⏳ 初始化 Next.js 專案
3. ⏳ 安裝依賴套件
4. ⏳ 配置開發環境
5. ⏳ 建立項目結構

### 本週目標
- 完成第一階段：基礎架構
- 完成登入功能
- 開始管理員介面開發

### 本月目標
- 完成管理員介面
- 完成團隊介面
- 完成 WebSocket 整合
- 完成測試並部署

---

## 附錄

### A. 參考資料
- Next.js 官方文檔: https://nextjs.org/docs
- Ant Design 官方文檔: https://ant.design/docs/react/introduce-cn
- Socket.IO 客戶端: https://socket.io/docs/v4/client-api/
- ECharts for React: https://github.com/hustcc/echarts-for-react

### B. 開發工具
- VSCode + ESLint + Prettier
- React Developer Tools
- Redux DevTools（如需要）
- Postman（API 測試）

### C. Git 工作流程
```bash
# 功能分支
git checkout -b feature/login-page
git add .
git commit -m "feat: 完成登入頁面"
git push origin feature/login-page

# 合併到 main
git checkout main
git merge feature/login-page
git push origin main
```

---

**文檔版本**: 1.0
**最後更新**: 2025-12-03
**負責人**: Claude
**審核人**: 徐景輝
