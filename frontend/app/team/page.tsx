'use client'

import { useState, useEffect } from 'react'
import { Card, Form, InputNumber, Button, Space, Table, Tag, Alert, Row, Col, Statistic, message, Descriptions } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { DAY_STATUS, BID_TYPE, FISH_TYPE } from '@/lib/constants'
import type { Game, GameDay, Bid } from '@/lib/types'

export default function TeamHomePage() {
  const [form] = Form.useForm()
  const [game, setGame] = useState<Game | null>(null)
  const [gameDay, setGameDay] = useState<GameDay | null>(null)
  const [myBids, setMyBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 載入資料
  const loadData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)

        const dayResponse = await api.getCurrentGameDay(gameResponse.data.id)
        setGameDay(dayResponse.data)

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

  useEffect(() => {
    loadData()

    // 監聽 WebSocket 更新
    wsClient.onPhaseChange(() => {
      loadData()
    })

    wsClient.onBidSubmitted(() => {
      loadData()
    })

    wsClient.onSettlementComplete(() => {
      loadData()
    })

    return () => {
      wsClient.off('phaseChange')
      wsClient.off('bidSubmitted')
      wsClient.off('settlementComplete')
    }
  }, [])

  // 提交投標
  const handleSubmitBid = async (values: any) => {
    if (!game || !gameDay) return

    try {
      setSubmitting(true)

      const bidData = {
        gameId: game.id,
        dayNumber: game.currentDay,
        bidType: values.bidType,
        fishType: values.fishType,
        price: values.price,
        quantitySubmitted: values.quantity,
      }

      await api.submitBid(bidData)
      message.success('投標提交成功！')
      form.resetFields()
      await loadData()
    } catch (error: any) {
      message.error(error?.message || error?.error || '投標提交失敗')
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

  // 判斷當前可以投標的類型
  const canBuy = gameDay?.status === DAY_STATUS.BUYING_OPEN
  const canSell = gameDay?.status === DAY_STATUS.SELLING_OPEN
  const canBid = canBuy || canSell

  // 獲取階段提示文字
  const getPhaseMessage = () => {
    if (!gameDay) return null

    switch (gameDay.status) {
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

        {/* 市場參考價格 */}
        {game && (
          <Card title={<><InfoCircleOutlined /> 市場參考價格</>} size="small">
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#f5f0ff' }}>
                  <Descriptions title="A級魚" column={2} size="small">
                    <Descriptions.Item label="底價">${game.fishAFloorPrice}</Descriptions.Item>
                    <Descriptions.Item label="目標價">${game.fishATargetPrice}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" style={{ background: '#fff7e6' }}>
                  <Descriptions title="B級魚" column={2} size="small">
                    <Descriptions.Item label="底價">${game.fishBFloorPrice}</Descriptions.Item>
                    <Descriptions.Item label="目標價">${game.fishBTargetPrice}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </Card>
        )}

        {/* 投標表單 */}
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
              initialValues={{
                bidType: canBuy ? BID_TYPE.BUY : BID_TYPE.SELL,
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="魚種"
                    name="fishType"
                    rules={[{ required: true, message: '請選擇魚種' }]}
                  >
                    <Button.Group style={{ width: '100%' }}>
                      <Button
                        style={{ width: '50%' }}
                        type={form.getFieldValue('fishType') === FISH_TYPE.A ? 'primary' : 'default'}
                        onClick={() => form.setFieldsValue({ fishType: FISH_TYPE.A })}
                      >
                        A級魚
                      </Button>
                      <Button
                        style={{ width: '50%' }}
                        type={form.getFieldValue('fishType') === FISH_TYPE.B ? 'primary' : 'default'}
                        onClick={() => form.setFieldsValue({ fishType: FISH_TYPE.B })}
                      >
                        B級魚
                      </Button>
                    </Button.Group>
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="價格 ($/kg)"
                    name="price"
                    rules={[
                      { required: true, message: '請輸入價格' },
                      { type: 'number', min: 0, message: '價格不能為負' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="輸入價格"
                      min={0}
                      prefix="$"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    label="數量 (kg)"
                    name="quantity"
                    rules={[
                      { required: true, message: '請輸入數量' },
                      { type: 'number', min: 1, message: '數量至少為 1' },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="輸入數量"
                      min={1}
                      suffix="kg"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="bidType" hidden>
                <input />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<DollarOutlined />}
                  loading={submitting}
                  block
                >
                  提交投標
                </Button>
              </Form.Item>

              {canBuy && (
                <Alert
                  message="提示"
                  description="買入投標時，如果現金不足會自動進行借貸。請注意借貸會產生利息！"
                  type="info"
                  showIcon
                />
              )}
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
    </div>
  )
}
