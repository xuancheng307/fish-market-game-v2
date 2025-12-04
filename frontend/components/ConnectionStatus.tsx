'use client'

import { useState, useEffect } from 'react'
import { Badge, Tooltip } from 'antd'
import {
  WifiOutlined,
  LoadingOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { wsClient, type ConnectionStatus } from '@/lib/websocket'

export default function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')

  useEffect(() => {
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
    }

    wsClient.onStatusChange(handleStatusChange)

    return () => {
      wsClient.removeStatusCallback(handleStatusChange)
    }
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          status: 'success' as const,
          text: '已連線',
          icon: <WifiOutlined style={{ fontSize: 16 }} />,
          color: '#52c41a',
        }
      case 'connecting':
        return {
          status: 'processing' as const,
          text: '連線中...',
          icon: <LoadingOutlined style={{ fontSize: 16 }} />,
          color: '#1890ff',
        }
      case 'reconnecting':
        return {
          status: 'warning' as const,
          text: '重新連線中...',
          icon: <LoadingOutlined style={{ fontSize: 16 }} />,
          color: '#faad14',
        }
      case 'disconnected':
        return {
          status: 'default' as const,
          text: '未連線',
          icon: <DisconnectOutlined style={{ fontSize: 16 }} />,
          color: '#d9d9d9',
        }
      case 'error':
        return {
          status: 'error' as const,
          text: '連線錯誤',
          icon: <ExclamationCircleOutlined style={{ fontSize: 16 }} />,
          color: '#ff4d4f',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Tooltip title={`即時通訊狀態: ${config.text}`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 4,
          border: `1px solid ${config.color}`,
          backgroundColor: `${config.color}15`,
          cursor: 'pointer',
        }}
      >
        <Badge status={config.status} />
        <span style={{ color: config.color, fontSize: 14 }}>{config.icon}</span>
        <span style={{ color: config.color, fontSize: 12, fontWeight: 500 }}>
          {config.text}
        </span>
      </div>
    </Tooltip>
  )
}
