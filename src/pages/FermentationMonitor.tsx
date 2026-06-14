import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Badge,
  Progress,
  Tabs,
  List,
} from 'antd'
import {
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  RiseOutlined,
  FallOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import type { Fermenter, AlarmRecord } from '../types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const FermentationMonitor: React.FC = () => {
  const fermenters = useAppStore((state) => state.fermenters)
  const alarms = useAppStore((state) => state.alarms)
  const confirmAlarm = useAppStore((state) => state.confirmAlarm)
  const resolveAlarm = useAppStore((state) => state.resolveAlarm)
  const refreshData = useAppStore((state) => state.refreshData)
  const currentUser = useAppStore((state) => state.currentUser)

  const [selectedFermenter, setSelectedFermenter] = useState<Fermenter | null>(null)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [isHandleModalVisible, setIsHandleModalVisible] = useState(false)
  const [currentAlarm, setCurrentAlarm] = useState<AlarmRecord | null>(null)
  const [handleType, setHandleType] = useState<'confirm' | 'resolve'>('confirm')
  const [form] = Form.useForm()

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 5000)
    return () => clearInterval(interval)
  }, [refreshData])

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

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: 'success',
      idle: 'default',
      cleaning: 'processing',
      maintenance: 'warning',
      warning: 'warning',
      error: 'error',
    }
    return colorMap[status] || 'default'
  }

  const getAlarmLevelText = (level: string) => {
    const textMap: Record<string, string> = {
      critical: '紧急',
      high: '高级',
      medium: '中级',
      low: '低级',
    }
    return textMap[level] || level
  }

  const getAlarmLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      critical: 'red',
      high: 'orange',
      medium: 'gold',
      low: 'blue',
    }
    return colorMap[level] || 'blue'
  }

  const getAlarmStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      active: '未处理',
      confirmed: '已确认',
      resolved: '已解决',
    }
    return textMap[status] || status
  }

  const getAlarmTypeText = (type: string) => {
    const textMap: Record<string, string> = {
      temperature: '温度报警',
      humidity: '湿度报警',
      alcohol: '酒精度报警',
      pressure: '压力报警',
      equipment: '设备故障',
    }
    return textMap[type] || type
  }

  const handleViewDetail = (fermenter: Fermenter) => {
    setSelectedFermenter(fermenter)
    setIsDetailModalVisible(true)
  }

  const handleAlarm = (alarm: AlarmRecord, type: 'confirm' | 'resolve') => {
    setCurrentAlarm(alarm)
    setHandleType(type)
    form.resetFields()
    setIsHandleModalVisible(true)
  }

  const handleAlarmSubmit = () => {
    form.validateFields().then((values) => {
      if (currentAlarm) {
        if (handleType === 'confirm') {
          confirmAlarm(currentAlarm.id, currentUser.name, values.remark)
          message.success('报警已确认')
        } else {
          resolveAlarm(currentAlarm.id, currentUser.name, values.remark)
          message.success('报警已解决')
        }
        setIsHandleModalVisible(false)
      }
    })
  }

  const generateTrendData = (baseValue: number, range: number, points: number = 24) => {
    const data = []
    let value = baseValue
    for (let i = 0; i < points; i++) {
      value += (Math.random() - 0.5) * range
      data.push(Number(value.toFixed(2)))
    }
    return data
  }

  const timeLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

  const getTrendChartOption = (fermenter: Fermenter) => {
    const tempData = generateTrendData(fermenter.temperature, 2)
    const humidityData = generateTrendData(fermenter.humidity, 5)
    const alcoholData = generateTrendData(fermenter.alcoholContent, 0.5)

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['温度(°C)', '湿度(%)', '酒精度(%vol)'], top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
      xAxis: { type: 'category', data: timeLabels },
      yAxis: [
        { type: 'value', name: '温度/酒精度', position: 'left' },
        { type: 'value', name: '湿度(%)', position: 'right', min: 0, max: 100 },
      ],
      series: [
        {
          name: '温度(°C)',
          type: 'line',
          data: tempData,
          smooth: true,
          itemStyle: { color: '#ff4d4f' },
          areaStyle: { opacity: 0.1 },
          markLine: {
            silent: true,
            data: [
              { yAxis: 35, lineStyle: { color: '#ff4d4f', type: 'dashed' }, label: { formatter: '上限 35°C' } },
              { yAxis: 28, lineStyle: { color: '#52c41a', type: 'dashed' }, label: { formatter: '下限 28°C' } },
            ],
          },
        },
        {
          name: '湿度(%)',
          type: 'line',
          yAxisIndex: 1,
          data: humidityData,
          smooth: true,
          itemStyle: { color: '#1677ff' },
        },
        {
          name: '酒精度(%vol)',
          type: 'line',
          data: alcoholData,
          smooth: true,
          itemStyle: { color: '#722ed1' },
        },
      ],
    }
  }

  const runningCount = fermenters.filter((f) => f.status === 'running' || f.status === 'warning').length
  const idleCount = fermenters.filter((f) => f.status === 'idle').length
  const warningCount = fermenters.filter((f) => f.status === 'warning').length
  const cleaningCount = fermenters.filter((f) => f.status === 'cleaning').length

  const alarmColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '设备',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getAlarmTypeText(type),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={getAlarmLevelColor(level)}>{getAlarmLevelText(level)}</Tag>
      ),
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (value: number, record: AlarmRecord) => (
        <span>
          {value}
          {record.type === 'temperature' ? '°C' : record.type === 'humidity' ? '%' : '%vol'}
        </span>
      ),
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 100,
      render: (value: number, record: AlarmRecord) => (
        <span>
          {value}
          {record.type === 'temperature' ? '°C' : record.type === 'humidity' ? '%' : '%vol'}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'red' : status === 'confirmed' ? 'gold' : 'green'}>
          {getAlarmStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: AlarmRecord) => (
        <Space size="small">
          {record.status === 'active' && (
            <Button type="link" size="small" onClick={() => handleAlarm(record, 'confirm')}>
              确认
            </Button>
          )}
          {(record.status === 'active' || record.status === 'confirmed') && (
            <Button type="link" size="small" onClick={() => handleAlarm(record, 'resolve')}>
              解决
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'all',
      label: '全部报警',
      children: (
        <Table
          columns={alarmColumns}
          dataSource={alarms}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6 }}
        />
      ),
    },
    {
      key: 'active',
      label: '未处理',
      children: (
        <Table
          columns={alarmColumns}
          dataSource={alarms.filter((a) => a.status === 'active')}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6 }}
        />
      ),
    },
    {
      key: 'confirmed',
      label: '已确认',
      children: (
        <Table
          columns={alarmColumns}
          dataSource={alarms.filter((a) => a.status === 'confirmed')}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6 }}
        />
      ),
    },
    {
      key: 'resolved',
      label: '已解决',
      children: (
        <Table
          columns={alarmColumns}
          dataSource={alarms.filter((a) => a.status === 'resolved')}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6 }}
        />
      ),
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="运行中"
              value={runningCount}
              suffix={`/ ${fermenters.length}`}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="告警"
              value={warningCount}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="空闲"
              value={idleCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="清洗中"
              value={cleaningCount}
              prefix={<EnvironmentOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="未处理报警"
              value={alarms.filter((a) => a.status === 'active').length}
              prefix={<BellOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="平均温度"
              value={
                fermenters
                  .filter((f) => f.status === 'running')
                  .reduce((sum, f) => sum + f.temperature, 0) /
                  (runningCount || 1)
              }
              precision={1}
              suffix="°C"
              prefix={<RiseOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card title="发酵罐实时状态" className="card-shadow" extra={<Badge status="processing" text="实时更新中" />}>
            <Row gutter={[12, 12]}>
              {fermenters.map((fermenter) => (
                <Col span={6} key={fermenter.id}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      background:
                        fermenter.status === 'warning'
                          ? '#fffbe6'
                          : fermenter.status === 'error'
                          ? '#fff2f0'
                          : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleViewDetail(fermenter)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 500 }}>{fermenter.name}</span>
                      <Badge status={getStatusColor(fermenter.status) as any} text={getStatusText(fermenter.status)} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>温度</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#ff4d4f' }}>
                          {fermenter.temperature}°C
                        </span>
                      </div>
                      <Progress
                        percent={((fermenter.temperature - 20) / 20) * 100}
                        size="small"
                        strokeColor={fermenter.temperature > 35 ? '#ff4d4f' : '#52c41a'}
                        showInfo={false}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>湿度</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1677ff' }}>
                          {fermenter.humidity}%
                        </span>
                      </div>
                      <Progress
                        percent={fermenter.humidity}
                        size="small"
                        strokeColor="#1677ff"
                        showInfo={false}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>酒精度</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#722ed1' }}>
                        {fermenter.alcoholContent}%vol
                      </span>
                    </div>
                    {fermenter.batchNo && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          {fermenter.batchNo}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#8c8c8c' }}>{fermenter.recipe}</span>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="报警管理" className="card-shadow">
            <Tabs items={tabItems} size="small" />
          </Card>
        </Col>
      </Row>

      <Modal
        title={selectedFermenter?.name + ' - 详细监测'}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedFermenter && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="温度"
                    value={selectedFermenter.temperature}
                    suffix="°C"
                    valueStyle={{ color: selectedFermenter.temperature > 35 ? '#ff4d4f' : '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="湿度" value={selectedFermenter.humidity} suffix="%" valueStyle={{ color: '#1677ff' }} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="酒精度"
                    value={selectedFermenter.alcoholContent}
                    suffix="%vol"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>
            <Card size="small" title="24小时趋势" style={{ marginBottom: 16 }}>
              <ReactECharts option={getTrendChartOption(selectedFermenter)} style={{ height: 280 }} />
            </Card>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="基本信息">
                  <List size="small">
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>设备编号：</span>
                      <span>{selectedFermenter.id}</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>设备状态：</span>
                      <Tag color={getStatusColor(selectedFermenter.status)}>
                        {getStatusText(selectedFermenter.status)}
                      </Tag>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>总容量：</span>
                      <span>{selectedFermenter.capacity.toLocaleString()} L</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>当前容量：</span>
                      <span>{selectedFermenter.currentVolume.toLocaleString()} L</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>累计运行：</span>
                      <span>{selectedFermenter.runHours} 小时</span>
                    </List.Item>
                  </List>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="当前批次">
                  <List size="small">
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>批次号：</span>
                      <span>{selectedFermenter.batchNo || '-'}</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>配方：</span>
                      <span>{selectedFermenter.recipe || '-'}</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>开始时间：</span>
                      <span>{selectedFermenter.startTime || '-'}</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>预计结束：</span>
                      <span>{selectedFermenter.expectedEndTime || '-'}</span>
                    </List.Item>
                    <List.Item>
                      <span style={{ color: '#8c8c8c' }}>冷却系统：</span>
                      <Tag color="green">运行正常</Tag>
                    </List.Item>
                  </List>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      <Modal
        title={handleType === 'confirm' ? '确认报警' : '解决报警'}
        open={isHandleModalVisible}
        onOk={handleAlarmSubmit}
        onCancel={() => setIsHandleModalVisible(false)}
        okText="提交"
        cancelText="取消"
      >
        {currentAlarm && (
          <div>
            <div style={{ marginBottom: 16, padding: 12, background: '#fff2f0', borderRadius: 4 }}>
              <p><strong>设备：</strong>{currentAlarm.deviceName}</p>
              <p><strong>类型：</strong>{getAlarmTypeText(currentAlarm.type)}</p>
              <p><strong>等级：</strong>
                <Tag color={getAlarmLevelColor(currentAlarm.level)}>
                  {getAlarmLevelText(currentAlarm.level)}
                </Tag>
              </p>
              <p><strong>描述：</strong>{currentAlarm.message}</p>
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="remark" label="处理说明" rules={[{ required: true, message: '请填写处理说明' }]}>
                <TextArea rows={3} placeholder="请输入处理说明..." />
              </Form.Item>
              {handleType === 'resolve' && (
                <Form.Item name="solution" label="解决方案">
                  <Select placeholder="选择解决方案">
                    <Option value="adjust">参数调整</Option>
                    <Option value="repair">设备维修</Option>
                    <Option value="clean">清洁维护</Option>
                    <Option value="other">其他</Option>
                  </Select>
                </Form.Item>
              )}
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default FermentationMonitor
