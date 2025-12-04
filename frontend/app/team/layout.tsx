'use client'

import { useEffect, useState } from 'react'
import { Layout, Menu, Button, Space, Tag, Statistic, Row, Col, Card, message } from 'antd'
import {
  HomeOutlined,
  BarChartOutlined,
  LogoutOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { wsClient } from '@/lib/websocket'
import { STATUS_DISPLAY_TEXT } from '@/lib/constants'
import type { Game, GameDay, Team } from '@/lib/types'

const { Header, Content } = Layout

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [game, setGame] = useState<Game | null>(null)
  const [gameDay, setGameDay] = useState<GameDay | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)

  // 載入遊戲與團隊資料
  const loadData = async () => {
    try {
      setLoading(true)

      // 獲取當前用戶資訊
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }

      const user = JSON.parse(userStr)
      if (user.role !== 'team') {
        message.error('權限不足')
        router.push('/login')
        return
      }

      // 獲取進行中的遊戲
      const gameResponse = await api.getActiveGame()
      if (gameResponse.data) {
        setGame(gameResponse.data)

        // 獲取當天資訊
        const dayResponse = await api.getCurrentGameDay(gameResponse.data.id)
        setGameDay(dayResponse.data)

        // 獲取我的團隊資訊
        const teamResponse = await api.getMyTeamStatus(gameResponse.data.id)
        setTeam(teamResponse.data)

        // 加入遊戲房間
        wsClient.joinGame(gameResponse.data.id)
      } else {
        message.info('目前沒有進行中的遊戲')
      }
    } catch (error: any) {
      if (error?.error?.includes('沒有進行中的遊戲')) {
        message.info('目前沒有進行中的遊戲')
      } else {
        message.error('載入資料失敗')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // 監聽 WebSocket 更新
    wsClient.onPhaseChange((data) => {
      message.info(`階段變更：${STATUS_DISPLAY_TEXT[data.status] || data.status}`)
      loadData()
    })

    wsClient.onSettlementComplete(() => {
      message.success('結算完成！')
      loadData()
    })

    wsClient.onGameUpdate(() => {
      loadData()
    })

    return () => {
      wsClient.off('phaseChange')
      wsClient.off('settlementComplete')
      wsClient.off('gameUpdate')
    }
  }, [])

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    message.success('登出成功')
    router.push('/login')
  }

  // 獲取當前選中的菜單
  const selectedKey = pathname === '/team' ? 'home' : pathname.split('/')[2] || 'home'

  // 獲取狀態標籤顏色
  const getStatusColor = (status: string) => {
    if (status.includes('open')) return 'processing'
    if (status === 'settled') return 'success'
    return 'default'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 頂部導航 */}
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                <TeamOutlined /> 魚市場交易遊戲
              </div>
              {team && (
                <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                  第 {team.teamNumber} 隊
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {game && (
                <Tag color="green">
                  {game.gameName} - 第 {game.currentDay}/{game.totalDays} 天
                </Tag>
              )}
              {gameDay && (
                <Tag color={getStatusColor(gameDay.status)}>
                  {STATUS_DISPLAY_TEXT[gameDay.status] || gameDay.status}
                </Tag>
              )}
              <Button icon={<LogoutOutlined />} onClick={handleLogout}>
                登出
              </Button>
            </Space>
          </Col>
        </Row>
      </Header>

      <Layout>
        {/* 左側財務資訊欄 */}
        <Layout.Sider width={280} style={{ background: '#fff', padding: '16px' }}>
          {/* 財務資訊卡片 */}
          {team && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card size="small" title="財務狀況">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic
                    title="當前現金"
                    value={team.currentBudget}
                    prefix={<DollarOutlined />}
                    suffix="元"
                    valueStyle={{
                      color: team.currentBudget < 0 ? '#ff4d4f' : '#52c41a',
                      fontSize: 24,
                    }}
                  />
                  {team.loanAmount > 0 && (
                    <Statistic
                      title="貸款金額"
                      value={team.loanAmount}
                      prefix="$"
                      valueStyle={{ color: '#ff4d4f', fontSize: 18 }}
                    />
                  )}
                </Space>
              </Card>

              <Card size="small" title="庫存資訊">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic
                    title="A級魚庫存"
                    value={team.fishAInventory}
                    suffix="kg"
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ fontSize: 18 }}
                  />
                  <Statistic
                    title="B級魚庫存"
                    value={team.fishBInventory}
                    suffix="kg"
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Space>
              </Card>

              {/* 導航菜單 */}
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                style={{ border: 'none' }}
                items={[
                  {
                    key: 'home',
                    icon: <HomeOutlined />,
                    label: '投標區',
                    onClick: () => router.push('/team'),
                  },
                  {
                    key: 'stats',
                    icon: <BarChartOutlined />,
                    label: '我的統計',
                    onClick: () => router.push('/team/stats'),
                  },
                ]}
              />
            </Space>
          )}
        </Layout.Sider>

        {/* 主要內容區 */}
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
