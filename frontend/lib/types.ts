/**
 * TypeScript 類型定義
 */

export interface User {
  id: number
  username: string
  role: 'admin' | 'team'
  displayName?: string
  createdAt: string
  updatedAt?: string
}

export interface Game {
  id: number
  gameName: string
  description: string
  status: 'pending' | 'active' | 'paused' | 'finished' | 'force_ended'
  totalDays: number
  currentDay: number
  numTeams: number
  teamNames: string[]
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
  isForceEnded: boolean
  forceEndedAt: string | null
  forceEndDay: number | null
  createdAt: string
  updatedAt: string
}

export interface GameDay {
  id: number
  gameId: number
  dayNumber: number
  status: 'pending' | 'buying_open' | 'buying_closed' | 'selling_open' | 'selling_closed' | 'settled'
  fishASupply: number
  fishARestaurantBudget: number
  fishBSupply: number
  fishBRestaurantBudget: number
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: number
  gameId: number
  userId: number
  teamName: string
  teamNumber: number
  cash: number
  initialBudget: number
  totalLoan: number
  totalLoanPrincipal: number
  fishAInventory: number
  fishBInventory: number
  cumulativeProfit: number
  roi: number
  createdAt?: string
  updatedAt?: string
}

export interface Bid {
  id: number
  gameId: number
  gameDayId: number
  dayNumber: number
  teamId: number
  teamName: string
  teamNumber: number
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
  totalLoan: number
  fishAInventory: number
  fishBInventory: number
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
  cumulativeProfit: number
  roi: number
  teamNumber: number
  createdAt: string
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
  description: string
  totalDays: number
  numTeams: number
  teamNames: string[]
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
