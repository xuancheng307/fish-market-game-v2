'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Menu, Avatar, Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  DashboardOutlined,
  PlusCircleOutlined,
  ControlOutlined,
  LineChartOutlined,
  BarChartOutlined,
  HistoryOutlined,
  QrcodeOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { wsClient } from '@/lib/websocket'
import ConnectionStatusIndicator from '@/components/ConnectionStatus'

const { Header, Sider, Content } = Layout

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    // 檢查登入狀態和權限
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')
    const savedUsername = localStorage.getItem('username')

    if (!token || userRole !== 'admin') {
      message.error('請先以管理員身份登入')
      router.push('/login')
      return
    }

    setUsername(savedUsername || 'Admin')

    // 連接 WebSocket
    wsClient.connect(token)

    return () => {
      wsClient.disconnect()
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    wsClient.disconnect()
    message.success('已登出')
    router.push('/login')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: '遊戲介紹',
      onClick: () => router.push('/admin')
    },
    {
      key: '2',
      icon: <PlusCircleOutlined />,
      label: '創建遊戲',
      onClick: () => router.push('/admin/create')
    },
    {
      key: '3',
      icon: <ControlOutlined />,
      label: '遊戲控制',
      onClick: () => router.push('/admin/control')
    },
    {
      key: '4',
      icon: <LineChartOutlined />,
      label: '競標結果',
      onClick: () => router.push('/admin/bids')
    },
    {
      key: '5',
      icon: <BarChartOutlined />,
      label: '每日統計',
      onClick: () => router.push('/admin/stats')
    },
    {
      key: '6',
      icon: <HistoryOutlined />,
      label: '歷史遊戲',
      onClick: () => router.push('/admin/history')
    },
    {
      key: '7',
      icon: <QrcodeOutlined />,
      label: '帳號管理',
      onClick: () => router.push('/admin/accounts')
    },
  ]

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 20 : 18,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {collapsed ? '🐟' : '🐟 魚市場遊戲'}
        </div>
        <Menu
          theme="dark"
          defaultSelectedKeys={['1']}
          mode="inline"
          items={menuItems}
          style={{ marginTop: 16 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
            管理員控制台
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ConnectionStatusIndicator />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span style={{ fontWeight: 500 }}>{username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{
          margin: '24px',
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          minHeight: 280
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
