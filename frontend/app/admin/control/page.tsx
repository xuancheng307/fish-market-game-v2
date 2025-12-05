'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Tag, Space, Statistic, Row, Col, message, Modal, Descriptions, Alert, Table, Form, InputNumber } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  RightCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { getErrorMessage } from '@/lib/utils'
import { DAY_STATUS, STATUS_DISPLAY_TEXT } from '@/lib/constants'
import type { Game, GameDay, Team, Bid, DailyResult } from '@/lib/types'

export default function GameControlPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [gameDay, setGameDay] = useState<GameDay | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [allBids, setAllBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [settlementModalVisible, setSettlementModalVisible] = useState(false)
  const [settlementResults, setSettlementResults] = useState<DailyResult[]>([])
  const [settlementDay, setSettlementDay] = useState<number>(0)
  const [settlementPriceStats, setSettlementPriceStats] = useState<{
    buy: { fishA: { highestPrice: number | null; lowestPrice: number | null }; fishB: { highestPrice: number | null; lowestPrice: number | null } } | null
    sell: { fishA: { highestPrice: number | null; lowestPrice: number | null }; fishB: { highestPrice: number | null; lowestPrice: number | null } } | null
  }>({ buy: null, sell: null })

  // 供給量/資金池輸入 Modal 狀態
  const [supplyModalVisible, setSupplyModalVisible] = useState(false)
  const [budgetModalVisible, setBudgetModalVisible] = useState(false)
  const [supplyForm] = Form.useForm()
  const [budgetForm] = Form.useForm()

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)

        // 載入當天資訊
        const dayResponse = await api.getCurrentGameDay(gameResponse.data.id)
        setGameDay(dayResponse.data || null)

        // 載入所有團隊
        const teamsResponse = await api.getAllTeams(gameResponse.data.id)
        setTeams(teamsResponse.data || [])

        // 載入當前天數的所有投標記錄
        const bidsResponse = await api.getAllBids(gameResponse.data.id, gameResponse.data.currentDay)
        setAllBids(bidsResponse.data || [])
      } else {
        setGame(null)
        setGameDay(null)
        setTeams([])
        setAllBids([])
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

  // 處理結算完成事件
  const handleSettlementComplete = async () => {
    if (!game) return

    try {
      // 載入所有團隊的結算結果
      const response = await api.getDailyResults(game.id, game.currentDay)
      const results = response.data || []

      if (results.length > 0) {
        setSettlementResults(results.sort((a, b) => b.roi - a.roi))
        setSettlementDay(game.currentDay)
        setSettlementModalVisible(true)
      }

      // 重新載入所有資料
      await loadGameData()
    } catch (error) {
      console.error('載入結算結果失敗:', error)
      await loadGameData()
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

    wsClient.onBidSubmitted(() => {
      loadGameData()
    })

    wsClient.onSettlementComplete(() => {
      handleSettlementComplete()
    })

    return () => {
      wsClient.off('phaseChange')
      wsClient.off('gameUpdate')
      wsClient.off('bidSubmitted')
      wsClient.off('settlementComplete')
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

    // 如果是開始買入/賣出，先顯示 Modal
    if (action === 'startBuying') {
      // 設定預設值從遊戲參數
      supplyForm.setFieldsValue({
        fishASupply: game.defaultFishASupply || 100,
        fishBSupply: game.defaultFishBSupply || 100,
      })
      setSupplyModalVisible(true)
      return
    }

    if (action === 'startSelling') {
      // 設定預設值從遊戲參數
      budgetForm.setFieldsValue({
        fishARestaurantBudget: game.defaultFishARestaurantBudget || 50000,
        fishBRestaurantBudget: game.defaultFishBRestaurantBudget || 50000,
      })
      setBudgetModalVisible(true)
      return
    }

    setActionLoading(true)
    try {
      switch (action) {
        case 'closeBuying': {
          const response = await api.closeBuying(game.id)
          // 儲存買入結算價格統計
          if (response.data?.settlementResults) {
            const results = response.data.settlementResults
            setSettlementPriceStats(prev => ({
              ...prev,
              buy: {
                fishA: { highestPrice: results.fishA?.highestPrice ?? null, lowestPrice: results.fishA?.lowestPrice ?? null },
                fishB: { highestPrice: results.fishB?.highestPrice ?? null, lowestPrice: results.fishB?.lowestPrice ?? null }
              }
            }))
          }
          message.success('已關閉買入投標')
          break
        }
        case 'closeSelling': {
          const response = await api.closeSelling(game.id)
          // 儲存賣出結算價格統計
          if (response.data?.settlementResults) {
            const results = response.data.settlementResults
            setSettlementPriceStats(prev => ({
              ...prev,
              sell: {
                fishA: { highestPrice: results.fishA?.highestPrice ?? null, lowestPrice: results.fishA?.lowestPrice ?? null },
                fishB: { highestPrice: results.fishB?.highestPrice ?? null, lowestPrice: results.fishB?.lowestPrice ?? null }
              }
            }))
          }
          message.success('已關閉賣出投標')
          break
        }
        case 'settle':
          await api.settleDay(game.id)
          message.success('當日結算完成')
          break
        case 'nextDay':
          await api.nextDay(game.id)
          // 進入下一天時，清除價格統計
          setSettlementPriceStats({ buy: null, sell: null })
          message.success('已進入下一天')
          break
      }

      await loadGameData()
    } catch (error: any) {
      message.error(getErrorMessage(error, '操作失敗'))
    } finally {
      setActionLoading(false)
    }
  }

  // 確認開始買入投標
  const handleConfirmStartBuying = async () => {
    if (!game) return

    try {
      const values = await supplyForm.validateFields()
      setActionLoading(true)
      setSupplyModalVisible(false)

      await api.startBuying(game.id, {
        fishASupply: values.fishASupply,
        fishBSupply: values.fishBSupply,
      })
      message.success('已開始買入投標階段')
      await loadGameData()
    } catch (error: any) {
      message.error(getErrorMessage(error, '操作失敗'))
    } finally {
      setActionLoading(false)
    }
  }

  // 確認開始賣出投標
  const handleConfirmStartSelling = async () => {
    if (!game) return

    try {
      const values = await budgetForm.validateFields()
      setActionLoading(true)
      setBudgetModalVisible(false)

      await api.startSelling(game.id, {
        fishARestaurantBudget: values.fishARestaurantBudget,
        fishBRestaurantBudget: values.fishBRestaurantBudget,
      })
      message.success('已開始賣出投標階段')
      await loadGameData()
    } catch (error: any) {
      message.error(getErrorMessage(error, '操作失敗'))
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
          message.error(getErrorMessage(error, '操作失敗'))
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
          message.error(getErrorMessage(error, '操作失敗'))
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

  // 計算投標進度
  const getBiddingProgress = () => {
    if (!gameDay || !teams.length) return null

    // 只在買入或賣出階段顯示進度
    const isBiddingPhase = gameDay.status === DAY_STATUS.BUYING_OPEN || gameDay.status === DAY_STATUS.SELLING_OPEN
    if (!isBiddingPhase) return null

    const currentPhase = gameDay.status === DAY_STATUS.BUYING_OPEN ? 'buy' : 'sell'

    // 篩選出當前階段的投標
    const currentPhaseBids = allBids.filter(bid => bid.bidType === currentPhase)

    // 獲取已投標的團隊 ID
    const teamsBidded = new Set(currentPhaseBids.map(bid => bid.teamId))

    // 分類團隊
    const biddedTeams = teams.filter(team => teamsBidded.has(team.id))
    const notBiddedTeams = teams.filter(team => !teamsBidded.has(team.id))

    return {
      phase: currentPhase,
      phaseName: currentPhase === 'buy' ? '買入' : '賣出',
      total: teams.length,
      bidded: biddedTeams.length,
      biddedTeams,
      notBiddedTeams,
      progress: Math.round((biddedTeams.length / teams.length) * 100)
    }
  }

  // 處理投標資料：同一隊放同一排
  const getTeamBidsSummary = (bidType: 'buy' | 'sell') => {
    const filteredBids = allBids.filter(bid => bid.bidType === bidType)

    // 按團隊分組
    const teamBidsMap = new Map<number, {
      teamNumber: number
      teamName: string
      fishABids: Array<{ price: number; quantity: number }>
      fishBBids: Array<{ price: number; quantity: number }>
      latestTime: string
    }>()

    for (const bid of filteredBids) {
      const team = teams.find(t => t.id === bid.teamId)
      if (!team) continue

      if (!teamBidsMap.has(bid.teamId)) {
        teamBidsMap.set(bid.teamId, {
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          fishABids: [],
          fishBBids: [],
          latestTime: bid.createdAt
        })
      }

      const teamData = teamBidsMap.get(bid.teamId)!
      if (bid.fishType === 'A') {
        teamData.fishABids.push({ price: bid.price, quantity: bid.quantitySubmitted })
      } else {
        teamData.fishBBids.push({ price: bid.price, quantity: bid.quantitySubmitted })
      }

      // 更新最新時間
      if (new Date(bid.createdAt) > new Date(teamData.latestTime)) {
        teamData.latestTime = bid.createdAt
      }
    }

    // 轉換為陣列並按團隊編號排序
    return Array.from(teamBidsMap.values()).sort((a, b) => a.teamNumber - b.teamNumber)
  }

  // 計算成交價格統計
  const getPriceStats = (bidType: 'buy' | 'sell') => {
    const filteredBids = allBids.filter(bid => bid.bidType === bidType && (bid.quantityFulfilled ?? 0) > 0)

    if (filteredBids.length === 0) return null

    const prices = filteredBids.map(bid => bid.price)
    const highestPrice = Math.max(...prices)
    const lowestPrice = Math.min(...prices)

    // 計算成交額
    const fishABids = filteredBids.filter(b => b.fishType === 'A')
    const fishBBids = filteredBids.filter(b => b.fishType === 'B')

    const fishAVolume = fishABids.reduce((sum, b) => sum + (b.quantityFulfilled ?? 0), 0)
    const fishBVolume = fishBBids.reduce((sum, b) => sum + (b.quantityFulfilled ?? 0), 0)
    const fishATotal = fishABids.reduce((sum, b) => sum + (b.price * (b.quantityFulfilled ?? 0)), 0)
    const fishBTotal = fishBBids.reduce((sum, b) => sum + (b.price * (b.quantityFulfilled ?? 0)), 0)

    return {
      highestPrice,
      lowestPrice,
      fishAVolume,
      fishBVolume,
      fishATotal,
      fishBTotal,
      totalVolume: fishAVolume + fishBVolume,
      totalAmount: fishATotal + fishBTotal
    }
  }

  const biddingProgress = getBiddingProgress()

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

        {/* 投標進度卡片 */}
        {biddingProgress && (
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <TeamOutlined />
                  {biddingProgress.phaseName}投標進度
                </Space>
              }
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="已投標團隊"
                    value={biddingProgress.bidded}
                    suffix={`/ ${biddingProgress.total}`}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="未投標團隊"
                    value={biddingProgress.notBiddedTeams.length}
                    suffix="隊"
                    valueStyle={{ color: biddingProgress.notBiddedTeams.length > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="投標完成率"
                    value={biddingProgress.progress}
                    suffix="%"
                    valueStyle={{ color: biddingProgress.progress === 100 ? '#3f8600' : '#faad14' }}
                  />
                </Col>
              </Row>

              {biddingProgress.notBiddedTeams.length > 0 && (
                <Alert
                  message="尚未投標的團隊"
                  description={
                    <Space wrap>
                      {biddingProgress.notBiddedTeams.map(team => (
                        <Tag key={team.id} color="red">
                          {team.teamName}
                        </Tag>
                      ))}
                    </Space>
                  }
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              {biddingProgress.biddedTeams.length > 0 && (
                <Alert
                  message="已投標的團隊"
                  description={
                    <Space wrap>
                      {biddingProgress.biddedTeams.map(team => (
                        <Tag key={team.id} color="green">
                          {team.teamName}
                        </Tag>
                      ))}
                    </Space>
                  }
                  type="success"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}

              {/* 團隊投標摘要表格 */}
              {biddingProgress.bidded > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ marginBottom: 12 }}>投標詳情</h4>
                  <Table
                    dataSource={getTeamBidsSummary(biddingProgress.phase as 'buy' | 'sell')}
                    rowKey="teamNumber"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: '團隊',
                        dataIndex: 'teamNumber',
                        key: 'teamNumber',
                        width: 80,
                        render: (num: number) => `第 ${num} 組`,
                      },
                      {
                        title: 'A魚 價格1',
                        key: 'fishAPrice1',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishABids[0] ? `$${record.fishABids[0].price}` : '-',
                      },
                      {
                        title: 'A魚 數量1',
                        key: 'fishAQty1',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishABids[0] ? `${record.fishABids[0].quantity}kg` : '-',
                      },
                      {
                        title: 'A魚 價格2',
                        key: 'fishAPrice2',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishABids[1] ? `$${record.fishABids[1].price}` : '-',
                      },
                      {
                        title: 'A魚 數量2',
                        key: 'fishAQty2',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishABids[1] ? `${record.fishABids[1].quantity}kg` : '-',
                      },
                      {
                        title: 'B魚 價格1',
                        key: 'fishBPrice1',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishBBids[0] ? `$${record.fishBBids[0].price}` : '-',
                      },
                      {
                        title: 'B魚 數量1',
                        key: 'fishBQty1',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishBBids[0] ? `${record.fishBBids[0].quantity}kg` : '-',
                      },
                      {
                        title: 'B魚 價格2',
                        key: 'fishBPrice2',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishBBids[1] ? `$${record.fishBBids[1].price}` : '-',
                      },
                      {
                        title: 'B魚 數量2',
                        key: 'fishBQty2',
                        width: 90,
                        render: (_: any, record: any) =>
                          record.fishBBids[1] ? `${record.fishBBids[1].quantity}kg` : '-',
                      },
                      {
                        title: '提交時間',
                        key: 'latestTime',
                        width: 100,
                        render: (_: any, record: any) =>
                          new Date(record.latestTime).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }),
                      },
                    ]}
                  />
                </div>
              )}
            </Card>
          </Col>
        )}

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

      {/* 買入階段供給量設定 Modal */}
      <Modal
        title="設定今日魚貨供給量"
        open={supplyModalVisible}
        onCancel={() => setSupplyModalVisible(false)}
        onOk={handleConfirmStartBuying}
        confirmLoading={actionLoading}
        okText="開始買入投標"
        cancelText="取消"
      >
        <Alert
          message="請設定今日的魚貨供給量"
          description="團隊將根據此供給量進行買入投標競價"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={supplyForm} layout="vertical">
          <Form.Item
            label="A級魚供給量"
            name="fishASupply"
            rules={[{ required: true, message: '請輸入A級魚供給量' }]}
          >
            <InputNumber
              min={0}
              max={10000}
              step={10}
              style={{ width: '100%' }}
              addonAfter="公斤"
            />
          </Form.Item>
          <Form.Item
            label="B級魚供給量"
            name="fishBSupply"
            rules={[{ required: true, message: '請輸入B級魚供給量' }]}
          >
            <InputNumber
              min={0}
              max={10000}
              step={10}
              style={{ width: '100%' }}
              addonAfter="公斤"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 賣出階段餐廳資金池設定 Modal */}
      <Modal
        title="設定餐廳收購資金池"
        open={budgetModalVisible}
        onCancel={() => setBudgetModalVisible(false)}
        onOk={handleConfirmStartSelling}
        confirmLoading={actionLoading}
        okText="開始賣出投標"
        cancelText="取消"
      >
        <Alert
          message="請設定今日的餐廳收購資金池"
          description="餐廳將使用此資金從低價開始收購團隊的魚貨"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={budgetForm} layout="vertical">
          <Form.Item
            label="A級魚餐廳資金"
            name="fishARestaurantBudget"
            rules={[{ required: true, message: '請輸入A級魚餐廳資金' }]}
          >
            <InputNumber
              min={0}
              step={10000}
              style={{ width: '100%' }}
              addonBefore="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as unknown as 0}
            />
          </Form.Item>
          <Form.Item
            label="B級魚餐廳資金"
            name="fishBRestaurantBudget"
            rules={[{ required: true, message: '請輸入B級魚餐廳資金' }]}
          >
            <InputNumber
              min={0}
              step={10000}
              style={{ width: '100%' }}
              addonBefore="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as unknown as 0}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 結算結果彈窗 */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>第 {settlementDay} 天結算結果</span>
          </Space>
        }
        open={settlementModalVisible}
        onCancel={() => setSettlementModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSettlementModalVisible(false)}>
            確定
          </Button>
        ]}
        width={1200}
      >
        <Alert
          message="結算完成"
          description={`第 ${settlementDay} 天的結算已完成，以下是所有團隊的結果排名。`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* 成交價格統計 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Card size="small" title="買入成交價格">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="A魚最高成交價"
                    value={settlementPriceStats.buy?.fishA?.highestPrice ?? '-'}
                    prefix={settlementPriceStats.buy?.fishA?.highestPrice != null ? '$' : ''}
                    valueStyle={{ color: '#cf1322', fontSize: 18 }}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    最低: {settlementPriceStats.buy?.fishA?.lowestPrice != null ? `$${settlementPriceStats.buy?.fishA?.lowestPrice}` : '-'}
                  </div>
                </Col>
                <Col span={12}>
                  <Statistic
                    title="B魚最高成交價"
                    value={settlementPriceStats.buy?.fishB?.highestPrice ?? '-'}
                    prefix={settlementPriceStats.buy?.fishB?.highestPrice != null ? '$' : ''}
                    valueStyle={{ color: '#cf1322', fontSize: 18 }}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    最低: {settlementPriceStats.buy?.fishB?.lowestPrice != null ? `$${settlementPriceStats.buy?.fishB?.lowestPrice}` : '-'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="賣出成交價格">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="A魚最高成交價"
                    value={settlementPriceStats.sell?.fishA?.highestPrice ?? '-'}
                    prefix={settlementPriceStats.sell?.fishA?.highestPrice != null ? '$' : ''}
                    valueStyle={{ color: '#3f8600', fontSize: 18 }}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    最低: {settlementPriceStats.sell?.fishA?.lowestPrice != null ? `$${settlementPriceStats.sell?.fishA?.lowestPrice}` : '-'}
                  </div>
                </Col>
                <Col span={12}>
                  <Statistic
                    title="B魚最高成交價"
                    value={settlementPriceStats.sell?.fishB?.highestPrice ?? '-'}
                    prefix={settlementPriceStats.sell?.fishB?.highestPrice != null ? '$' : ''}
                    valueStyle={{ color: '#3f8600', fontSize: 18 }}
                  />
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    最低: {settlementPriceStats.sell?.fishB?.lowestPrice != null ? `$${settlementPriceStats.sell?.fishB?.lowestPrice}` : '-'}
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={settlementResults}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1400 }}
          columns={[
            {
              title: '排名',
              key: 'rank',
              width: 80,
              fixed: 'left',
              render: (_: any, record: DailyResult, index: number) => {
                const icons = [
                  <TrophyOutlined key="gold" style={{ color: '#FFD700', fontSize: 24 }} />,
                  <TrophyOutlined key="silver" style={{ color: '#C0C0C0', fontSize: 22 }} />,
                  <TrophyOutlined key="bronze" style={{ color: '#CD7F32', fontSize: 20 }} />,
                ]
                return (
                  <div style={{ textAlign: 'center' }}>
                    {index < 3 ? icons[index] : <span style={{ fontSize: 18 }}>{index + 1}</span>}
                  </div>
                )
              },
            },
            {
              title: '團隊',
              dataIndex: 'teamNumber',
              key: 'teamNumber',
              width: 100,
              fixed: 'left',
              render: (num: number) => <strong>第 {num} 隊</strong>,
            },
            {
              title: 'ROI',
              dataIndex: 'roi',
              key: 'roi',
              width: 120,
              render: (roi: number) => (
                <Tag color={roi > 0 ? 'success' : roi < 0 ? 'error' : 'default'} style={{ fontSize: 14 }}>
                  {roi > 0 ? <RiseOutlined /> : roi < 0 ? <FallOutlined /> : null}
                  {' '}{(roi * 100).toFixed(2)}%
                </Tag>
              ),
            },
            {
              title: '累積收益',
              dataIndex: 'cumulativeProfit',
              key: 'cumulativeProfit',
              width: 130,
              render: (profit: number) => (
                <span style={{
                  color: profit > 0 ? '#52c41a' : profit < 0 ? '#ff4d4f' : '#000',
                  fontWeight: 'bold',
                  fontSize: 14
                }}>
                  ${profit.toLocaleString()}
                </span>
              ),
            },
            {
              title: '當日收益',
              dataIndex: 'dailyProfit',
              key: 'dailyProfit',
              width: 120,
              render: (profit: number) => (
                <span style={{ color: profit > 0 ? '#52c41a' : profit < 0 ? '#ff4d4f' : '#000' }}>
                  ${profit.toLocaleString()}
                </span>
              ),
            },
            {
              title: '期末現金',
              dataIndex: 'dayEndCash',
              key: 'dayEndCash',
              width: 120,
              render: (cash: number) => `$${cash.toLocaleString()}`,
            },
            {
              title: '買入A',
              dataIndex: 'fishAPurchased',
              key: 'fishAPurchased',
              width: 90,
              render: (qty: number) => `${qty} kg`,
            },
            {
              title: '賣出A',
              dataIndex: 'fishASold',
              key: 'fishASold',
              width: 90,
              render: (qty: number) => `${qty} kg`,
            },
            {
              title: '買入B',
              dataIndex: 'fishBPurchased',
              key: 'fishBPurchased',
              width: 90,
              render: (qty: number) => `${qty} kg`,
            },
            {
              title: '賣出B',
              dataIndex: 'fishBSold',
              key: 'fishBSold',
              width: 90,
              render: (qty: number) => `${qty} kg`,
            },
            {
              title: '總收入',
              dataIndex: 'totalRevenue',
              key: 'totalRevenue',
              width: 110,
              render: (revenue: number) => `$${revenue.toLocaleString()}`,
            },
            {
              title: '總成本',
              dataIndex: 'totalCost',
              key: 'totalCost',
              width: 110,
              render: (cost: number) => `$${cost.toLocaleString()}`,
            },
            {
              title: '滯銷罰金',
              dataIndex: 'unsoldPenalty',
              key: 'unsoldPenalty',
              width: 110,
              render: (penalty: number) => penalty > 0 ? (
                <span style={{ color: '#ff4d4f' }}>-${penalty.toLocaleString()}</span>
              ) : '-',
            },
            {
              title: '貸款利息',
              dataIndex: 'loanInterest',
              key: 'loanInterest',
              width: 110,
              render: (interest: number) => interest > 0 ? (
                <span style={{ color: '#ff4d4f' }}>-${interest.toLocaleString()}</span>
              ) : '-',
            },
          ]}
        />
      </Modal>
    </div>
  )
}
