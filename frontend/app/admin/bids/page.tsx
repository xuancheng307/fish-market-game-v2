'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, Table, Select, Radio, Space, Typography, message, Row, Col, Statistic, Empty } from 'antd'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import type { Game, GameDay, Bid } from '@/lib/types'

const { Title, Text } = Typography
const { Option } = Select

// 團隊投標摘要介面
interface TeamBidSummary {
  teamNumber: number
  teamName: string
  bids: { price: number; quantity: number; fulfilled: number }[]  // 每筆投標獨立記錄成交量
  totalFulfilled: number  // 總成交量（用於統計）
  latestTime: string
}

// 價格統計介面
interface PriceStats {
  highestPrice: number | null
  lowestPrice: number | null
  totalVolume: number
  totalAmount: number
}

export default function BidsPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [currentDay, setCurrentDay] = useState<GameDay | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [selectedBidType, setSelectedBidType] = useState<'buy' | 'sell'>('buy')

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        const gameData = gameResponse.data
        setGame(gameData)
        setSelectedDay(gameData.currentDay)

        // 獲取當前 game day 的狀態
        try {
          const dayResponse = await api.getCurrentGameDay(gameData.id)
          if (dayResponse.data) {
            setCurrentDay(dayResponse.data)
            // 根據當前狀態設定預設的投標類型
            // buying_open, buying_closed → 買入
            // selling_open, selling_closed, settled → 賣出
            const dayStatus = dayResponse.data.status
            if (['selling_open', 'selling_closed', 'settled'].includes(dayStatus)) {
              setSelectedBidType('sell')
            } else {
              setSelectedBidType('buy')
            }
          }
        } catch (e) {
          // 如果獲取失敗，預設使用買入
          setSelectedBidType('buy')
        }

        // 載入投標記錄
        await loadBids(gameData.id, gameData.currentDay)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 監聽 WebSocket 事件
  useEffect(() => {
    const handleBidSubmitted = () => {
      if (game && selectedDay) {
        loadBids(game.id, selectedDay)
      }
    }

    const handleSettlementComplete = () => {
      if (game && selectedDay) {
        loadBids(game.id, selectedDay)
      }
    }

    wsClient.onBidSubmitted(handleBidSubmitted)
    wsClient.onSettlementComplete(handleSettlementComplete)

    return () => {
      wsClient.off('bidSubmitted')
      wsClient.off('settlementComplete')
    }
  }, [game, selectedDay])

  useEffect(() => {
    if (game?.id) {
      wsClient.joinGame(game.id)
    }
  }, [game?.id])

  // 當選擇的天數改變時重新載入
  useEffect(() => {
    if (game) {
      loadBids(game.id, selectedDay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, selectedDay])

  // 根據選擇的投標類型過濾
  const filteredBids = useMemo(() => {
    return bids.filter(bid => bid.bidType === selectedBidType)
  }, [bids, selectedBidType])

  // 按魚種分組
  const fishABids = useMemo(() => {
    return filteredBids.filter(b => b.fishType === 'A')
  }, [filteredBids])

  const fishBBids = useMemo(() => {
    return filteredBids.filter(b => b.fishType === 'B')
  }, [filteredBids])

  // 按團隊分組（每隊最多 2 筆同魚種投標）
  const groupByTeam = (bidsData: Bid[]): TeamBidSummary[] => {
    const map = new Map<number, TeamBidSummary>()

    for (const bid of bidsData) {
      if (!map.has(bid.teamId)) {
        map.set(bid.teamId, {
          teamNumber: bid.teamNumber,
          teamName: bid.teamName,
          bids: [],
          totalFulfilled: 0,
          latestTime: bid.createdAt
        })
      }

      const team = map.get(bid.teamId)!
      team.bids.push({
        price: bid.price,
        quantity: bid.quantitySubmitted,
        fulfilled: bid.quantityFulfilled || 0
      })
      team.totalFulfilled += (bid.quantityFulfilled || 0)

      if (new Date(bid.createdAt) > new Date(team.latestTime)) {
        team.latestTime = bid.createdAt
      }
    }

    return Array.from(map.values()).sort((a, b) => a.teamNumber - b.teamNumber)
  }

  // 計算價格統計
  const getPriceStats = (bidsData: Bid[]): PriceStats => {
    const fulfilled = bidsData.filter(b => (b.quantityFulfilled || 0) > 0)

    if (fulfilled.length === 0) {
      return {
        highestPrice: null,
        lowestPrice: null,
        totalVolume: 0,
        totalAmount: 0
      }
    }

    return {
      highestPrice: Math.max(...fulfilled.map(b => b.price)),
      lowestPrice: Math.min(...fulfilled.map(b => b.price)),
      totalVolume: fulfilled.reduce((sum, b) => sum + (b.quantityFulfilled || 0), 0),
      totalAmount: fulfilled.reduce((sum, b) => sum + b.price * (b.quantityFulfilled || 0), 0)
    }
  }

  // 團隊分組資料
  const fishATeamData = useMemo(() => groupByTeam(fishABids), [fishABids])
  const fishBTeamData = useMemo(() => groupByTeam(fishBBids), [fishBBids])

  // 價格統計資料
  const fishAStats = useMemo(() => getPriceStats(fishABids), [fishABids])
  const fishBStats = useMemo(() => getPriceStats(fishBBids), [fishBBids])

  // 團隊明細表格欄位
  const teamColumns = [
    {
      title: '組別',
      dataIndex: 'teamNumber',
      key: 'teamNumber',
      width: 80,
      render: (num: number) => `第 ${String(num).padStart(2, '0')} 組`,
    },
    {
      title: '價格1',
      key: 'price1',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[0] ? `$${record.bids[0].price.toLocaleString()}` : '-',
    },
    {
      title: '數量1',
      key: 'quantity1',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[0] ? `${record.bids[0].quantity} kg` : '-',
    },
    {
      title: '成交1',
      key: 'fulfilled1',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[0] ? `${record.bids[0].fulfilled} kg` : '-',
    },
    {
      title: '價格2',
      key: 'price2',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[1] ? `$${record.bids[1].price.toLocaleString()}` : '-',
    },
    {
      title: '數量2',
      key: 'quantity2',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[1] ? `${record.bids[1].quantity} kg` : '-',
    },
    {
      title: '成交2',
      key: 'fulfilled2',
      width: 80,
      render: (record: TeamBidSummary) =>
        record.bids[1] ? `${record.bids[1].fulfilled} kg` : '-',
    },
    {
      title: '總成交',
      dataIndex: 'totalFulfilled',
      key: 'totalFulfilled',
      width: 80,
      render: (qty: number) => qty > 0 ? `${qty} kg` : '-',
    },
    {
      title: '提交時間',
      dataIndex: 'latestTime',
      key: 'latestTime',
      width: 100,
      render: (time: string) => {
        const date = new Date(time)
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
      },
    },
  ]

  // 價格統計卡片元件
  const PriceStatsCard = ({ title, stats, color }: { title: string; stats: PriceStats; color: string }) => (
    <Card
      title={<span style={{ color }}>{title}</span>}
      size="small"
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="最高成交價"
            value={stats.highestPrice !== null ? stats.highestPrice : '-'}
            prefix={stats.highestPrice !== null ? '$' : ''}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="最低成交價"
            value={stats.lowestPrice !== null ? stats.lowestPrice : '-'}
            prefix={stats.lowestPrice !== null ? '$' : ''}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="總成交量"
            value={stats.totalVolume}
            suffix="kg"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="總成交額"
            value={stats.totalAmount}
            prefix="$"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
      </Row>
    </Card>
  )

  if (!game) {
    return (
      <Card>
        <Empty description="目前沒有進行中的遊戲" />
      </Card>
    )
  }

  return (
    <div>
      <Title level={3}>競標結果</Title>

      {/* 篩選控制項 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Space>
            <Text>天數：</Text>
            <Select
              value={selectedDay}
              style={{ width: 120 }}
              onChange={setSelectedDay}
            >
              {Array.from({ length: game.currentDay }, (_, i) => i + 1).map(day => (
                <Option key={day} value={day}>第 {day} 天</Option>
              ))}
            </Select>
          </Space>

          <Space>
            <Text>階段：</Text>
            <Radio.Group
              value={selectedBidType}
              onChange={(e) => setSelectedBidType(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="buy">買入</Radio.Button>
              <Radio.Button value="sell">賣出</Radio.Button>
            </Radio.Group>
          </Space>
        </Space>
      </Card>

      {/* 成交價格統計 */}
      <Title level={5} style={{ marginBottom: 12 }}>成交價格統計</Title>
      <Row gutter={16}>
        <Col span={12}>
          <PriceStatsCard title="A 魚" stats={fishAStats} color="#722ed1" />
        </Col>
        <Col span={12}>
          <PriceStatsCard title="B 魚" stats={fishBStats} color="#fa8c16" />
        </Col>
      </Row>

      {/* A魚投標明細 */}
      <Card
        title={<span style={{ color: '#722ed1' }}>A 魚投標明細</span>}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Table
          columns={teamColumns}
          dataSource={fishATeamData}
          rowKey="teamNumber"
          loading={loading}
          pagination={false}
          size="small"
          locale={{ emptyText: '暫無投標記錄' }}
        />
      </Card>

      {/* B魚投標明細 */}
      <Card
        title={<span style={{ color: '#fa8c16' }}>B 魚投標明細</span>}
        size="small"
      >
        <Table
          columns={teamColumns}
          dataSource={fishBTeamData}
          rowKey="teamNumber"
          loading={loading}
          pagination={false}
          size="small"
          locale={{ emptyText: '暫無投標記錄' }}
        />
      </Card>
    </div>
  )
}
