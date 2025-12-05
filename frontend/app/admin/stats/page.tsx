'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Select, Space, message, Tag } from 'antd'
import { TrophyOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import type { Game, DailyResult } from '@/lib/types'

// 動態載入 echarts 避免 SSR 問題
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

const { Option } = Select

export default function StatsPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)
        setSelectedDay(gameResponse.data.currentDay)

        // 載入每日結果
        await loadDailyResults(gameResponse.data.id, gameResponse.data.currentDay)
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

  // 載入每日結果
  const loadDailyResults = async (gameId: number, dayNumber: number) => {
    try {
      const response = await api.getDailyResults(gameId, dayNumber)
      setDailyResults(response.data || [])
    } catch (error) {
      message.error('載入統計數據失敗')
    }
  }

  useEffect(() => {
    loadGameData()

    // 監聽結算完成
    wsClient.onSettlementComplete(() => {
      loadGameData()
    })

    return () => {
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
      loadDailyResults(game.id, selectedDay)
    }
  }, [selectedDay])

  // 表格欄位定義
  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 70,
      render: (_: any, record: DailyResult, index: number) => {
        const icons = [
          <TrophyOutlined key="gold" style={{ color: '#FFD700', fontSize: 20 }} />,
          <TrophyOutlined key="silver" style={{ color: '#C0C0C0', fontSize: 18 }} />,
          <TrophyOutlined key="bronze" style={{ color: '#CD7F32', fontSize: 16 }} />,
        ]
        return index < 3 ? icons[index] : index + 1
      },
    },
    {
      title: '團隊',
      dataIndex: 'teamNumber',
      key: 'teamNumber',
      width: 100,
      render: (num: number) => `第 ${num} 隊`,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 120,
      render: (roi: number) => (
        <Tag color={roi > 0 ? 'success' : roi < 0 ? 'error' : 'default'}>
          {roi > 0 ? <RiseOutlined /> : roi < 0 ? <FallOutlined /> : null}
          {' '}{(roi * 100).toFixed(2)}%
        </Tag>
      ),
      sorter: (a: DailyResult, b: DailyResult) => b.roi - a.roi,
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: '累積收益',
      dataIndex: 'cumulativeProfit',
      key: 'cumulativeProfit',
      width: 140,
      render: (profit: number) => (
        <span style={{ color: (profit || 0) > 0 ? '#52c41a' : (profit || 0) < 0 ? '#ff4d4f' : '#000' }}>
          ${(profit || 0).toLocaleString()}
        </span>
      ),
      sorter: (a: DailyResult, b: DailyResult) => (b.cumulativeProfit || 0) - (a.cumulativeProfit || 0),
    },
    {
      title: '當日收益',
      dataIndex: 'dailyProfit',
      key: 'dailyProfit',
      width: 140,
      render: (profit: number) => (
        <span style={{ color: (profit || 0) > 0 ? '#52c41a' : (profit || 0) < 0 ? '#ff4d4f' : '#000' }}>
          ${(profit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: '期末現金',
      dataIndex: 'dayEndCash',
      key: 'dayEndCash',
      width: 140,
      render: (cash: number) => cash != null ? `$${cash.toLocaleString()}` : '-',
    },
    {
      title: '買入A',
      dataIndex: 'fishAPurchased',
      key: 'fishAPurchased',
      width: 100,
      render: (qty: number) => `${qty || 0} kg`,
    },
    {
      title: '賣出A',
      dataIndex: 'fishASold',
      key: 'fishASold',
      width: 100,
      render: (qty: number) => `${qty || 0} kg`,
    },
    {
      title: '買入B',
      dataIndex: 'fishBPurchased',
      key: 'fishBPurchased',
      width: 100,
      render: (qty: number) => `${qty || 0} kg`,
    },
    {
      title: '賣出B',
      dataIndex: 'fishBSold',
      key: 'fishBSold',
      width: 100,
      render: (qty: number) => `${qty || 0} kg`,
    },
    {
      title: '總收入',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 120,
      render: (revenue: number) => `$${(revenue || 0).toLocaleString()}`,
    },
    {
      title: '總成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (cost: number) => `$${(cost || 0).toLocaleString()}`,
    },
    {
      title: '滯銷罰金',
      dataIndex: 'unsoldPenalty',
      key: 'unsoldPenalty',
      width: 120,
      render: (penalty: number) => (penalty || 0) > 0 ? <span style={{ color: '#ff4d4f' }}>-${(penalty || 0).toLocaleString()}</span> : '-',
    },
    {
      title: '貸款利息',
      dataIndex: 'loanInterest',
      key: 'loanInterest',
      width: 120,
      render: (interest: number) => (interest || 0) > 0 ? <span style={{ color: '#ff4d4f' }}>-${(interest || 0).toLocaleString()}</span> : '-',
    },
  ]

  // 準備圖表數據
  const getChartOption = () => {
    if (!dailyResults.length) return {}

    // 按 ROI 排序
    const sortedResults = [...dailyResults].sort((a, b) => b.roi - a.roi)

    return {
      title: {
        text: 'ROI 排名',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          return `第 ${data.name} 隊<br/>ROI: ${(data.value * 100).toFixed(2)}%`
        },
      },
      xAxis: {
        type: 'category',
        data: sortedResults.map(r => `第${r.teamNumber}隊`),
        axisLabel: {
          interval: 0,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'ROI (%)',
        axisLabel: {
          formatter: (value: number) => (value * 100).toFixed(0) + '%',
        },
      },
      series: [
        {
          name: 'ROI',
          type: 'bar',
          data: sortedResults.map(r => r.roi),
          itemStyle: {
            color: (params: any) => {
              return params.value > 0 ? '#52c41a' : params.value < 0 ? '#ff4d4f' : '#d9d9d9'
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => (params.value * 100).toFixed(2) + '%',
          },
        },
      ],
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
      },
    }
  }

  const getCumulativeProfitChartOption = () => {
    if (!dailyResults.length) return {}

    const sortedResults = [...dailyResults].sort((a, b) => b.cumulativeProfit - a.cumulativeProfit)

    return {
      title: {
        text: '累積收益排名',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          return `第 ${data.name} 隊<br/>累積收益: $${data.value.toLocaleString()}`
        },
      },
      xAxis: {
        type: 'category',
        data: sortedResults.map(r => `第${r.teamNumber}隊`),
        axisLabel: {
          interval: 0,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: '累積收益 ($)',
        axisLabel: {
          formatter: (value: number) => '$' + (value / 1000).toFixed(0) + 'K',
        },
      },
      series: [
        {
          name: '累積收益',
          type: 'bar',
          data: sortedResults.map(r => r.cumulativeProfit),
          itemStyle: {
            color: (params: any) => {
              return params.value > 0 ? '#1890ff' : params.value < 0 ? '#ff4d4f' : '#d9d9d9'
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => '$' + (params.value / 1000).toFixed(1) + 'K',
          },
        },
      ],
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
      },
    }
  }

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
      <Card
        title="每日統計"
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
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {dailyResults.length > 0 && (
            <>
              <ReactECharts option={getChartOption()} style={{ height: 400 }} />
              <ReactECharts option={getCumulativeProfitChartOption()} style={{ height: 400 }} />
            </>
          )}

          <Table
            columns={columns}
            dataSource={dailyResults}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 2000 }}
          />
        </Space>
      </Card>
    </div>
  )
}
