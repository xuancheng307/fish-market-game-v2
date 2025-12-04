'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Tag, Space, message, Modal, Descriptions, Collapse } from 'antd'
import { TrophyOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import type { Game, DailyResult } from '@/lib/types'

const { Panel } = Collapse

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [finalResults, setFinalResults] = useState<DailyResult[]>([])
  const [modalVisible, setModalVisible] = useState(false)

  // 載入歷史遊戲列表
  const loadHistoryGames = async () => {
    try {
      setLoading(true)
      const response = await api.getHistoryGames()
      setGames(response.data || [])
    } catch (error) {
      message.error('載入歷史遊戲失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistoryGames()
  }, [])

  // 查看遊戲詳情
  const handleViewDetails = async (game: Game) => {
    try {
      setSelectedGame(game)

      // 載入最終結果（最後一天的排名）
      const response = await api.getDailyResults(game.id, game.totalDays)
      setFinalResults(response.data || [])

      setModalVisible(true)
    } catch (error) {
      message.error('載入遊戲詳情失敗')
    }
  }

  // 遊戲列表表格欄位
  const gameColumns = [
    {
      title: '遊戲名稱',
      dataIndex: 'gameName',
      key: 'gameName',
      width: 200,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          finished: { color: 'success', text: '已完成' },
          force_ended: { color: 'error', text: '強制結束' },
        }
        const config = statusConfig[status] || { color: 'default', text: status }
        return (
          <Tag color={config.color} icon={<CheckCircleOutlined />}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '天數',
      key: 'days',
      width: 100,
      render: (_: any, record: Game) => `${record.currentDay} / ${record.totalDays}`,
    },
    {
      title: '初始預算',
      dataIndex: 'initialBudget',
      key: 'initialBudget',
      width: 120,
      render: (budget: number) => `$${budget.toLocaleString()}`,
    },
    {
      title: '利息率',
      dataIndex: 'loanInterestRate',
      key: 'loanInterestRate',
      width: 100,
      render: (rate: number) => `${(rate * 100).toFixed(1)}%`,
    },
    {
      title: '創建時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-TW'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Game) => (
        <Space>
          <a onClick={() => handleViewDetails(record)}>
            <EyeOutlined /> 查看詳情
          </a>
        </Space>
      ),
    },
  ]

  // 最終排名表格欄位
  const rankingColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
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
      render: (num: number) => <strong>第 {num} 隊</strong>,
    },
    {
      title: 'ROI',
      dataIndex: 'roi',
      key: 'roi',
      width: 120,
      render: (roi: number) => (
        <Tag color={roi > 0 ? 'success' : roi < 0 ? 'error' : 'default'} style={{ fontSize: 16 }}>
          {(roi * 100).toFixed(2)}%
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
  ]

  return (
    <div>
      <Card title="歷史遊戲記錄">
        <Table
          columns={gameColumns}
          dataSource={games}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 場遊戲`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 遊戲詳情 Modal */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>{selectedGame?.gameName} - 最終排名</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={1200}
        footer={null}
      >
        {selectedGame && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 遊戲資訊 */}
            <Collapse defaultActiveKey={['info']}>
              <Panel header="遊戲資訊" key="info">
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="遊戲名稱">{selectedGame.gameName}</Descriptions.Item>
                  <Descriptions.Item label="狀態">
                    <Tag color={selectedGame.status === 'finished' ? 'success' : 'error'}>
                      {selectedGame.status === 'finished' ? '已完成' : '強制結束'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="遊戲天數">{selectedGame.totalDays} 天</Descriptions.Item>
                  <Descriptions.Item label="完成天數">{selectedGame.currentDay} 天</Descriptions.Item>
                  <Descriptions.Item label="初始預算">${selectedGame.initialBudget.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="貸款利率">{(selectedGame.loanInterestRate * 100).toFixed(1)}%</Descriptions.Item>
                  <Descriptions.Item label="最大借貸倍數">{selectedGame.maxLoanRatio}x</Descriptions.Item>
                  <Descriptions.Item label="滯銷費用">${selectedGame.unsoldFeePerKg}/kg</Descriptions.Item>
                  <Descriptions.Item label="A級魚底價">${selectedGame.distributorFloorPriceA}</Descriptions.Item>
                  <Descriptions.Item label="A級魚目標價">${selectedGame.targetPriceA}</Descriptions.Item>
                  <Descriptions.Item label="B級魚底價">${selectedGame.distributorFloorPriceB}</Descriptions.Item>
                  <Descriptions.Item label="B級魚目標價">${selectedGame.targetPriceB}</Descriptions.Item>
                  <Descriptions.Item label="買入投標時長">{selectedGame.buyingDuration} 秒</Descriptions.Item>
                  <Descriptions.Item label="賣出投標時長">{selectedGame.sellingDuration} 秒</Descriptions.Item>
                  <Descriptions.Item label="固定滯銷比例">{(selectedGame.fixedUnsoldRatio * 100).toFixed(1)}%</Descriptions.Item>
                  <Descriptions.Item label="創建時間">
                    {new Date(selectedGame.createdAt).toLocaleString('zh-TW')}
                  </Descriptions.Item>
                </Descriptions>
              </Panel>
            </Collapse>

            {/* 最終排名 */}
            <Card title="最終排名" size="small">
              <Table
                columns={rankingColumns}
                dataSource={finalResults.sort((a, b) => b.roi - a.roi)}
                rowKey="id"
                pagination={false}
                scroll={{ x: 900 }}
              />
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  )
}
