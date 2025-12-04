'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Space, message, Modal, Tag, Descriptions } from 'antd'
import {
  ReloadOutlined,
  KeyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import type { Team } from '@/lib/types'

export default function AccountsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [resetLoading, setResetLoading] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [infoModalVisible, setInfoModalVisible] = useState(false)

  // 載入所有團隊帳號
  const loadTeams = async () => {
    try {
      setLoading(true)
      const gameResponse = await api.getActiveGame()

      if (gameResponse.data) {
        const teamsResponse = await api.getAllTeams(gameResponse.data.id)
        setTeams(teamsResponse.data || [])
      } else {
        message.info('目前沒有進行中的遊戲')
        setTeams([])
      }
    } catch (error: any) {
      if (error?.error?.includes('沒有進行中的遊戲')) {
        message.info('目前沒有進行中的遊戲')
        setTeams([])
      } else {
        message.error('載入團隊帳號失敗')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  // 重置單一團隊密碼
  const handleResetPassword = (team: Team) => {
    Modal.confirm({
      title: '重置密碼',
      content: `確定要重置「第 ${team.teamNumber} 隊」的密碼嗎？`,
      okText: '確定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setResetLoading(true)
          await api.resetTeamPassword(team.userId, team.teamNumber)
          message.success(`第 ${team.teamNumber} 隊密碼已重置為預設值`)
          await loadTeams()
        } catch (error: any) {
          message.error(getErrorMessage(error, '重置密碼失敗'))
        } finally {
          setResetLoading(false)
        }
      },
    })
  }

  // 重置所有團隊密碼
  const handleResetAllPasswords = () => {
    Modal.confirm({
      title: '重置所有密碼',
      content: '確定要重置所有團隊的密碼嗎？此操作不可逆！',
      okText: '確定重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setResetLoading(true)
          await api.resetAllPasswords()
          message.success('所有團隊密碼已重置為預設值')
          await loadTeams()
        } catch (error: any) {
          message.error(getErrorMessage(error, '重置所有密碼失敗'))
        } finally {
          setResetLoading(false)
        }
      },
    })
  }

  // 查看登入資訊
  const handleViewLoginInfo = (team: Team) => {
    setSelectedTeam(team)
    setInfoModalVisible(true)
  }

  // 表格欄位定義
  const columns = [
    {
      title: '團隊編號',
      dataIndex: 'teamNumber',
      key: 'teamNumber',
      width: 100,
      render: (num: number) => <strong>第 {num} 隊</strong>,
    },
    {
      title: '帳號',
      dataIndex: 'teamNumber',
      key: 'username',
      width: 120,
      render: (num: number) => <code>{String(num).padStart(2, '0')}</code>,
    },
    {
      title: '預設密碼',
      dataIndex: 'teamNumber',
      key: 'defaultPassword',
      width: 120,
      render: (num: number) => <code>{String(num).padStart(2, '0')}</code>,
    },
    {
      title: '密碼狀態',
      key: 'passwordStatus',
      width: 100,
      render: () => (
        <Tag color="default" icon={<CheckCircleOutlined />}>
          預設
        </Tag>
      ),
    },
    {
      title: '當前現金',
      dataIndex: 'cash',
      key: 'cash',
      width: 140,
      render: (budget: number) => (
        <span style={{ color: budget < 0 ? '#ff4d4f' : '#000' }}>
          ${budget.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'A級魚庫存',
      dataIndex: 'fishAInventory',
      key: 'fishAInventory',
      width: 120,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: 'B級魚庫存',
      dataIndex: 'fishBInventory',
      key: 'fishBInventory',
      width: 120,
      render: (qty: number) => `${qty} kg`,
    },
    {
      title: '貸款金額',
      dataIndex: 'totalLoan',
      key: 'totalLoan',
      width: 140,
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#ff4d4f' : '#52c41a' }}>
          ${amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Team) => (
        <Space>
          <Button
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleViewLoginInfo(record)}
          >
            登入資訊
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
            loading={resetLoading}
          >
            重置密碼
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="帳號管理"
        extra={
          <Button
            type="primary"
            danger
            icon={<ReloadOutlined />}
            onClick={handleResetAllPasswords}
            loading={resetLoading}
          >
            重置所有密碼
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Tag color="blue" icon={<UserOutlined />}>
            帳號格式：團隊編號（兩位數，如 01, 02, ...）
          </Tag>
          <Tag color="green" icon={<KeyOutlined />}>
            預設密碼：與帳號相同（如帳號 01，密碼 01）
          </Tag>
          <Tag color="orange">
            管理員帳號：admin / admin
          </Tag>
        </Space>

        <Table
          columns={columns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 個團隊`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 登入資訊 Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span>第 {selectedTeam?.teamNumber} 隊 - 登入資訊</span>
          </Space>
        }
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTeam && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="登入憑證">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="團隊名稱">
                  <strong>第 {selectedTeam.teamNumber} 隊</strong>
                </Descriptions.Item>
                <Descriptions.Item label="登入帳號">
                  <code style={{ fontSize: 18, color: '#1890ff' }}>
                    {String(selectedTeam.teamNumber).padStart(2, '0')}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="登入密碼">
                  <code style={{ fontSize: 18, color: '#52c41a' }}>
                    {String(selectedTeam.teamNumber).padStart(2, '0')}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="登入網址">
                  <a href="/login" target="_blank" rel="noopener noreferrer">
                    {window.location.origin}/login
                  </a>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card size="small" title="財務狀況">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="當前現金">
                  <span style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: selectedTeam.cash < 0 ? '#ff4d4f' : '#52c41a'
                  }}>
                    ${selectedTeam.cash.toLocaleString()}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="貸款金額">
                  <span style={{
                    fontSize: 16,
                    color: selectedTeam.totalLoan > 0 ? '#ff4d4f' : '#000'
                  }}>
                    ${selectedTeam.totalLoan.toLocaleString()}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="A級魚庫存">
                  {selectedTeam.fishAInventory} kg
                </Descriptions.Item>
                <Descriptions.Item label="B級魚庫存">
                  {selectedTeam.fishBInventory} kg
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <div style={{ padding: '16px', background: '#f0f2f5', borderRadius: 8 }}>
              <p style={{ margin: 0, color: '#666' }}>
                <strong>提示：</strong>學生首次登入使用預設密碼，建議登入後修改密碼。如忘記密碼，管理員可重置為預設值。
              </p>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  )
}
