/**
 * WebSocket 客戶端
 * ⚠️ 修正：支援在連接前註冊事件監聽器（排隊機制）
 */

import { io, Socket } from 'socket.io-client'
import { WS_URL, SOCKET_EVENTS } from './constants'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error'

// 待註冊的事件監聽器
interface PendingListener {
  event: string
  callback: (data: any) => void
}

class WebSocketClient {
  private socket: Socket | null = null
  private gameId: number | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private statusCallbacks: Array<(status: ConnectionStatus) => void> = []

  // ⚠️ 新增：待註冊的監聽器佇列
  private pendingListeners: PendingListener[] = []
  // ⚠️ 新增：已註冊的監聽器（用於重連後重新註冊）
  private registeredListeners: PendingListener[] = []

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

      // ⚠️ 連接成功後，註冊所有待處理的監聽器
      this.flushPendingListeners()

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

      // ⚠️ 重連後重新註冊所有監聽器
      this.reregisterListeners()
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

  /**
   * ⚠️ 新增：清空待處理的監聽器佇列，註冊到 socket
   */
  private flushPendingListeners(): void {
    if (!this.socket) return

    console.log(`📝 註冊 ${this.pendingListeners.length} 個待處理監聽器`)

    for (const listener of this.pendingListeners) {
      this.socket.on(listener.event, listener.callback)
      // 加入已註冊列表（用於重連）
      this.registeredListeners.push(listener)
    }

    // 清空待處理佇列
    this.pendingListeners = []
  }

  /**
   * ⚠️ 新增：重連後重新註冊所有監聽器
   */
  private reregisterListeners(): void {
    if (!this.socket) return

    console.log(`🔄 重新註冊 ${this.registeredListeners.length} 個監聽器`)

    for (const listener of this.registeredListeners) {
      this.socket.on(listener.event, listener.callback)
    }
  }

  /**
   * ⚠️ 新增：通用的事件監聽註冊方法
   */
  private addListener(event: string, callback: (data: any) => void): void {
    if (this.socket?.connected) {
      // socket 已連接，直接註冊
      this.socket.on(event, callback)
      this.registeredListeners.push({ event, callback })
    } else {
      // socket 尚未連接，加入待處理佇列
      console.log(`⏳ 監聽器 ${event} 排隊等待連接...`)
      this.pendingListeners.push({ event, callback })
    }
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
      // 清空監聽器
      this.pendingListeners = []
      this.registeredListeners = []
    }
  }

  joinGame(gameId: number): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ WebSocket 未連接，稍後重試加入遊戲房間')
      // 延遲重試
      setTimeout(() => {
        if (this.socket?.connected) {
          this.socket.emit(SOCKET_EVENTS.JOIN_GAME, { gameId })
          this.gameId = gameId
          console.log(`✅ 加入遊戲房間: ${gameId}`)
        }
      }, 1000)
      this.gameId = gameId  // 先記錄，等連接後會自動加入
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
    this.addListener(SOCKET_EVENTS.PHASE_CHANGE, callback)
  }

  // 監聽投標提交
  onBidSubmitted(callback: (data: any) => void): void {
    this.addListener(SOCKET_EVENTS.BID_SUBMITTED, callback)
  }

  // 監聽結算完成
  onSettlementComplete(callback: (data: any) => void): void {
    this.addListener(SOCKET_EVENTS.SETTLEMENT_COMPLETE, callback)
  }

  // 監聯遊戲更新
  onGameUpdate(callback: (data: any) => void): void {
    this.addListener(SOCKET_EVENTS.GAME_UPDATE, callback)
  }

  // 監聽錯誤
  onError(callback: (data: any) => void): void {
    this.addListener(SOCKET_EVENTS.ERROR, callback)
  }

  // 移除事件監聽
  off(event: string, callback?: any): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }

    // 從已註冊列表中移除
    if (callback) {
      this.registeredListeners = this.registeredListeners.filter(
        l => !(l.event === event && l.callback === callback)
      )
    } else {
      this.registeredListeners = this.registeredListeners.filter(l => l.event !== event)
    }

    // 從待處理列表中移除
    if (callback) {
      this.pendingListeners = this.pendingListeners.filter(
        l => !(l.event === event && l.callback === callback)
      )
    } else {
      this.pendingListeners = this.pendingListeners.filter(l => l.event !== event)
    }
  }

  // 移除所有監聽
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners()
    }
    this.registeredListeners = []
    this.pendingListeners = []
  }

  // 獲取連接狀態
  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

// 單例模式
export const wsClient = new WebSocketClient()
