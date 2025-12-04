/**
 * 系統常數定義
 */

// API 基礎 URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'

// 遊戲狀態
export const GAME_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  FINISHED: 'finished',
  FORCE_ENDED: 'force_ended'
} as const

// 每日狀態
export const DAY_STATUS = {
  PENDING: 'pending',
  BUYING_OPEN: 'buying_open',
  BUYING_CLOSED: 'buying_closed',
  SELLING_OPEN: 'selling_open',
  SELLING_CLOSED: 'selling_closed',
  SETTLED: 'settled'
} as const

// 投標類型
export const BID_TYPE = {
  BUY: 'buy',
  SELL: 'sell'
} as const

// 魚類型
export const FISH_TYPE = {
  A: 'A',
  B: 'B'
} as const

// 投標狀態
export const BID_STATUS = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  PARTIAL: 'partial',
  FAILED: 'failed'
} as const

// 用戶角色
export const USER_ROLE = {
  ADMIN: 'admin',
  TEAM: 'team'
} as const

// 狀態顯示文字
export const STATUS_DISPLAY_TEXT: Record<string, string> = {
  [DAY_STATUS.PENDING]: '等待開始',
  [DAY_STATUS.BUYING_OPEN]: '買入投標中',
  [DAY_STATUS.BUYING_CLOSED]: '買入已關閉',
  [DAY_STATUS.SELLING_OPEN]: '賣出投標中',
  [DAY_STATUS.SELLING_CLOSED]: '賣出已關閉',
  [DAY_STATUS.SETTLED]: '結算完成'
}

// WebSocket 事件
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_GAME: 'joinGame',
  LEAVE_GAME: 'leaveGame',
  PHASE_CHANGE: 'phaseChange',
  BID_SUBMITTED: 'bidSubmitted',
  SETTLEMENT_COMPLETE: 'settlementComplete',
  GAME_UPDATE: 'gameUpdate',
  ERROR: 'error'
} as const
