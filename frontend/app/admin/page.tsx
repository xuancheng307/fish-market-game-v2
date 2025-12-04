'use client'

import { Typography, Card, Row, Col, Divider } from 'antd'
import {
  TrophyOutlined,
  DollarOutlined,
  ShoppingOutlined,
  LineChartOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

export default function AdminDashboard() {
  return (
    <div>
      <Title level={2}>🐟 魚市場交易遊戲</Title>
      <Paragraph style={{ fontSize: 16, color: '#666' }}>
        中盤商經營模擬系統 - 管理員控制台
      </Paragraph>

      <Divider />

      <Title level={3}>遊戲簡介</Title>
      <Paragraph>
        這是一個模擬中盤商在魚市場進行交易的經營遊戲。玩家扮演中盤商角色，
        需要在每天的買入和賣出階段進行投標，以賺取最大利潤。
      </Paragraph>

      <Title level={4} style={{ marginTop: 32 }}>遊戲規則</Title>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <DollarOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <Title level={5} style={{ margin: 0 }}>初始資金</Title>
            </div>
            <Paragraph>
              每個團隊獲得初始預算（預設 $100,000），
              可借貸最高不超過初始預算的 50%（依遊戲設定）。
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ShoppingOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0 }}>買入投標</Title>
            </div>
            <Paragraph>
              每種魚最多可出 2 個不同價格，
              系統按價格高者優先分配。
              價格不得低於底價（保護漁民利益）。
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <LineChartOutlined style={{ fontSize: 24, color: '#722ed1' }} />
              <Title level={5} style={{ margin: 0 }}>賣出投標</Title>
            </div>
            <Paragraph>
              買入的魚當天必須賣出，
              系統按價格低者優先成交。
              當日未賣出的魚將全部滯銷（固定 2.5% 滯銷罰金）。
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TrophyOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
              <Title level={5} style={{ margin: 0 }}>勝利條件</Title>
            </div>
            <Paragraph>
              遊戲結束時，依 ROI（投資報酬率）排名。
              ROI = (最終淨值 - 初始預算) / 初始預算 × 100%
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ClockCircleOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
              <Title level={5} style={{ margin: 0 }}>遊戲流程</Title>
            </div>
            <Paragraph>
              每天分為：買入投標 → 買入結算 → 賣出投標 → 賣出結算 →
              次日。管理員控制階段切換。
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card hoverable>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TeamOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
              <Title level={5} style={{ margin: 0 }}>參與團隊</Title>
            </div>
            <Paragraph>
              支援多個團隊同時參與（預設 6 隊），
              每隊使用自己的帳號登入投標。
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={4}>管理員功能</Title>
      <Paragraph>
        <ul>
          <li><Text strong>創建遊戲：</Text>設定遊戲參數（天數、團隊數、初始資金、利率等）</li>
          <li><Text strong>遊戲控制：</Text>控制遊戲階段切換（開始買入、結束賣出、結算等）</li>
          <li><Text strong>競標結果：</Text>查看所有團隊的投標記錄和成交情況</li>
          <li><Text strong>每日統計：</Text>查看各團隊每日財務數據和排名</li>
          <li><Text strong>歷史遊戲：</Text>查看過往遊戲記錄</li>
          <li><Text strong>帳號管理：</Text>重置團隊密碼、查看登入 QR Code</li>
        </ul>
      </Paragraph>

      <Card style={{ marginTop: 24, background: '#f0f5ff', borderColor: '#adc6ff' }}>
        <Paragraph style={{ margin: 0, color: '#1890ff' }}>
          <Text strong>提示：</Text>
          請從左側選單選擇功能開始管理遊戲。建議先「創建遊戲」，再透過「遊戲控制」開始遊戲流程。
        </Paragraph>
      </Card>
    </div>
  )
}
