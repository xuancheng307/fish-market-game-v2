'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Space, Tag, message, Row, Col, Statistic } from 'antd'
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import type { Game, DailyResult, Bid } from '@/lib/types'

// 動態載入 echarts 避免 SSR 問題
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

export default function TeamStatsPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [myResults, setMyResults] = useState<DailyResult[]>([])
  const [allBids, setAllBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

  // 載入資料
  const loadData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)

        // 載入我的歷史統計數據
        const resultsResponse = await api.getMyDailyResults(gameResponse.data.id)
        setMyResults(resultsResponse.data || [])

        // 載入我的所有投標記錄
        const bidsResponse = await api.getMyBids(gameResponse.data.id)
        setAllBids(bidsResponse.data || [])
      }
    } catch (error) {
      message.error('載入統計數據失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    wsClient.onSettlementComplete(() => {
      loadData()
    })

    return () => {
      wsClient.off('settlementComplete')
    }
  }, [])

  // 準備累積收益趨勢圖表
  const getProfitChartOption = () => {
    if (!myResults.length) return {}

    const sortedResults = [...myResults].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))

    return {
      title: {
        text: '累積收益趨勢',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          return `第 ${data.name} 天<br/>累積收益: $${(data.value || 0).toLocaleString()}`
        },
      },
      xAxis: {
        type: 'category',
        data: sortedResults.map(r => `第${r.dayNumber || '?'}天`),
        name: '天數',
      },
      yAxis: {
        type: 'value',
        name: '累積收益 ($)',
        axisLabel: {
          formatter: (value: number) => '$' + ((value || 0) / 1000).toFixed(0) + 'K',
        },
      },
      series: [
        {
          name: '累積收益',
          type: 'line',
          data: sortedResults.map(r => r.cumulativeProfit || 0),
          smooth: true,
          itemStyle: {
            color: '#1890ff',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
              ],
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => '$' + ((params.value || 0) / 1000).toFixed(1) + 'K',
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

  // 準備 ROI 趨勢圖表
  const getRoiChartOption = () => {
    if (!myResults.length) return {}

    const sortedResults = [...myResults].sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))

    return {
      title: {
        text: 'ROI 趨勢',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0]
          return `第 ${data.name} 天<br/>ROI: ${((data.value || 0) * 100).toFixed(2)}%`
        },
      },
      xAxis: {
        type: 'category',
        data: sortedResults.map(r => `第${r.dayNumber || '?'}天`),
        name: '天數',
      },
      yAxis: {
        type: 'value',
        name: 'ROI (%)',
        axisLabel: {
          formatter: (value: number) => ((value || 0) * 100).toFixed(0) + '%',
        },
      },
      series: [
        {
          name: 'ROI',
          type: 'bar',
          data: sortedResults.map(r => r.roi || 0),
          itemStyle: {
            color: (params: any) => {
              return (params.value || 0) > 0 ? '#52c41a' : (params.value || 0) < 0 ? '#ff4d4f' : '#d9d9d9'
            },
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => ((params.value || 0) * 100).toFixed(2) + '%',
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

  // 每日統計表格欄位
  const resultsColumns = [
    {
      title: '天數',
      dataIndex: 'dayNumber',
      key: 'dayNumber',
      width: 80,
      render: (day: number) => `第 ${day} 天`,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 120,
      render: (roi: number) => (
        <Tag color={(roi || 0) > 0 ? 'success' : (roi || 0) < 0 ? 'error' : 'default'}>
          {(roi || 0) > 0 ? <RiseOutlined /> : (roi || 0) < 0 ? <FallOutlined /> : null}
          {' '}{((roi || 0) * 100).toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '當日收益',
      dataIndex: 'dailyProfit',
      key: 'dailyProfit',
      width: 120,
      render: (profit: number) => (
        <span style={{ color: (profit || 0) > 0 ? '#52c41a' : (profit || 0) < 0 ? '#ff4d4f' : '#000' }}>
          ${(profit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: '累積收益',
      dataIndex: 'cumulativeProfit',
      key: 'cumulativeProfit',
      width: 140,
      render: (profit: number) => (
        <span style={{ color: (profit || 0) > 0 ? '#52c41a' : (profit || 0) < 0 ? '#ff4d4f' : '#000', fontWeight: 'bold' }}>
          ${(profit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: '期末現金',
      dataIndex: 'dayEndCash',
      key: 'dayEndCash',
      width: 120,
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
  ]

  // 投標歷史表格欄位
  const bidsColumns = [
    {
      title: '天數',
      dataIndex: 'dayNumber',
      key: 'dayNumber',
      width: 80,
      render: (day: number) => `第 ${day} 天`,
    },
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
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          fulfilled: { color: 'success', text: '完全成交' },
          partial: { color: 'warning', text: '部分成交' },
          failed: { color: 'error', text: '未成交' },
          pending: { color: 'default', text: '待處理' },
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
  ]

  // 計算統計數據
  const latestResult = myResults.length > 0 ? myResults[myResults.length - 1] : null
  const totalBids = allBids.length
  const fulfilledBids = allBids.filter(b => b.status === 'fulfilled').length
  const successRate = totalBids > 0 ? Math.round((fulfilledBids / totalBids) * 100) : 0

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 概覽統計 */}
        {latestResult && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="ROI"
                  value={`${((latestResult.roi || 0) * 100).toFixed(2)}%`}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: (latestResult.roi || 0) > 0 ? '#52c41a' : '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="累積收益"
                  value={latestResult.cumulativeProfit}
                  prefix={<DollarOutlined />}
                  valueStyle={{
                    color: latestResult.cumulativeProfit > 0 ? '#52c41a' : '#ff4d4f',
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="當前 ROI"
                  value={(latestResult.roi * 100).toFixed(2)}
                  suffix="%"
                  valueStyle={{
                    color: latestResult.roi > 0 ? '#52c41a' : '#ff4d4f',
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="投標成交率"
                  value={successRate}
                  suffix="%"
                  prefix={<ShoppingOutlined />}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 趨勢圖表 */}
        {myResults.length > 0 && (
          <Card title="績效趨勢">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <ReactECharts option={getProfitChartOption()} style={{ height: 350 }} />
              <ReactECharts option={getRoiChartOption()} style={{ height: 350 }} />
            </Space>
          </Card>
        )}

        {/* 每日統計表格 */}
        <Card title="每日統計">
          <Table
            columns={resultsColumns}
            dataSource={myResults.sort((a, b) => b.dayNumber - a.dayNumber)}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1400 }}
          />
        </Card>

        {/* 投標歷史 */}
        <Card title="投標歷史">
          <Table
            columns={bidsColumns}
            dataSource={allBids.sort((a, b) => {
              if (a.dayNumber !== b.dayNumber) return b.dayNumber - a.dayNumber
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            })}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `共 ${total} 筆投標記錄`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            scroll={{ x: 1100 }}
          />
        </Card>
      </Space>
    </div>
  )
}
