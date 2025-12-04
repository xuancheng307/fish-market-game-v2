'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Select, Space, Tag, message, Statistic, Row, Col } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import type { Game, Bid } from '@/lib/types'

const { Option } = Select

export default function BidsPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedFishType, setSelectedFishType] = useState<string>('all')
  const [selectedBidType, setSelectedBidType] = useState<string>('all')

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)
        setSelectedDay(gameResponse.data.currentDay)

        // 載入投標記錄
        await loadBids(gameResponse.data.id, gameResponse.data.currentDay)
      }
    } catch (error: any) {
      if (error?.error?.includes('沒有進行中的遊戲')) {
        message.info('目前沒有進行中的遊戲')
        setGame(null)
      } else {
        message.error('載入遊戲資料失敗')
      }
    } finally {
      setLoading(false)
    }
  }

  // 載入投標記錄
  const loadBids = async (gameId: number, dayNumber: number) => {
    try {
      const response = await api.getAllBids(gameId, dayNumber)
      setBids(response.data || [])
    } catch (error) {
      message.error('載入投標記錄失敗')
    }
  }

  useEffect(() => {
    loadGameData()

    // 監聽投標提交
    wsClient.onBidSubmitted(() => {
      if (game && selectedDay) {
        loadBids(game.id, selectedDay)
      }
    })

    // 監聽結算完成
    wsClient.onSettlementComplete(() => {
      if (game && selectedDay) {
        loadBids(game.id, selectedDay)
      }
    })

    return () => {
      wsClient.off('bidSubmitted')
      wsClient.off('settlementComplete')
    }
  }, [])

  useEffect(() => {
    if (game?.id) {
      wsClient.joinGame(game.id)
    }
  }, [game?.id])

  // 當選擇的天數改變時重新載入
  useEffect(() => {
    if (game && selectedDay) {
      loadBids(game.id, selectedDay)
    }
  }, [selectedDay])

  // 過濾投標記錄
  const filteredBids = bids.filter(bid => {
    if (selectedFishType !== 'all' && bid.fishType !== selectedFishType) return false
    if (selectedBidType !== 'all' && bid.bidType !== selectedBidType) return false
    return true
  })

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

  // 表格欄位定義
  const columns = [
    {
      title: '團隊',
      dataIndex: 'teamId',
      key: 'teamId',
      width: 80,
      render: (teamId: number) => `第 ${teamId} 隊`,
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
      render: (price: number) => `$${price.toLocaleString()}`,
      sorter: (a: Bid, b: Bid) => a.price - b.price,
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
      render: (qty: number | null) => qty !== null ? `${qty} kg` : '-',
    },
    {
      title: '總金額',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (cost: number | null) => cost !== null ? `$${cost.toLocaleString()}` : '-',
    },
    {
      title: '狀態',
      key: 'status',
      width: 120,
      render: (record: Bid) => getBidStatusTag(record),
    },
    {
      title: '提交時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-TW'),
    },
  ]

  // 計算統計數據
  const totalBids = filteredBids.length
  const buyBids = filteredBids.filter(b => b.bidType === 'buy').length
  const sellBids = filteredBids.filter(b => b.bidType === 'sell').length
  const fulfilledBids = filteredBids.filter(b => b.status === 'fulfilled').length

  if (!game) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p>目前沒有進行中的遊戲</p>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="總投標數" value={totalBids} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="買入投標" value={buyBids} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="賣出投標" value={sellBids} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="完全成交率"
              value={totalBids > 0 ? Math.round((fulfilledBids / totalBids) * 100) : 0}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="競標結果"
        extra={
          <Space>
            <span>天數：</span>
            <Select
              value={selectedDay}
              style={{ width: 120 }}
              onChange={setSelectedDay}
            >
              {Array.from({ length: game.currentDay }, (_, i) => i + 1).map(day => (
                <Option key={day} value={day}>第 {day} 天</Option>
              ))}
            </Select>

            <span>魚種：</span>
            <Select
              value={selectedFishType}
              style={{ width: 120 }}
              onChange={setSelectedFishType}
            >
              <Option value="all">全部</Option>
              <Option value="A">A級魚</Option>
              <Option value="B">B級魚</Option>
            </Select>

            <span>類型：</span>
            <Select
              value={selectedBidType}
              style={{ width: 120 }}
              onChange={setSelectedBidType}
            >
              <Option value="all">全部</Option>
              <Option value="buy">買入</Option>
              <Option value="sell">賣出</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredBids}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 筆投標記錄`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}
