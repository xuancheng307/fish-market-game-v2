/**
 * WebSocket 客戶端
 */

import { io, Socket } from 'socket.io-client'
import { WS_URL, SOCKET_EVENTS } from './constants'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error'

class WebSocketClient {
  private socket: Socket | null = null
  private gameId: number | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = []

  connect(token: string): void {
    if (this.socket?.connected) {
      return
    }

    this.setStatus('connecting')

    this.socket = io(WS_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    this.socket.on('connect', () => {
      console.log('✅ WebSocket 已連接')
      this.setStatus('connected')

      // 重連後自動重新加入遊戲房間
      if (this.gameId) {
        console.log(`🔄 重新加入遊戲房間: ${this.gameId}`)
        this.socket?.emit(SOCKET_EVENTS.JOIN_GAME, { gameId: this.gameId })
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket 已斷開:', reason)
      this.setStatus('disconnected')
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket 重連成功 (嘗試次數: ${attemptNumber})`)
      this.setStatus('connected')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 嘗試重連 WebSocket (第 ${attemptNumber} 次)`)
      this.setStatus('reconnecting')
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket 重連錯誤:', error)
      this.setStatus('error')
    })

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket 重連失敗，已達最大重試次數')
      this.setStatus('error')
    })

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket 連接錯誤:', error)
      this.setStatus('error')
    })
  }

  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status
    this.statusCallbacks.forEach(callback => callback(status))
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks.push(callback)
    // 立即調用一次以獲取當前狀態
    callback(this.connectionStatus)
  }

  removeStatusCallback(callback: (status: ConnectionStatus) => void): void {
    this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback)
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus
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
