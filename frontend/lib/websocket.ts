/**
 * WebSocket 客戶端
 */

import { io, Socket } from 'socket.io-client'
import { WS_URL, SOCKET_EVENTS } from './constants'

class WebSocketClient {
  private socket: Socket | null = null
  private gameId: number | null = null

  connect(token: string): void {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(WS_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('✅ WebSocket 已連接')
    })

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket 已斷開')
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 連接錯誤:', error)
    })
  }

  disconnect(): void {
    if (this.socket) {
      if (this.gameId) {
        this.leaveGame(this.gameId)
      }
      this.socket.disconnect()
      this.socket = null
      this.gameId = null
    }
  }

  joinGame(gameId: number): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.emit(SOCKET_EVENTS.JOIN_GAME, { gameId })
    this.gameId = gameId
    console.log(`✅ 加入遊戲房間: ${gameId}`)
  }

  leaveGame(gameId: number): void {
    if (!this.socket) {
      return
    }

    this.socket.emit(SOCKET_EVENTS.LEAVE_GAME, { gameId })
    this.gameId = null
    console.log(`✅ 離開遊戲房間: ${gameId}`)
  }

  // 監聽階段變化
  onPhaseChange(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.on(SOCKET_EVENTS.PHASE_CHANGE, callback)
  }

  // 監聽投標提交
  onBidSubmitted(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.on(SOCKET_EVENTS.BID_SUBMITTED, callback)
  }

  // 監聽結算完成
  onSettlementComplete(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.on(SOCKET_EVENTS.SETTLEMENT_COMPLETE, callback)
  }

  // 監聽遊戲更新
  onGameUpdate(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.on(SOCKET_EVENTS.GAME_UPDATE, callback)
  }

  // 監聽錯誤
  onError(callback: (data: any) => void): void {
    if (!this.socket) {
      console.error('❌ WebSocket 未連接')
      return
    }

    this.socket.on(SOCKET_EVENTS.ERROR, callback)
  }

  // 移除事件監聽
  off(event: string, callback?: any): void {
    if (!this.socket) {
      return
    }

    this.socket.off(event, callback)
  }

  // 移除所有監聽
  removeAllListeners(): void {
    if (!this.socket) {
      return
    }

    this.socket.removeAllListeners()
  }

  // 獲取連接狀態
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// 單例模式
export const wsClient = new WebSocketClient()
