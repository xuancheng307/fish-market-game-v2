'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Tag, Space, Statistic, Row, Col, message, Modal, Descriptions, Alert } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  RightCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { DAY_STATUS, STATUS_DISPLAY_TEXT } from '@/lib/constants'
import type { Game, GameDay, Team } from '@/lib/types'

export default function GameControlPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [gameDay, setGameDay] = useState<GameDay | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)

        // 載入當天資訊
        const dayResponse = await api.getCurrentGameDay(gameResponse.data.id)
        setGameDay(dayResponse.data)

        // 載入所有團隊
        const teamsResponse = await api.getAllTeams(gameResponse.data.id)
        setTeams(teamsResponse.data || [])
      } else {
        setGame(null)
        setGameDay(null)
        setTeams([])
      }
    } catch (error: any) {
      if (error?.error?.includes('沒有進行中的遊戲')) {
        message.info('目前沒有進行中的遊戲，請先創建遊戲')
        setGame(null)
      } else {
        message.error('載入遊戲資料失敗')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGameData()

    // 監聽 WebSocket 更新
    wsClient.onPhaseChange((data) => {
      message.info(`階段已變更：${STATUS_DISPLAY_TEXT[data.status] || data.status}`)
      loadGameData()
    })

    wsClient.onGameUpdate((data) => {
      loadGameData()
    })

    return () => {
      wsClient.off('phaseChange')
      wsClient.off('gameUpdate')
    }
  }, [])

  useEffect(() => {
    if (game?.id) {
      wsClient.joinGame(game.id)
    }
  }, [game?.id])

  // 執行階段操作
  const handlePhaseAction = async (action: string) => {
    if (!game) return

    setActionLoading(true)
    try {
      let response
      switch (action) {
        case 'startBuying':
          response = await api.startBuying(game.id)
          message.success('已開始買入投標階段')
          break
        case 'closeBuying':
          response = await api.closeBuying(game.id)
          message.success('已關閉買入投標')
          break
        case 'startSelling':
          response = await api.startSelling(game.id)
          message.success('已開始賣出投標階段')
          break
        case 'closeSelling':
          response = await api.closeSelling(game.id)
          message.success('已關閉賣出投標')
          break
        case 'settle':
          response = await api.settleDay(game.id)
          message.success('當日結算完成')
          break
        case 'nextDay':
          response = await api.nextDay(game.id)
          message.success('已進入下一天')
          break
      }

      await loadGameData()
    } catch (error: any) {
      message.error(error?.message || error?.error || '操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // 暫停/恢復遊戲
  const handlePauseResume = async () => {
    if (!game) return

    Modal.confirm({
      title: game.status === 'active' ? '暫停遊戲' : '恢復遊戲',
      content: game.status === 'active' ? '確定要暫停遊戲嗎？' : '確定要恢復遊戲嗎？',
      onOk: async () => {
        try {
          await api.updateGameStatus(game.id, game.status === 'active' ? 'paused' : 'active')
          message.success(game.status === 'active' ? '遊戲已暫停' : '遊戲已恢復')
          await loadGameData()
        } catch (error: any) {
          message.error(error?.message || '操作失敗')
        }
      }
    })
  }

  // 強制結束遊戲
  const handleForceEnd = () => {
    if (!game) return

    Modal.confirm({
      title: '強制結束遊戲',
      content: '確定要強制結束遊戲嗎？此操作不可逆！',
      okText: '確定結束',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.updateGameStatus(game.id, 'force_ended')
          message.success('遊戲已強制結束')
          await loadGameData()
        } catch (error: any) {
          message.error(error?.message || '操作失敗')
        }
      }
    })
  }

  // 獲取狀態標籤顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case DAY_STATUS.BUYING_OPEN:
      case DAY_STATUS.SELLING_OPEN:
        return 'processing'
      case DAY_STATUS.SETTLED:
        return 'success'
      case DAY_STATUS.BUYING_CLOSED:
      case DAY_STATUS.SELLING_CLOSED:
        return 'warning'
      default:
        return 'default'
    }
  }

  // 獲取可用操作按鈕
  const getAvailableActions = () => {
    if (!gameDay) return []

    const actionsMap: Record<string, { label: string; action: string; icon: any }> = {
      [DAY_STATUS.PENDING]: { label: '開始買入投標', action: 'startBuying', icon: <PlayCircleOutlined /> },
      [DAY_STATUS.BUYING_OPEN]: { label: '關閉買入投標', action: 'closeBuying', icon: <PauseCircleOutlined /> },
      [DAY_STATUS.BUYING_CLOSED]: { label: '開始賣出投標', action: 'startSelling', icon: <PlayCircleOutlined /> },
      [DAY_STATUS.SELLING_OPEN]: { label: '關閉賣出投標', action: 'closeSelling', icon: <PauseCircleOutlined /> },
      [DAY_STATUS.SELLING_CLOSED]: { label: '執行結算', action: 'settle', icon: <DollarOutlined /> },
      [DAY_STATUS.SETTLED]: { label: '進入次日', action: 'nextDay', icon: <RightCircleOutlined /> },
    }

    return actionsMap[gameDay.status] ? [actionsMap[gameDay.status]] : []
  }

  if (loading) {
    return <div>載入中...</div>
  }

  if (!game) {
    return (
      <Card>
        <Alert
          message="沒有進行中的遊戲"
          description="請先到「創建遊戲」頁面建立新遊戲"
          type="info"
          showIcon
        />
      </Card>
    )
  }

  const availableActions = getAvailableActions()

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 遊戲資訊卡片 */}
        <Col xs={24} lg={16}>
          <Card title="遊戲資訊" extra={
            <Tag color={game.status === 'active' ? 'green' : 'red'}>
              {game.status === 'active' ? '進行中' : game.status === 'paused' ? '已暫停' : '已結束'}
            </Tag>
          }>
            <Descriptions column={2}>
              <Descriptions.Item label="遊戲名稱">{game.gameName}</Descriptions.Item>
              <Descriptions.Item label="當前天數">
                第 {game.currentDay} / {game.totalDays} 天
              </Descriptions.Item>
              <Descriptions.Item label="參與團隊">{teams.length} 隊</Descriptions.Item>
              <Descriptions.Item label="初始預算">${game.initialBudget.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="貸款利率">{(game.loanInterestRate * 100).toFixed(1)}%</Descriptions.Item>
              <Descriptions.Item label="最大借貸倍數">{game.maxLoanRatio}x</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 統計數據卡片 */}
        <Col xs={24} lg={8}>
          <Card>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="參與團隊"
                  value={teams.length}
                  prefix={<TeamOutlined />}
                  suffix="隊"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="遊戲進度"
                  value={Math.round((game.currentDay / game.totalDays) * 100)}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 當前階段卡片 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                當前階段
              </Space>
            }
          >
            {gameDay && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <Tag color={getStatusColor(gameDay.status)} style={{ fontSize: 16, padding: '8px 16px' }}>
                    {STATUS_DISPLAY_TEXT[gameDay.status] || gameDay.status}
                  </Tag>
                </div>

                <Space size="middle">
                  {availableActions.map((action) => (
                    <Button
                      key={action.action}
                      type="primary"
                      size="large"
                      icon={action.icon}
                      loading={actionLoading}
                      onClick={() => handlePhaseAction(action.action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Space>

                {game.status === 'active' && gameDay.status === DAY_STATUS.SETTLED && game.currentDay >= game.totalDays && (
                  <Alert
                    message="遊戲已完成"
                    description="所有天數已執行完畢，可以查看最終結果或強制結束遊戲"
                    type="success"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* 遊戲控制卡片 */}
        <Col xs={24}>
          <Card title="遊戲控制">
            <Space>
              <Button
                icon={game.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={handlePauseResume}
              >
                {game.status === 'active' ? '暫停遊戲' : '恢復遊戲'}
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleForceEnd}
              >
                強制結束遊戲
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
