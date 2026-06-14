import { Row, Col, Card, Statistic, Progress, Tag, List, Badge, Space } from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import dayjs from 'dayjs'

const Dashboard: React.FC = () => {
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const rawMaterials = useAppStore((state) => state.rawMaterials)
  const alarms = useAppStore((state) => state.alarms)
  const schedules = useAppStore((state) => state.schedules)
  const productionStats = useAppStore((state) => state.productionStats)
  const maintenanceOrders = useAppStore((state) => state.maintenanceOrders)
  const agingWarehouses = useAppStore((state) => state.agingWarehouses)

  const runningFermenters = fermenters.filter((f) => f.status === 'running' || f.status === 'warning').length
  const runningDistillers = distillers.filter((d) => d.status === 'running').length
  const activeAlarms = alarms.filter((a) => a.status === 'active').length
  const pendingSchedules = schedules.filter((s) => s.status === 'pending').length

  const todayOutput = productionStats
    .filter((s) => s.date === dayjs().format('YYYY-MM-DD'))
    .reduce((sum, s) => sum + s.totalOutput, 0)

  const totalCapacity = agingWarehouses.reduce((sum, w) => sum + w.totalCapacity, 0)
  const totalUsed = agingWarehouses.reduce((sum, w) => sum + w.usedCapacity, 0)

  const productionChartOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['产量(kg)', '出酒率(%)'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: productionStats.slice(-7).map((s) => s.date.slice(5)),
    },
    yAxis: [
      { type: 'value', name: '产量(kg)', position: 'left' },
      { type: 'value', name: '出酒率(%)', position: 'right', min: 30, max: 60 },
    ],
    series: [
      {
        name: '产量(kg)',
        type: 'bar',
        data: productionStats.slice(-7).map((s) => s.totalOutput),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '出酒率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: productionStats.slice(-7).map((s) => s.alcoholYield),
        itemStyle: { color: '#52c41a' },
        smooth: true,
      },
    ],
  }

  const alarmLevelChartOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '报警等级',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: alarms.filter((a) => a.level === 'critical').length, name: '紧急', itemStyle: { color: '#ff4d4f' } },
          { value: alarms.filter((a) => a.level === 'high').length, name: '高级', itemStyle: { color: '#fa8c16' } },
          { value: alarms.filter((a) => a.level === 'medium').length, name: '中级', itemStyle: { color: '#faad14' } },
          { value: alarms.filter((a) => a.level === 'low').length, name: '低级', itemStyle: { color: '#1677ff' } },
        ],
      },
    ],
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: 'green',
      idle: 'default',
      cleaning: 'blue',
      maintenance: 'orange',
      warning: 'gold',
      error: 'red',
    }
    return colorMap[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      running: '运行中',
      idle: '空闲',
      cleaning: '清洗中',
      maintenance: '维护中',
      warning: '告警',
      error: '故障',
    }
    return textMap[status] || status
  }

  const getAlarmLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      critical: '#ff4d4f',
      high: '#fa8c16',
      medium: '#faad14',
      low: '#1677ff',
    }
    return colorMap[level] || '#1677ff'
  }

  const getShiftText = (shift: string) => {
    const textMap: Record<string, string> = {
      morning: '早班',
      afternoon: '中班',
      night: '夜班',
    }
    return textMap[shift] || shift
  }

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="运行中发酵罐"
              value={runningFermenters}
              suffix={`/ ${fermenters.length}`}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              使用率 {((runningFermenters / fermenters.length) * 100).toFixed(1)}%
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="今日产量"
              value={todayOutput}
              suffix="kg"
              prefix={<RiseOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              <Space>
                <span>出酒率 42.5%</span>
                <Tag color="green" icon={<RiseOutlined />}>+1.2%</Tag>
              </Space>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="待处理报警"
              value={activeAlarms}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              <Space>
                <Badge status="error" text="紧急 1" />
                <Badge status="warning" text="高级 2" />
              </Space>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="待审批排程"
              value={pendingSchedules}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              维护工单 {maintenanceOrders.filter((o) => o.status !== 'completed').length} 个进行中
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="近7天生产趋势" className="card-shadow">
            <ReactECharts option={productionChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="报警等级分布" className="card-shadow">
            <ReactECharts option={alarmLevelChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="发酵罐状态概览" className="card-shadow">
            <Row gutter={[8, 8]}>
              {fermenters.slice(0, 8).map((f) => (
                <Col span={6} key={f.id}>
                  <Card
                    size="small"
                    style={{ textAlign: 'center', background: f.status === 'warning' ? '#fffbe6' : undefined }}
                  >
                    <Badge status={getStatusColor(f.status) as any} text={f.name} />
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 600 }}>
                      {f.temperature}°C
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                      酒精度 {f.alcoholContent}%vol
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col span={7}>
          <Card title="实时报警" className="card-shadow">
            <List
              size="small"
              dataSource={alarms.slice(0, 5)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: getAlarmLevelColor(item.level), fontSize: 20 }} />}
                    title={
                      <Space>
                        <span style={{ fontSize: 14 }}>{item.deviceName}</span>
                        <Tag color={item.status === 'active' ? 'red' : item.status === 'confirmed' ? 'gold' : 'green'}>
                          {item.status === 'active' ? '未处理' : item.status === 'confirmed' ? '已确认' : '已解决'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: 12 }}>{item.message}</div>
                        <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                          {dayjs(item.time).format('MM-DD HH:mm')}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={7}>
          <Card title="今日排程" className="card-shadow">
            <List
              size="small"
              dataSource={schedules.filter((s) => s.date === dayjs().format('YYYY-MM-DD'))}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
                    title={
                      <Space>
                        <span style={{ fontSize: 13 }}>{item.recipeName}</span>
                        <Tag color="blue">{getShiftText(item.shift)}</Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: 12 }}>
                          {item.fermenterName} | {item.batchNo}
                        </div>
                        <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                          {dayjs(item.startTime).format('HH:mm')} - {dayjs(item.endTime).format('HH:mm')}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="原料库存概览" className="card-shadow">
            <Row gutter={[16, 16]}>
              {rawMaterials.slice(0, 4).map((m) => (
                <Col span={12} key={m.id}>
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 500 }}>{m.name}</span>
                      <Tag color={m.quantity < m.safeStock ? 'red' : 'green'}>
                        {m.quantity < m.safeStock ? '库存不足' : '充足'}
                      </Tag>
                    </div>
                    <Progress
                      percent={Math.min((m.quantity / (m.safeStock * 3)) * 100, 100)}
                      size="small"
                      status={m.quantity < m.safeStock ? 'exception' : 'normal'}
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                      {m.quantity.toLocaleString()} {m.unit} / 安全库存 {m.safeStock.toLocaleString()}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="陈酿仓库库容" className="card-shadow">
            <Row gutter={[16, 16]}>
              {agingWarehouses.map((w) => (
                <Col span={12} key={w.id}>
                  <div style={{ padding: '12px', background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>{w.name}</div>
                    <Progress
                      percent={(w.usedCapacity / w.totalCapacity) * 100}
                      size="small"
                      strokeColor="#722ed1"
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                      {(w.usedCapacity / 1000).toFixed(0)}k / {(w.totalCapacity / 1000).toFixed(0)}k L
                    </div>
                    <div style={{ fontSize: 11, color: '#bfbfbf' }}>
                      温度 {w.temperature}°C | 湿度 {w.humidity}%
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
