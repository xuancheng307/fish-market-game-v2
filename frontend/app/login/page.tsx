'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import type { LoginRequest } from '@/lib/types'

const { Title, Text } = Typography

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginRequest) => {
    setLoading(true)
    try {
      const response = await api.login(values)

      // 儲存 token 和用戶角色
      localStorage.setItem('token', response.token)
      localStorage.setItem('userRole', response.user.role)
      localStorage.setItem('userId', String(response.user.id))
      localStorage.setItem('username', response.user.username)

      message.success('登入成功！')

      // 根據角色導向不同頁面
      if (response.user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/team')
      }
    } catch (error: any) {
      console.error('登入失敗:', error)
      message.error(error?.message || error?.error || '登入失敗，請檢查帳號密碼')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            🐟 魚市場交易遊戲
          </Title>
          <Text type="secondary">
            中盤商經營模擬系統
          </Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '請輸入帳號' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="帳號"
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密碼"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              登入
            </Button>
          </Form.Item>
        </Form>

        <div style={{
          marginTop: 24,
          padding: '16px',
          background: '#f5f5f5',
          borderRadius: 6,
          fontSize: 12,
          color: '#666'
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong>管理員帳號：</strong> admin
          </div>
          <div>
            <strong>團隊帳號：</strong> 01, 02, 03...
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
            初始密碼為帳號/年月日（例如：01/01）
          </div>
        </div>
      </Card>
    </div>
  )
}
