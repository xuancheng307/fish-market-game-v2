'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, InputNumber, Button, Card, message, Typography, Divider, Space } from 'antd'
import { PlusCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import type { GameCreateParams } from '@/lib/types'

const { Title, Paragraph, Text } = Typography

export default function CreateGamePage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const defaultValues: GameCreateParams = {
    gameName: `魚市場遊戲-${new Date().toLocaleDateString('zh-TW')}`,
    description: '',
    totalDays: 10,
    numTeams: 6,
    teamNames: ['第 01 組', '第 02 組', '第 03 組', '第 04 組', '第 05 組', '第 06 組'],
    initialBudget: 100000,
    dailyInterestRate: 0.0,
    loanInterestRate: 0.03,
    maxLoanRatio: 2.0,
    unsoldFeePerKg: 5.0,
    fixedUnsoldRatio: 0.025,
    distributorFloorPriceA: 0,
    distributorFloorPriceB: 0,
    targetPriceA: 0,
    targetPriceB: 0,
    buyingDuration: 300,
    sellingDuration: 300,
  }

  const onFinish = async (values: GameCreateParams) => {
    setLoading(true)
    try {
      const response = await api.createGame(values)
      message.success('遊戲創建成功！')

      // 跳轉到遊戲控制頁面
      setTimeout(() => {
        router.push('/admin/control')
      }, 1000)
    } catch (error: any) {
      console.error('創建遊戲失敗:', error)
      message.error(error?.message || error?.error || '創建遊戲失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.setFieldsValue(defaultValues)
    message.info('已重置為預設值')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2}>創建新遊戲</Title>
          <Paragraph>設定遊戲參數並創建新的遊戲</Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          重置為預設值
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={defaultValues}
        onFinish={onFinish}
        autoComplete="off"
      >
        <Card title="基本設定" style={{ marginBottom: 24 }}>
          <Form.Item
            label="遊戲名稱"
            name="gameName"
            rules={[{ required: true, message: '請輸入遊戲名稱' }]}
          >
            <Input placeholder="例如：魚市場遊戲-2025年春季班" />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="遊戲天數"
              name="totalDays"
              rules={[{ required: true, message: '請輸入遊戲天數' }]}
            >
              <InputNumber min={1} max={30} style={{ width: 150 }} addonAfter="天" />
            </Form.Item>

            <Form.Item
              label="參與團隊數"
              name="numTeams"
              rules={[{ required: true, message: '請輸入團隊數量' }]}
            >
              <InputNumber min={2} max={20} style={{ width: 150 }} addonAfter="隊" />
            </Form.Item>
          </Space>
        </Card>

        <Card title="財務參數" style={{ marginBottom: 24 }}>
          <Form.Item
            label="初始預算"
            name="initialBudget"
            rules={[{ required: true, message: '請輸入初始預算' }]}
            tooltip="每個團隊的起始資金"
          >
            <InputNumber
              min={0}
              step={10000}
              style={{ width: 200 }}
              addonBefore="$"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="每日利息率"
              name="dailyInterestRate"
              rules={[{ required: true, message: '請輸入每日利息率' }]}
              tooltip="對現金部分的每日利息（通常為 0）"
            >
              <InputNumber min={0} max={1} step={0.001} style={{ width: 150 }} />
            </Form.Item>

            <Form.Item
              label="貸款利息率"
              name="loanInterestRate"
              rules={[{ required: true, message: '請輸入貸款利息率' }]}
              tooltip="對借貸金額的每日利息"
            >
              <InputNumber min={0} max={1} step={0.001} style={{ width: 150 }} />
            </Form.Item>

            <Form.Item
              label="最大借貸倍數"
              name="maxLoanRatio"
              rules={[{ required: true, message: '請輸入最大借貸倍數' }]}
              tooltip="累積借貸總額不得超過初始預算的此倍數"
            >
              <InputNumber min={0} max={10} step={0.1} style={{ width: 150 }} addonAfter="倍" />
            </Form.Item>
          </Space>
        </Card>

        <Card title="市場參數" style={{ marginBottom: 24 }}>
          <Form.Item
            label="滯銷罰金（每公斤）"
            name="unsoldFeePerKg"
            rules={[{ required: true, message: '請輸入滯銷罰金' }]}
            tooltip="未賣出的魚，每公斤扣除的罰金"
          >
            <InputNumber min={0} step={1} style={{ width: 200 }} addonBefore="$" />
          </Form.Item>

          <Form.Item
            label="固定滯銷比例"
            name="fixedUnsoldRatio"
            rules={[{ required: true, message: '請輸入固定滯銷比例' }]}
            tooltip="每日賣出前，先扣除固定比例的滯銷魚（例如 2.5% = 0.025）"
          >
            <InputNumber min={0} max={1} step={0.001} style={{ width: 200 }} />
          </Form.Item>

          <Divider />

          <Title level={5}>底價設定（保護漁民利益）</Title>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            中盤商對漁民的最低收購價，買入投標價格不得低於此值
          </Paragraph>

          <Space size="large">
            <Form.Item
              label="A級魚底價"
              name="distributorFloorPriceA"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={10} style={{ width: 150 }} addonBefore="$" />
            </Form.Item>

            <Form.Item
              label="B級魚底價"
              name="distributorFloorPriceB"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={10} style={{ width: 150 }} addonBefore="$" />
            </Form.Item>
          </Space>

          <Divider />

          <Title level={5}>目標價格（參考用）</Title>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            建議的市場參考價格，不影響遊戲邏輯，僅供團隊參考
          </Paragraph>

          <Space size="large">
            <Form.Item
              label="A級魚目標價"
              name="targetPriceA"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={10} style={{ width: 150 }} addonBefore="$" />
            </Form.Item>

            <Form.Item
              label="B級魚目標價"
              name="targetPriceB"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} step={10} style={{ width: 150 }} addonBefore="$" />
            </Form.Item>
          </Space>
        </Card>

        <Card title="時間設定" style={{ marginBottom: 24 }}>
          <Space size="large">
            <Form.Item
              label="買入投標時長"
              name="buyingDuration"
              rules={[{ required: true, message: '請輸入買入時長' }]}
              tooltip="每日買入階段的時間長度"
            >
              <InputNumber min={60} max={3600} step={60} style={{ width: 150 }} addonAfter="秒" />
            </Form.Item>

            <Form.Item
              label="賣出投標時長"
              name="sellingDuration"
              rules={[{ required: true, message: '請輸入賣出時長' }]}
              tooltip="每日賣出階段的時間長度"
            >
              <InputNumber min={60} max={3600} step={60} style={{ width: 150 }} addonAfter="秒" />
            </Form.Item>
          </Space>

          <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 12 }}>
            <Text type="warning">提示：</Text> 建議買入和賣出時長均設定為 5-10 分鐘（300-600 秒）
          </Paragraph>
        </Card>

        <Form.Item>
          <Space size="middle">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<PlusCircleOutlined />}
              size="large"
            >
              創建遊戲
            </Button>
            <Button size="large" onClick={() => router.push('/admin')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
