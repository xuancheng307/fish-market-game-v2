/**
 * 系統常數定義
 */

// 遊戲狀態
const GAME_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    PAUSED: 'paused',
    FINISHED: 'finished',
    FORCE_ENDED: 'force_ended'
};

// 每日狀態 (唯一狀態來源)
const DAY_STATUS = {
    PENDING: 'pending',
    BUYING_OPEN: 'buying_open',
    BUYING_CLOSED: 'buying_closed',
    SELLING_OPEN: 'selling_open',
    SELLING_CLOSED: 'selling_closed',
    SETTLED: 'settled'
};

// 投標類型
const BID_TYPE = {
    BUY: 'buy',
    SELL: 'sell'
};

// 魚類型
const FISH_TYPE = {
    A: 'A',
    B: 'B'
};

// 投標狀態
const BID_STATUS = {
    PENDING: 'pending',
    FULFILLED: 'fulfilled',
    PARTIAL: 'partial',
    FAILED: 'failed'
};

// 用戶角色
const USER_ROLE = {
    ADMIN: 'admin',
    TEAM: 'team'
};

// 預設遊戲參數
const DEFAULT_GAME_PARAMS = {
    TOTAL_DAYS: 10,
    NUM_TEAMS: 6,
    INITIAL_BUDGET: 100000,
    DAILY_INTEREST_RATE: 0.0,
    LOAN_INTEREST_RATE: 0.03,
    MAX_LOAN_RATIO: 2.0,
    UNSOLD_FEE_PER_KG: 5.0,
    FIXED_UNSOLD_RATIO: 0.025,
    DISTRIBUTOR_FLOOR_PRICE_A: 0,
    DISTRIBUTOR_FLOOR_PRICE_B: 0,
    TARGET_PRICE_A: 0,
    TARGET_PRICE_B: 0,
    BUYING_DURATION: 300,
    SELLING_DURATION: 300
};

// WebSocket 事件
const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    JOIN_GAME: 'joinGame',
    LEAVE_GAME: 'leaveGame',
    PHASE_CHANGE: 'phaseChange',
    BID_SUBMITTED: 'bidSubmitted',
    SETTLEMENT_COMPLETE: 'settlementComplete',
    GAME_UPDATE: 'gameUpdate',
    ERROR: 'error'
};

// 錯誤碼
const ERROR_CODES = {
    // 認證相關
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // 遊戲相關
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
    GAME_NOT_ACTIVE: 'GAME_NOT_ACTIVE',
    INVALID_GAME_STATUS: 'INVALID_GAME_STATUS',

    // 投標相關
    INVALID_BID: 'INVALID_BID',
    DUPLICATE_BID: 'DUPLICATE_BID',
    TOO_MANY_BIDS: 'TOO_MANY_BIDS',
    INVALID_PRICE: 'INVALID_PRICE',
    BID_NOT_ALLOWED: 'BID_NOT_ALLOWED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',

    // 階段相關
    INVALID_PHASE: 'INVALID_PHASE',
    PHASE_TRANSITION_ERROR: 'PHASE_TRANSITION_ERROR',

    // 其他
    DATABASE_ERROR: 'DATABASE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

// 狀態顯示文字映射
const STATUS_DISPLAY_TEXT = {
    [DAY_STATUS.PENDING]: '等待開始',
    [DAY_STATUS.BUYING_OPEN]: '買入投標中',
    [DAY_STATUS.BUYING_CLOSED]: '買入已關閉',
    [DAY_STATUS.SELLING_OPEN]: '賣出投標中',
    [DAY_STATUS.SELLING_CLOSED]: '賣出已關閉',
    [DAY_STATUS.SETTLED]: '結算完成'
};

// 狀態可用操作映射
const STATUS_AVAILABLE_ACTIONS = {
    [DAY_STATUS.PENDING]: ['startBuying'],
    [DAY_STATUS.BUYING_OPEN]: ['closeBuying'],
    [DAY_STATUS.BUYING_CLOSED]: ['startSelling'],
    [DAY_STATUS.SELLING_OPEN]: ['closeSelling'],
    [DAY_STATUS.SELLING_CLOSED]: ['settle'],
    [DAY_STATUS.SETTLED]: ['nextDay']
};

module.exports = {
    GAME_STATUS,
    DAY_STATUS,
    BID_TYPE,
    FISH_TYPE,
    BID_STATUS,
    USER_ROLE,
    DEFAULT_GAME_PARAMS,
    SOCKET_EVENTS,
    ERROR_CODES,
    STATUS_DISPLAY_TEXT,
    STATUS_AVAILABLE_ACTIONS
};
