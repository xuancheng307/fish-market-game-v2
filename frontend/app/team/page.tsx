'use client'

import { useState, useEffect } from 'react'
import { Card, Form, InputNumber, Button, Space, Table, Tag, Alert, Row, Col, Statistic, message, Descriptions, Modal } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { getErrorMessage } from '@/lib/utils'
import { DAY_STATUS, BID_TYPE } from '@/lib/constants'
import type { Game, GameDay, Bid, Team, DailyResult } from '@/lib/types'

export default function TeamHomePage() {
  const [form] = Form.useForm()
  const [game, setGame] = useState<Game | null>(null)
  const [gameDay, setGameDay] = useState<GameDay | null>(null)
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [settlementModalVisible, setSettlementModalVisible] = useState(false)
  const [settlementResult, setSettlementResult] = useState<DailyResult | null>(null)

  // 載入資料
  const loadData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)

        const dayResponse = await api.getCurrentGameDay(gameResponse.data.id)
        setGameDay(dayResponse.data || null)

        // 載入我的團隊資訊（包含庫存）
        const teamResponse = await api.getTeamInfo(gameResponse.data.id)
        setMyTeam(teamResponse.data || null)

        // 載入我的投標記錄
        const bidsResponse = await api.getMyBids(gameResponse.data.id, gameResponse.data.currentDay)
        setMyBids(bidsResponse.data || [])
      }
    } catch (error) {
      message.error('載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  // 處理結算完成事件
  const handleSettlementComplete = async () => {
    if (!game) return

    try {
      // 載入最新的每日結果
      const response = await api.getMyDailyResults(game.id)
      const dailyResults = response.data || []

      // 獲取最新一天的結果（當前天數）
      const latestResult = dailyResults.find(r => r.dayNumber === game.currentDay)

      if (latestResult) {
        setSettlementResult(latestResult)
        setSettlementModalVisible(true)
      }

      // 重新載入所有資料
      await loadData()
    } catch (error) {
      console.error('載入結算結果失敗:', error)
      await loadData()
    }
  }

  useEffect(() => {
    loadData()

    // 監聯 WebSocket 更新
    wsClient.onPhaseChange(() => {
      loadData()
    })

    wsClient.onBidSubmitted(() => {
      loadData()
    })

    wsClient.onSettlementComplete(() => {
      handleSettlementComplete()
    })

    wsClient.onGameUpdate(() => {
      loadData()
    })

    return () => {
      wsClient.off('phaseChange')
      wsClient.off('bidSubmitted')
      wsClient.off('settlementComplete')
      wsClient.off('gameUpdate')
    }
  }, [])

  // ⚠️ 加入遊戲房間以接收廣播
  useEffect(() => {
    if (game?.id) {
      wsClient.joinGame(game.id)
    }
  }, [game?.id])

  // 提交投標（8欄位一次提交，拆分成最多4筆投標）
  const handleSubmitBid = async (values: any) => {
    if (!game || !gameDay) return

    try {
      setSubmitting(true)

      const bidType = canBuy ? BID_TYPE.BUY : BID_TYPE.SELL
      const bids: Array<{ fishType: 'A' | 'B'; price: number; quantity: number }> = []

      // 收集所有有效的投標（價格和數量都有值的）
      if (values.fishAPrice1 && values.fishAQty1) {
        bids.push({ fishType: 'A', price: values.fishAPrice1, quantity: values.fishAQty1 })
      }
      if (values.fishAPrice2 && values.fishAQty2) {
        bids.push({ fishType: 'A', price: values.fishAPrice2, quantity: values.fishAQty2 })
      }
      if (values.fishBPrice1 && values.fishBQty1) {
        bids.push({ fishType: 'B', price: values.fishBPrice1, quantity: values.fishBQty1 })
      }
      if (values.fishBPrice2 && values.fishBQty2) {
        bids.push({ fishType: 'B', price: values.fishBPrice2, quantity: values.fishBQty2 })
      }

      if (bids.length === 0) {
        message.warning('請至少填寫一組投標（價格和數量都需填寫）')
        return
      }

      // 依序提交所有投標
      let successCount = 0
      let errorMessages: string[] = []

      for (const bid of bids) {
        try {
          await api.submitBid({
            gameId: game.id,
            bidType,
            fishType: bid.fishType,
            price: bid.price,
            quantity: bid.quantity,
          })
          successCount++
        } catch (error: any) {
          errorMessages.push(`${bid.fishType}魚 $${bid.price}: ${getErrorMessage(error, '提交失敗')}`)
        }
      }

      if (successCount > 0) {
        message.success(`成功提交 ${successCount} 筆投標！`)
      }
      if (errorMessages.length > 0) {
        message.error(`部分投標失敗：${errorMessages.join('、')}`)
      }

      form.resetFields()
      await loadData()
    } catch (error: any) {
      message.error(getErrorMessage(error, '投標提交失敗'))
    } finally {
      setSubmitting(false)
    }
  }

  // 獲取投標狀態標籤
  const getBidStatusTag = (bid: Bid) => {
    switch (bid.status) {
      case 'fulfilled':
        return <Tag color="success" icon={<CheckCircleOutlined />}>完全成交</Tag>
      case 'partial':
        return <Tag color="warning" icon={<MinusCircleOutlined />}>部分成交</Tag>
      case 'failed':
        return <Tag color="error" icon={<CloseCircleOutlined />}>未成交</Tag>
      default:
        return <Tag color="default">待處理</Tag>
    }
  }

  // 我的投標記錄表格
  const bidColumns = [
    {
      title: '時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (time: string) => new Date(time).toLocaleTimeString('zh-TW'),
    },
    {
      title: '類型',
      dataIndex: 'bidType',
      key: 'bidType',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'blue' : 'green'}>
          {type === 'buy' ? '買入' : '賣出'}
        </Tag>
      ),
    },
    {
      title: '魚種',
      dataIndex: 'fishType',
      key: 'fishType',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'A' ? 'purple' : 'orange'}>
          {type}級魚
        </Tag>
      ),
    },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => `$${price}`,
    },
    {
      title: '投標數量',
      dataIndex: 'quantitySubmitted',
      key: 'quantitySubmitted',
      width: 100,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: '成交數量',
      dataIndex: 'quantityFulfilled',
      key: 'quantityFulfilled',
      width: 100,
      render: (qty: number | null) => (qty !== null ? `${qty} kg` : '-'),
    },
    {
      title: '總金額',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      render: (cost: number | null) => (cost !== null ? `$${cost.toLocaleString()}` : '-'),
    },
    {
      title: '狀態',
      key: 'status',
      width: 120,
      render: (record: Bid) => getBidStatusTag(record),
    },
  ]

  // 判斷當前可以投標的類型（使用 game.phase）
  const canBuy = game?.phase === DAY_STATUS.BUYING_OPEN
  const canSell = game?.phase === DAY_STATUS.SELLING_OPEN
  const canBid = canBuy || canSell

  // 獲取階段提示文字（使用 game.phase）
  const getPhaseMessage = () => {
    if (!game) return null

    switch (game.phase) {
      case DAY_STATUS.PENDING:
        return { type: 'info' as const, message: '等待買入階段開始...' }
      case DAY_STATUS.BUYING_OPEN:
        return { type: 'success' as const, message: '買入投標進行中！請在下方提交買入投標' }
      case DAY_STATUS.BUYING_CLOSED:
        return { type: 'warning' as const, message: '買入階段已結束，等待賣出階段...' }
      case DAY_STATUS.SELLING_OPEN:
        return { type: 'success' as const, message: '賣出投標進行中！請在下方提交賣出投標' }
      case DAY_STATUS.SELLING_CLOSED:
        return { type: 'warning' as const, message: '賣出階段已結束，等待結算...' }
      case DAY_STATUS.SETTLED:
        return { type: 'info' as const, message: '今日結算已完成，等待進入次日...' }
      default:
        return null
    }
  }

  const phaseMessage = getPhaseMessage()

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 階段提示 */}
        {phaseMessage && (
          <Alert
            message={phaseMessage.message}
            type={phaseMessage.type}
            showIcon
            style={{ fontSize: 16 }}
          />
        )}

        {/* 市場參考價格與供貨量 */}
        {game && (
          <Card title={<><InfoCircleOutlined /> 市場資訊</>} size="small">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#f5f0ff' }}>
                  <Descriptions title="A級魚" column={2} size="small">
                    <Descriptions.Item label="今日供貨量">
                      <Tag color="purple">{gameDay?.fishASupply || 0} kg</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="餐廳總預算">
                      ${(gameDay?.fishARestaurantBudget || 0).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="底價（總代理）">${game.distributorFloorPriceA}</Descriptions.Item>
                    <Descriptions.Item label="目標價（預算參考）">${game.targetPriceA}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#fff7e6' }}>
                  <Descriptions title="B級魚" column={2} size="small">
                    <Descriptions.Item label="今日供貨量">
                      <Tag color="orange">{gameDay?.fishBSupply || 0} kg</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="餐廳總預算">
                      ${(gameDay?.fishBRestaurantBudget || 0).toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="底價（總代理）">${game.distributorFloorPriceB}</Descriptions.Item>
                    <Descriptions.Item label="目標價（預算參考）">${game.targetPriceB}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* 庫存提醒（賣出階段顯示） */}
        {canSell && myTeam && (
          <Card title={<><ShoppingCartOutlined /> 當前庫存</>} size="small">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="A級魚庫存"
                  value={myTeam.fishAInventory}
                  suffix="kg"
                  valueStyle={{ color: myTeam.fishAInventory > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="B級魚庫存"
                  value={myTeam.fishBInventory}
                  suffix="kg"
                  valueStyle={{ color: myTeam.fishBInventory > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="當前現金"
                  value={myTeam.cash}
                  prefix="$"
                  valueStyle={{ color: myTeam.cash > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="累積收益"
                  value={myTeam.cumulativeProfit}
                  prefix="$"
                  valueStyle={{ color: myTeam.cumulativeProfit > 0 ? '#3f8600' : myTeam.cumulativeProfit < 0 ? '#cf1322' : '#000' }}
                />
              </Col>
            </Row>
            {(myTeam.fishAInventory === 0 && myTeam.fishBInventory === 0) && (
              <Alert
                message="庫存不足"
                description="您目前沒有任何庫存可以賣出，無需進行賣出投標。"
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        )}

        {/* 投標表單 - 8欄位同時提交 */}
        {canBid && game && (
          <Card
            title={
              <Space>
                <ShoppingCartOutlined />
                {canBuy ? '買入投標' : '賣出投標'}
              </Space>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitBid}
            >
              {/* A級魚區塊 */}
              <Card
                size="small"
                title={<Tag color="purple" style={{ fontSize: 14 }}>A級魚</Tag>}
                style={{ marginBottom: 16, background: '#f5f0ff' }}
              >
                <Row gutter={16}>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標1 - 價格" name="fishAPrice1">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="$/kg"
                        min={0}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標1 - 數量" name="fishAQty1">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="kg"
                        min={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標2 - 價格" name="fishAPrice2">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="$/kg"
                        min={0}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標2 - 數量" name="fishAQty2">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="kg"
                        min={1}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* B級魚區塊 */}
              <Card
                size="small"
                title={<Tag color="orange" style={{ fontSize: 14 }}>B級魚</Tag>}
                style={{ marginBottom: 16, background: '#fff7e6' }}
              >
                <Row gutter={16}>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標1 - 價格" name="fishBPrice1">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="$/kg"
                        min={0}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標1 - 數量" name="fishBQty1">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="kg"
                        min={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標2 - 價格" name="fishBPrice2">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="$/kg"
                        min={0}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Item label="投標2 - 數量" name="fishBQty2">
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder="kg"
                        min={1}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<DollarOutlined />}
                  loading={submitting}
                  block
                >
                  提交所有投標
                </Button>
              </Form.Item>

              <Alert
                message="投標說明"
                description={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>每種魚可以同時提交兩個不同價格的投標</li>
                    <li>只需填寫您要投標的欄位，留空的欄位將被忽略</li>
                    <li>價格和數量必須成對填寫才有效</li>
                    {canBuy && <li style={{ color: '#faad14' }}>買入投標時，現金不足會自動借貸（有利息）</li>}
                    {canSell && myTeam && (
                      <li style={{ color: '#1890ff' }}>
                        當前庫存：A級魚 {myTeam.fishAInventory} kg，B級魚 {myTeam.fishBInventory} kg
                      </li>
                    )}
                  </ul>
                }
                type="info"
                showIcon
              />
            </Form>
          </Card>
        )}

        {/* 我的投標記錄 */}
        <Card title="我的投標記錄">
          <Table
            columns={bidColumns}
            dataSource={myBids}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 筆投標`,
            }}
            scroll={{ x: 900 }}
          />
        </Card>
      </Space>

      {/* 結算結果彈窗 */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>第 {settlementResult?.dayNumber} 天結算結果</span>
          </Space>
        }
        open={settlementModalVisible}
        onCancel={() => setSettlementModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setSettlementModalVisible(false)}>
            確定
          </Button>
        ]}
        width={800}
      >
        {settlementResult && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 核心指標 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card size="small">
                  <Statistic
                    title="ROI"
                    value={(settlementResult.roi * 100).toFixed(2)}
                    suffix="%"
                    prefix={settlementResult.roi > 0 ? <RiseOutlined /> : settlementResult.roi < 0 ? <FallOutlined /> : null}
                    valueStyle={{
                      color: settlementResult.roi > 0 ? '#52c41a' : settlementResult.roi < 0 ? '#ff4d4f' : '#000',
                      fontSize: 32
                    }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small">
                  <Statistic
                    title="累積收益"
                    value={settlementResult.cumulativeProfit}
                    prefix={<DollarOutlined />}
                    valueStyle={{
                      color: settlementResult.cumulativeProfit > 0 ? '#52c41a' : settlementResult.cumulativeProfit < 0 ? '#ff4d4f' : '#000',
                      fontSize: 32
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 詳細數據 */}
            <Card title="本日明細" size="small">
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="當日收益">
                  <span style={{ color: settlementResult.dailyProfit > 0 ? '#52c41a' : settlementResult.dailyProfit < 0 ? '#ff4d4f' : '#000' }}>
                    ${settlementResult.dailyProfit.toLocaleString()}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="期末現金">
                  ${settlementResult.dayEndCash.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="總收入">
                  ${settlementResult.totalRevenue.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="總成本">
                  ${settlementResult.totalCost.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="貸款利息">
                  {settlementResult.loanInterest > 0 ? (
                    <span style={{ color: '#ff4d4f' }}>-${settlementResult.loanInterest.toLocaleString()}</span>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="滯銷罰金">
                  {settlementResult.unsoldPenalty > 0 ? (
                    <span style={{ color: '#ff4d4f' }}>-${settlementResult.unsoldPenalty.toLocaleString()}</span>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 交易數據 */}
            <Card title="交易數據" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="買入A級魚"
                    value={settlementResult.fishAPurchased}
                    suffix="kg"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="賣出A級魚"
                    value={settlementResult.fishASold}
                    suffix="kg"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="買入B級魚"
                    value={settlementResult.fishBPurchased}
                    suffix="kg"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="賣出B級魚"
                    value={settlementResult.fishBSold}
                    suffix="kg"
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Col>
              </Row>

              {(settlementResult.fishAUnsold > 0 || settlementResult.fishBUnsold > 0) && (
                <Alert
                  message="滯銷提醒"
                  description={
                    <div>
                      {settlementResult.fishAUnsold > 0 && <div>A級魚滯銷: {settlementResult.fishAUnsold} kg</div>}
                      {settlementResult.fishBUnsold > 0 && <div>B級魚滯銷: {settlementResult.fishBUnsold} kg</div>}
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>

            {/* 庫存狀況 */}
            <Card title="期末庫存" size="small">
              <Row gutter={16}>
                <Col xs={12}>
                  <Statistic
                    title="A級魚庫存"
                    value={settlementResult.fishAInventory}
                    suffix="kg"
                    valueStyle={{ color: settlementResult.fishAInventory > 0 ? '#722ed1' : '#d9d9d9' }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="B級魚庫存"
                    value={settlementResult.fishBInventory}
                    suffix="kg"
                    valueStyle={{ color: settlementResult.fishBInventory > 0 ? '#fa8c16' : '#d9d9d9' }}
                  />
                </Col>
              </Row>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  )
}
