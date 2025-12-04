/**
 * API 客戶端
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_URL } from './constants'
import type {
  LoginRequest,
  LoginResponse,
  ApiResponse,
  Game,
  GameDay,
  Team,
  Bid,
  DailyResult,
  BidSubmission,
  GameCreateParams,
  User
} from './types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 請求攔截器：自動添加 token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // 回應攔截器：統一處理錯誤
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Token 過期或無效，清除本地存儲並跳轉到登入頁
          localStorage.removeItem('token')
          localStorage.removeItem('userRole')
          window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error)
      }
    )
  }

  // ============ 認證相關 ============
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.client.post('/auth/login', data)
  }

  async updatePassword(userId: number, newPassword: string): Promise<ApiResponse> {
    return this.client.post('/auth/update-password', { userId, newPassword })
  }

  async resetPasswords(userIds: number[], newPassword: string): Promise<ApiResponse> {
    return this.client.post('/auth/reset-passwords', { userIds, newPassword })
  }

  async resetTeamPassword(userId: number, teamNumber: number): Promise<ApiResponse> {
    // 重置單一用戶密碼為其團隊編號（兩位數，如 01, 02）
    const newPassword = String(teamNumber).padStart(2, '0')
    return this.client.post('/auth/reset-passwords', { userIds: [userId], newPassword })
  }

  async resetAllPasswords(): Promise<ApiResponse> {
    // 獲取所有團隊用戶並重置密碼
    return this.client.post('/auth/reset-all-passwords', {})
  }

  // ============ 遊戲管理 (管理員) ============
  async createGame(data: GameCreateParams): Promise<ApiResponse<Game>> {
    return this.client.post('/admin/games', data)
  }

  async getAllGames(): Promise<ApiResponse<Game[]>> {
    return this.client.get('/admin/games')
  }

  async getHistoryGames(): Promise<ApiResponse<Game[]>> {
    // 獲取已結束的遊戲（finished 或 force_ended）
    // 注意：interceptor 已經解開 response.data，所以這裡拿到的是 { success, data, message }
    const response: ApiResponse<Game[]> = await this.client.get('/admin/games')
    const games = response.data || []
    const historyGames = games.filter((g: Game) => g.status === 'finished' || g.status === 'force_ended')
    return {
      success: true,
      data: historyGames,
      message: '獲取成功'
    }
  }

  async getGameById(gameId: number): Promise<ApiResponse<Game>> {
    return this.client.get(`/admin/games/${gameId}`)
  }

  async getActiveGame(): Promise<ApiResponse<Game>> {
    // 根據角色使用不同的 API
    const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null

    if (userRole === 'team') {
      // 團隊使用專用的 API
      return this.client.get('/team/active-game')
    }

    // 管理員使用 getAllGames 並篩選出 active 的遊戲
    // 注意：interceptor 已經解開 response.data，所以這裡拿到的是 { success, data, message }
    const response: ApiResponse<Game[]> = await this.client.get('/admin/games')
    const games = response.data || []
    const activeGame = games.find((g: Game) => g.status === 'active')
    return {
      success: true,
      data: activeGame,
      message: activeGame ? '獲取成功' : '沒有進行中的遊戲'
    }
  }

  async updateGameStatus(gameId: number, status: string): Promise<ApiResponse<Game>> {
    // 根據狀態調用相應的 API
    if (status === 'paused') {
      return this.client.post(`/admin/games/${gameId}/pause`)
    } else if (status === 'active') {
      return this.client.post(`/admin/games/${gameId}/resume`)
    } else if (status === 'finished') {
      return this.client.post(`/admin/games/${gameId}/force-end`)
    }
    throw new Error('不支持的狀態更新')
  }

  // ============ 遊戲天數相關 ============
  async getCurrentGameDay(gameId: number): Promise<ApiResponse<GameDay>> {
    // 根據角色使用不同的 API
    const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null

    if (userRole === 'team') {
      // 團隊使用 /team/games/:id/status
      // 後端 TeamController.getGameStatus 回傳 { game, currentDay }
      const response: ApiResponse<any> = await this.client.get(`/team/games/${gameId}/status`)
      return {
        success: true,
        data: response.data?.currentDay,
        message: '獲取成功'
      }
    }

    // 管理員使用 /admin/games/:id
    // 後端 AdminController.getGameDetails 回傳 { game, currentDay, teams }
    const response: ApiResponse<any> = await this.client.get(`/admin/games/${gameId}`)
    return {
      success: true,
      data: response.data?.currentDay,
      message: '獲取成功'
    }
  }

  async startBuying(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/start-buying`)
  }

  async closeBuying(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/close-buying`)
  }

  async startSelling(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/start-selling`)
  }

  async closeSelling(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/close-selling`)
  }

  async settleDay(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/settle`)
  }

  async nextDay(gameId: number): Promise<ApiResponse> {
    return this.client.post(`/admin/games/${gameId}/next-day`)
  }

  // ============ 團隊相關 ============
  async getTeamInfo(gameId: number): Promise<ApiResponse<Team>> {
    // 使用 my-status 獲取我的團隊資訊
    // 注意：interceptor 已經解開 response.data，所以這裡拿到的是 { success, data, message }
    // 後端 TeamController.getMyStatus 回傳 { game, currentDay, myTeam, loanStatus, myBids, dailyResults }
    const response: ApiResponse<any> = await this.client.get(`/team/games/${gameId}/my-status`)
    return {
      success: true,
      data: response.data?.myTeam,
      message: '獲取成功'
    }
  }

  async getMyTeamStatus(gameId: number): Promise<ApiResponse<Team>> {
    // getTeamInfo 的別名
    return this.getTeamInfo(gameId)
  }

  async getAllTeams(gameId: number): Promise<ApiResponse<Team[]>> {
    return this.client.get(`/team/games/${gameId}/teams`)
  }

  // ============ 投標相關 (團隊) ============
  async submitBid(data: BidSubmission): Promise<ApiResponse<Bid>> {
    return this.client.post('/team/bids', data)
  }

  async getTeamBids(gameId: number, dayNumber?: number): Promise<ApiResponse<Bid[]>> {
    const params = dayNumber ? { dayNumber } : {}
    return this.client.get(`/team/games/${gameId}/bids`, { params })
  }

  async getAllBids(gameId: number, dayNumber?: number): Promise<ApiResponse<Bid[]>> {
    // 管理員專用：獲取所有團隊的投標記錄
    const params = dayNumber ? { dayNumber } : {}
    return this.client.get(`/admin/games/${gameId}/bids`, { params })
  }

  async deleteBid(bidId: number): Promise<ApiResponse> {
    return this.client.delete(`/team/bids/${bidId}`)
  }

  async updateBid(bidId: number, data: { price?: number; quantity?: number }): Promise<ApiResponse<Bid>> {
    return this.client.put(`/team/bids/${bidId}`, data)
  }

  // ============ 每日結果相關 ============
  async getDailyResults(gameId: number, dayNumber?: number): Promise<ApiResponse<DailyResult[]>> {
    // 管理員專用：獲取所有團隊的每日統計結果
    const params = dayNumber ? { dayNumber } : {}
    return this.client.get(`/admin/games/${gameId}/daily-results`, { params })
  }

  async getTeamDailyResults(gameId: number): Promise<ApiResponse<DailyResult[]>> {
    // 從 my-status 獲取我的每日結果
    // 注意：interceptor 已經解開 response.data，所以這裡拿到的是 { success, data, message }
    const response: ApiResponse<any> = await this.client.get(`/team/games/${gameId}/my-status`)
    return {
      success: true,
      data: response.data?.dailyResults || [],
      message: '獲取成功'
    }
  }

  // 新增：獲取我的投標記錄（不限於當天）
  async getMyBids(gameId: number, dayNumber?: number): Promise<ApiResponse<Bid[]>> {
    const params = dayNumber ? { dayNumber } : {}
    return this.client.get(`/team/games/${gameId}/bids`, { params })
  }

  // 新增：獲取我的歷史統計
  async getMyDailyResults(gameId: number): Promise<ApiResponse<DailyResult[]>> {
    // 注意：interceptor 已經解開 response.data，所以這裡拿到的是 { success, data, message }
    const response: ApiResponse<any> = await this.client.get(`/team/games/${gameId}/my-status`)
    return {
      success: true,
      data: response.data?.dailyResults || [],
      message: '獲取成功'
    }
  }
}

export const api = new ApiClient()
