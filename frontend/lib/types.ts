/**
 * TypeScript 類型定義
 */

export interface User {
  id: number
  username: string
  role: 'admin' | 'team'
  createdAt: string
}

export interface Game {
  id: number
  gameName: string
  totalDays: number
  currentDay: number
  status: 'pending' | 'active' | 'paused' | 'finished' | 'force_ended'
  initialBudget: number
  dailyInterestRate: number
  loanInterestRate: number
  maxLoanRatio: number
  unsoldFeePerKg: number
  fixedUnsoldRatio: number
  distributorFloorPriceA: number
  distributorFloorPriceB: number
  targetPriceA: number
  targetPriceB: number
  buyingDuration: number
  sellingDuration: number
  createdAt: string
  updatedAt: string
}

export interface GameDay {
  id: number
  gameId: number
  dayNumber: number
  status: 'pending' | 'buying_open' | 'buying_closed' | 'selling_open' | 'selling_closed' | 'settled'
  buyingStartTime: string | null
  buyingEndTime: string | null
  sellingStartTime: string | null
  sellingEndTime: string | null
  settlementTime: string | null
}

export interface Team {
  id: number
  gameId: number
  userId: number
  teamNumber: number
  cash: number
  totalLoan: number
  fishAInventory: number
  fishBInventory: number
  accumulatedProfit: number
  roi: number
}

export interface Bid {
  id: number
  gameId: number
  gameDayId: number
  dayNumber: number
  teamId: number
  bidType: 'buy' | 'sell'
  fishType: 'A' | 'B'
  price: number
  quantitySubmitted: number
  quantityFulfilled: number | null
  totalCost: number | null
  status: 'pending' | 'fulfilled' | 'partial' | 'failed'
  failReason: string | null
  createdAt: string
}

export interface DailyResult {
  id: number
  gameId: number
  gameDayId: number
  dayNumber: number
  teamId: number
  dayEndCash: number
  fishAPurchased: number
  fishBPurchased: number
  fishASold: number
  fishBSold: number
  fishAUnsold: number
  fishBUnsold: number
  totalRevenue: number
  totalCost: number
  unsoldPenalty: number
  loanInterest: number
  dailyProfit: number
  accumulatedProfit: number
  roi: number
  teamNumber: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface BidSubmission {
  gameId: number
  fishType: 'A' | 'B'
  bidType: 'buy' | 'sell'
  price: number
  quantity: number
}

export interface GameCreateParams {
  gameName: string
  totalDays: number
  numTeams: number
  initialBudget: number
  dailyInterestRate: number
  loanInterestRate: number
  maxLoanRatio: number
  unsoldFeePerKg: number
  fixedUnsoldRatio: number
  distributorFloorPriceA: number
  distributorFloorPriceB: number
  targetPriceA: number
  targetPriceB: number
  buyingDuration: number
  sellingDuration: number
}
