'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, InputNumber, Button, Card, message, Typography, Divider, Space, Switch, Row, Col, Alert } from 'antd'
import { PlusCircleOutlined, ReloadOutlined, CalculatorOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import type { GameCreateParams } from '@/lib/types'

const { Title, Paragraph, Text } = Typography

// 計算公式常數
const FISH_A_SUPPLY_PER_TEAM = 150  // A魚供給 = 組數 × 150
const FISH_B_SUPPLY_PER_TEAM = 250  // B魚供給 = 組數 × 250
const TARGET_PRICE_A = 350          // A魚目標價
const TARGET_PRICE_B = 200          // B魚目標價
const RESTAURANT_MARKUP_A = 150     // 餐廳預算 A = (目標價+150) × 供給
const RESTAURANT_MARKUP_B = 100     // 餐廳預算 B = (目標價+100) × 供給

export default function CreateGamePage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 監聽關鍵參數變化
  const numTeams = Form.useWatch('numTeams', form)
  const totalDays = Form.useWatch('totalDays', form)
  const targetPriceA = Form.useWatch('targetPriceA', form)
  const targetPriceB = Form.useWatch('targetPriceB', form)

  // 計算供給和餐廳預算（根據組數和目標價）
  const calculateSupplyAndBudget = (teams: number, priceA: number, priceB: number) => {
    const fishASupply = teams * FISH_A_SUPPLY_PER_TEAM
    const fishBSupply = teams * FISH_B_SUPPLY_PER_TEAM
    const restaurantBudgetA = (priceA + RESTAURANT_MARKUP_A) * fishASupply
    const restaurantBudgetB = (priceB + RESTAURANT_MARKUP_B) * fishBSupply

    return { fishASupply, fishBSupply, restaurantBudgetA, restaurantBudgetB }
  }

  // 計算建議初始預算（根據天數、組數、目標價）
  const calculateSuggestedBudget = (teams: number, days: number, priceA: number, priceB: number) => {
    const fishASupply = teams * FISH_A_SUPPLY_PER_TEAM
    const fishBSupply = teams * FISH_B_SUPPLY_PER_TEAM
    // 公式：天數 × (A目標價×組數×150 + B目標價×組數×250) / 組數
    return Math.round(days * (priceA * fishASupply + priceB * fishBSupply) / teams)
  }

  // 當組數或目標價改變時，自動更新供給和餐廳預算
  useEffect(() => {
    if (numTeams && targetPriceA && targetPriceB) {
      const { fishASupply, fishBSupply, restaurantBudgetA, restaurantBudgetB } =
        calculateSupplyAndBudget(numTeams, targetPriceA, targetPriceB)
      form.setFieldsValue({
        defaultFishASupply: fishASupply,
        defaultFishBSupply: fishBSupply,
        defaultFishARestaurantBudget: restaurantBudgetA,
        defaultFishBRestaurantBudget: restaurantBudgetB,
      })
    }
  }, [numTeams, targetPriceA, targetPriceB, form])

  // 計算建議初始預算（即時顯示）
  const suggestedBudget = (numTeams && totalDays && targetPriceA && targetPriceB)
    ? calculateSuggestedBudget(numTeams, totalDays, targetPriceA, targetPriceB)
    : 0

  const defaultValues: GameCreateParams = {
    gameName: `魚市場遊戲-${new Date().toLocaleDateString('zh-TW')}`,
    description: '',
    totalDays: 10,
    numTeams: 12,
    teamNames: Array.from({ length: 12 }, (_, i) => `第 ${String(i + 1).padStart(2, '0')} 組`),
    initialBudget: 1025000,
    dailyInterestRate: 0.0,
    loanInterestRate: 0.03,
    maxLoanRatio: 2.0,
    unsoldFeePerKg: 20,
    fixedUnsoldRatio: 0.025,
    distributorFloorPriceA: 0,
    distributorFloorPriceB: 0,
    targetPriceA: TARGET_PRICE_A,
    targetPriceB: TARGET_PRICE_B,
    defaultFishASupply: 12 * FISH_A_SUPPLY_PER_TEAM,
    defaultFishBSupply: 12 * FISH_B_SUPPLY_PER_TEAM,
    defaultFishARestaurantBudget: (TARGET_PRICE_A + RESTAURANT_MARKUP_A) * 12 * FISH_A_SUPPLY_PER_TEAM,
    defaultFishBRestaurantBudget: (TARGET_PRICE_B + RESTAURANT_MARKUP_B) * 12 * FISH_B_SUPPLY_PER_TEAM,
    buyingDuration: 300,
    sellingDuration: 300,
    clearInventoryDaily: true,
  }

  const onFinish = async (values: GameCreateParams) => {
    setLoading(true)
    try {
      // 自動生成團隊名稱
      values.teamNames = Array.from(
        { length: values.numTeams },
        (_, i) => `第 ${String(i + 1).padStart(2, '0')} 組`
      )

      const response = await api.createGame(values)
      message.success('遊戲創建成功！')

      setTimeout(() => {
        router.push('/admin/control')
      }, 1000)
    } catch (error: any) {
      console.error('創建遊戲失敗:', error)
      message.error(getErrorMessage(error, '創建遊戲失敗'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.setFieldsValue(defaultValues)
    message.info('已重置為預設值')
  }

  const applySuggestedBudget = () => {
    form.setFieldValue('initialBudget', suggestedBudget)
    message.success(`已套用建議預算 $${suggestedBudget.toLocaleString()}`)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>創建新遊戲</Title>
        <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
          重置預設值
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={defaultValues}
        onFinish={onFinish}
        autoComplete="off"
        size="middle"
      >
        {/* ===== 核心參數（最重要）===== */}
        <Card size="small" title="核心參數" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="遊戲名稱"
                name="gameName"
                rules={[{ required: true, message: '請輸入遊戲名稱' }]}
                style={{ marginBottom: 8 }}
              >
                <Input placeholder="例如：2025春季班" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="參與團隊數"
                name="numTeams"
                rules={[{ required: true, message: '請輸入團隊數量' }]}
                style={{ marginBottom: 8 }}
              >
                <InputNumber min={2} max={20} style={{ width: '100%' }} addonAfter="隊" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="遊戲天數"
                name="totalDays"
                rules={[{ required: true, message: '請輸入遊戲天數' }]}
                style={{ marginBottom: 8 }}
              >
                <InputNumber min={1} max={30} style={{ width: '100%' }} addonAfter="天" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ===== 目標價格 ===== */}
        <Card size="small" title="市場價格" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="A魚目標價" name="targetPriceA" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} step={10} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="B魚目標價" name="targetPriceB" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} step={10} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="A魚底價" name="distributorFloorPriceA" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} step={10} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="B魚底價" name="distributorFloorPriceB" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} step={10} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            底價：買入投標不得低於此價格（保護漁民）
          </Text>
        </Card>

        {/* ===== 財務參數 ===== */}
        <Card size="small" title="財務參數" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={10}>
              <Form.Item
                label="初始預算（每隊）"
                name="initialBudget"
                rules={[{ required: true, message: '請輸入初始預算' }]}
                style={{ marginBottom: 8 }}
              >
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: '100%' }}
                  addonBefore="$"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as unknown as 0}
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              {suggestedBudget > 0 && (
                <Alert
                  type="info"
                  showIcon
                  icon={<CalculatorOutlined />}
                  message={
                    <span>
                      建議預算：<strong>${suggestedBudget.toLocaleString()}</strong>
                      <Button type="link" size="small" onClick={applySuggestedBudget} style={{ padding: '0 4px' }}>
                        套用
                      </Button>
                    </span>
                  }
                  style={{ padding: '4px 12px' }}
                />
              )}
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="貸款利息率" name="loanInterestRate" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="最大借貸倍數" name="maxLoanRatio" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} addonAfter="倍" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="每日利息率" name="dailyInterestRate" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* ===== 滯銷設定 ===== */}
        <Card size="small" title="滯銷設定" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="滯銷罰金（每kg）" name="unsoldFeePerKg" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} step={5} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="固定滯銷比例" name="fixedUnsoldRatio" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={0.5} step={0.005} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="每日清空庫存"
                name="clearInventoryDaily"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <Switch checkedChildren="清空" unCheckedChildren="保留" />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            滯銷比例 0.025 = 2.5%，每日賣出前從最高價扣除
          </Text>
        </Card>

        {/* ===== 每日預設參數（動態計算）===== */}
        <Card
          size="small"
          title={
            <span>
              每日預設參數
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                （根據組數自動計算，可手動調整）
              </Text>
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="A魚供給" name="defaultFishASupply" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={50000} step={100} style={{ width: '100%' }} addonAfter="kg" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="B魚供給" name="defaultFishBSupply" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={0} max={50000} step={100} style={{ width: '100%' }} addonAfter="kg" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="A魚餐廳預算" name="defaultFishARestaurantBudget" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: '100%' }}
                  addonBefore="$"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as unknown as 0}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="B魚餐廳預算" name="defaultFishBRestaurantBudget" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber
                  min={0}
                  step={10000}
                  style={{ width: '100%' }}
                  addonBefore="$"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as unknown as 0}
                />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            公式：A供給=組數×150, B供給=組數×250, 餐廳預算=(目標價+加成)×供給, 建議初始預算=天數×(A目標價×A供給+B目標價×B供給)/組數
          </Text>
        </Card>

        {/* ===== 時間設定 ===== */}
        <Card size="small" title="時間設定" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="買入投標時長" name="buyingDuration" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={60} max={3600} step={60} style={{ width: '100%' }} addonAfter="秒" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="賣出投標時長" name="sellingDuration" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                <InputNumber min={60} max={3600} step={60} style={{ width: '100%' }} addonAfter="秒" />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>
            建議 300-600 秒（5-10 分鐘）
          </Text>
        </Card>

        {/* ===== 提交按鈕 ===== */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space size="middle">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<PlusCircleOutlined />}
            >
              創建遊戲
            </Button>
            <Button onClick={() => router.push('/admin')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
