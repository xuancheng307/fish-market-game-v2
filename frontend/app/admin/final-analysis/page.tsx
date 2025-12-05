'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Tag, Space, message, Row, Col, Statistic, Descriptions, Alert, Tabs, Select } from 'antd'
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  TeamOutlined,
  LineChartOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'
import type { Game, DailyResult } from '@/lib/types'

// 動態載入 echarts 避免 SSR 問題
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

const { TabPane } = Tabs

export default function FinalAnalysisPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [allDailyResults, setAllDailyResults] = useState<DailyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number>(1)

  // 載入遊戲資料
  const loadGameData = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        setGame(gameResponse.data)
        setSelectedDay(gameResponse.data.totalDays)

        // 載入所有天數的結果
        const allResults: DailyResult[] = []
        for (let day = 1; day <= gameResponse.data.totalDays; day++) {
          const dayResults = await api.getDailyResults(gameResponse.data.id, day)
          if (dayResults.data) {
            allResults.push(...dayResults.data)
          }
        }
        setAllDailyResults(allResults)
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

  useEffect(() => {
    loadGameData()
  }, [])

  // 獲取最終排名（最後一天的數據）
  const getFinalRankings = () => {
    if (!game) return []
    const finalDayResults = allDailyResults.filter(r => r.dayNumber === game.totalDays)
    return finalDayResults.sort((a, b) => b.roi - a.roi)
  }

  // 獲取某個團隊的所有天數數據
  const getTeamDailyData = (teamNumber: number) => {
    return allDailyResults
      .filter(r => r.teamNumber === teamNumber)
      .sort((a, b) => a.dayNumber - b.dayNumber)
  }

  // 獲取所有獨特的團隊編號
  const getAllTeamNumbers = () => {
    const teamNumbers = new Set(allDailyResults.map(r => r.teamNumber))
    return Array.from(teamNumbers).sort((a, b) => a - b)
  }

  // ROI趨勢圖表（所有團隊）
  const getRoiTrendChartOption = () => {
    if (!game || allDailyResults.length === 0) return {}

    const teamNumbers = getAllTeamNumbers()
    const days = Array.from({ length: game.totalDays }, (_, i) => i + 1)

    const series = teamNumbers.map(teamNumber => {
      const teamData = getTeamDailyData(teamNumber)
      return {
        name: `第${teamNumber}隊`,
        type: 'line',
        data: days.map(day => {
          const dayResult = teamData.find(r => r.dayNumber === day)
          return dayResult ? dayResult.roi * 100 : null
        }),
        smooth: true,
      }
    })

    return {
      title: {
        text: 'ROI 趨勢分析',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `第 ${params[0].name} 天<br/>`
          params.forEach((param: any) => {
            if (param.value !== null) {
              result += `${param.seriesName}: ${param.value.toFixed(2)}%<br/>`
            }
          })
          return result
        },
      },
      legend: {
        data: teamNumbers.map(n => `第${n}隊`),
        top: 30,
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'category',
        data: days.map(d => `第${d}天`),
        name: '天數',
      },
      yAxis: {
        type: 'value',
        name: 'ROI (%)',
        axisLabel: {
          formatter: (value: number) => value.toFixed(0) + '%',
        },
      },
      series,
    }
  }

  // 累積收益趨勢圖表（所有團隊）
  const getCumulativeProfitChartOption = () => {
    if (!game || allDailyResults.length === 0) return {}

    const teamNumbers = getAllTeamNumbers()
    const days = Array.from({ length: game.totalDays }, (_, i) => i + 1)

    const series = teamNumbers.map(teamNumber => {
      const teamData = getTeamDailyData(teamNumber)
      return {
        name: `第${teamNumber}隊`,
        type: 'line',
        data: days.map(day => {
          const dayResult = teamData.find(r => r.dayNumber === day)
          return dayResult ? dayResult.cumulativeProfit : null
        }),
        smooth: true,
      }
    })

    return {
      title: {
        text: '累積收益趨勢分析',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `第 ${params[0].name} 天<br/>`
          params.forEach((param: any) => {
            if (param.value !== null) {
              result += `${param.seriesName}: $${param.value.toLocaleString()}<br/>`
            }
          })
          return result
        },
      },
      legend: {
        data: teamNumbers.map(n => `第${n}隊`),
        top: 30,
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'category',
        data: days.map(d => `第${d}天`),
        name: '天數',
      },
      yAxis: {
        type: 'value',
        name: '累積收益 ($)',
        axisLabel: {
          formatter: (value: number) => '$' + (value / 1000).toFixed(0) + 'K',
        },
      },
      series,
    }
  }

  // 團隊比較圖表（選定天數）
  const getTeamComparisonChartOption = () => {
    if (!game) return {}

    const dayResults = allDailyResults
      .filter(r => r.dayNumber === selectedDay)
      .sort((a, b) => b.roi - a.roi)

    return {
      title: {
        text: `第 ${selectedDay} 天團隊表現比較`,
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['ROI', '累積收益', '當日收益'],
        top: 30,
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'category',
        data: dayResults.map(r => `第${r.teamNumber}隊`),
        axisLabel: {
          rotate: 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'ROI (%)',
          position: 'left',
          axisLabel: {
            formatter: (value: number) => value + '%',
          },
        },
        {
          type: 'value',
          name: '收益 ($)',
          position: 'right',
          axisLabel: {
            formatter: (value: number) => '$' + (value / 1000).toFixed(0) + 'K',
          },
        },
      ],
      series: [
        {
          name: 'ROI',
          type: 'bar',
          data: dayResults.map(r => (r.roi * 100).toFixed(2)),
          itemStyle: {
            color: '#1890ff',
          },
        },
        {
          name: '累積收益',
          type: 'bar',
          yAxisIndex: 1,
          data: dayResults.map(r => r.cumulativeProfit),
          itemStyle: {
            color: '#52c41a',
          },
        },
        {
          name: '當日收益',
          type: 'bar',
          yAxisIndex: 1,
          data: dayResults.map(r => r.dailyProfit),
          itemStyle: {
            color: '#faad14',
          },
        },
      ],
    }
  }

  // 最終排名表格
  const finalRankingColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      fixed: 'left' as const,
      render: (_: any, record: DailyResult, index: number) => {
        const icons = [
          <TrophyOutlined key="1" style={{ color: '#FFD700', fontSize: 24 }} />,
          <TrophyOutlined key="2" style={{ color: '#C0C0C0', fontSize: 22 }} />,
          <TrophyOutlined key="3" style={{ color: '#CD7F32', fontSize: 20 }} />,
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
      fixed: 'left' as const,
      render: (num: number) => <strong>第 {num} 隊</strong>,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 120,
      render: (roi: number) => (
        <Tag color={roi > 0 ? 'success' : roi < 0 ? 'error' : 'default'} style={{ fontSize: 16 }}>
          {roi > 0 ? <RiseOutlined /> : roi < 0 ? <FallOutlined /> : null}
          {' '}{(roi * 100).toFixed(2)}%
        </Tag>
      ),
    },
    {
      title: '累積收益',
      dataIndex: 'cumulativeProfit',
      key: 'cumulativeProfit',
      width: 140,
      render: (profit: number) => (
        <span style={{
          color: profit > 0 ? '#52c41a' : profit < 0 ? '#ff4d4f' : '#000',
          fontWeight: 'bold',
          fontSize: 16,
        }}>
          ${profit.toLocaleString()}
        </span>
      ),
    },
    {
      title: '期末現金',
      dataIndex: 'dayEndCash',
      key: 'dayEndCash',
      width: 140,
      render: (cash: number) => `$${cash.toLocaleString()}`,
    },
    {
      title: '總收入',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 140,
      render: (revenue: number) => `$${revenue.toLocaleString()}`,
    },
    {
      title: '總成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 140,
      render: (cost: number) => `$${cost.toLocaleString()}`,
    },
    {
      title: '買入A',
      dataIndex: 'fishAPurchased',
      key: 'fishAPurchased',
      width: 100,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: '賣出A',
      dataIndex: 'fishASold',
      key: 'fishASold',
      width: 100,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: '買入B',
      dataIndex: 'fishBPurchased',
      key: 'fishBPurchased',
      width: 100,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: '賣出B',
      dataIndex: 'fishBSold',
      key: 'fishBSold',
      width: 100,
      render: (qty: number) => `${qty} kg`,
    },
  ]

  const finalRankings = getFinalRankings()

  // 計算統計數據
  const getStatistics = () => {
    if (finalRankings.length === 0) return null

    const winner = finalRankings[0]
    const avgRoi = finalRankings.reduce((sum, r) => sum + r.roi, 0) / finalRankings.length
    const avgProfit = finalRankings.reduce((sum, r) => sum + r.cumulativeProfit, 0) / finalRankings.length
    const maxProfit = Math.max(...finalRankings.map(r => r.cumulativeProfit))
    const minProfit = Math.min(...finalRankings.map(r => r.cumulativeProfit))

    return {
      winner,
      avgRoi,
      avgProfit,
      maxProfit,
      minProfit,
    }
  }

  const stats = getStatistics()

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

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 遊戲概覽 */}
        <Card
          title={
            <Space>
              <TrophyOutlined style={{ fontSize: 20, color: '#1890ff' }} />
              最終遊戲分析 - {game.gameName}
            </Space>
          }
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="遊戲狀態">
              <Tag color={game.status === 'active' ? 'green' : game.status === 'finished' ? 'blue' : 'red'}>
                {game.status === 'active' ? '進行中' : game.status === 'finished' ? '已完成' : game.status === 'paused' ? '已暫停' : '強制結束'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="遊戲天數">{game.currentDay} / {game.totalDays} 天</Descriptions.Item>
            <Descriptions.Item label="參與團隊">{game.numTeams} 隊</Descriptions.Item>
            <Descriptions.Item label="初始預算">${game.initialBudget.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="貸款利率">{(game.loanInterestRate * 100).toFixed(1)}%</Descriptions.Item>
            <Descriptions.Item label="最大借貸倍數">{game.maxLoanRatio}x</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 關鍵統計 */}
        {stats && (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="冠軍團隊"
                  value={stats.winner.teamNumber}
                  prefix={<TrophyOutlined style={{ color: '#FFD700' }} />}
                  suffix="隊"
                  valueStyle={{ color: '#1890ff', fontSize: 32 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="冠軍ROI"
                  value={(stats.winner.roi * 100).toFixed(2)}
                  suffix="%"
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: 32 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均ROI"
                  value={(stats.avgRoi * 100).toFixed(2)}
                  suffix="%"
                  valueStyle={{ fontSize: 32 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="平均收益"
                  value={stats.avgProfit}
                  prefix={<DollarOutlined />}
                  valueStyle={{ fontSize: 32 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 分析圖表 */}
        <Card title={<Space><LineChartOutlined /> 績效分析</Space>}>
          <Tabs defaultActiveKey="1">
            <TabPane tab="趨勢分析" key="1">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <ReactECharts option={getRoiTrendChartOption()} style={{ height: 400 }} />
                <ReactECharts option={getCumulativeProfitChartOption()} style={{ height: 400 }} />
              </Space>
            </TabPane>
            <TabPane tab="團隊比較" key="2">
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <div>
                  <span>選擇天數：</span>
                  <Select
                    value={selectedDay}
                    style={{ width: 120, marginLeft: 8 }}
                    onChange={setSelectedDay}
                  >
                    {Array.from({ length: game.totalDays }, (_, i) => i + 1).map(day => (
                      <Select.Option key={day} value={day}>第 {day} 天</Select.Option>
                    ))}
                  </Select>
                </div>
                <ReactECharts option={getTeamComparisonChartOption()} style={{ height: 400 }} />
              </Space>
            </TabPane>
          </Tabs>
        </Card>

        {/* 最終排名 */}
        <Card title={<Space><TrophyOutlined /> 最終排名</Space>}>
          <Table
            columns={finalRankingColumns}
            dataSource={finalRankings}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Space>
    </div>
  )
}
