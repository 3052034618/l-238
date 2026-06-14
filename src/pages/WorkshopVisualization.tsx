import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Space,
  Tooltip,
  Modal,
  List,
  Progress,
  Select,
} from 'antd'
import {
  AppstoreOutlined,
  ThunderboltOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import type { Fermenter, Distiller } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const WorkshopVisualization: React.FC = () => {
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const agingWarehouses = useAppStore((state) => state.agingWarehouses)
  const alarms = useAppStore((state) => state.alarms)
  const refreshData = useAppStore((state) => state.refreshData)

  const [selectedEquipment, setSelectedEquipment] = useState<Fermenter | Distiller | null>(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [heatmapType, setHeatmapType] = useState<'status' | 'temperature' | 'utilization'>('status')

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 3000)
    return () => clearInterval(interval)
  }, [refreshData])

  const runningFermenters = fermenters.filter((f) => f.status === 'running' || f.status === 'warning').length
  const runningDistillers = distillers.filter((d) => d.status === 'running').length
  const activeAlarms = alarms.filter((a) => a.status === 'active').length

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: '#52c41a',
      idle: '#bfbfbf',
      cleaning: '#1677ff',
      maintenance: '#faad14',
      warning: '#fa8c16',
      error: '#ff4d4f',
    }
    return colorMap[status] || '#bfbfbf'
  }

  const getStatusBgColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: '#f6ffed',
      idle: '#fafafa',
      cleaning: '#e6f7ff',
      maintenance: '#fffbe6',
      warning: '#fff7e6',
      error: '#fff2f0',
    }
    return colorMap[status] || '#fafafa'
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

  const getHeatColor = (value: number, min: number, max: number) => {
    const ratio = (value - min) / (max - min)
    if (ratio < 0.33) return '#52c41a'
    if (ratio < 0.66) return '#faad14'
    return '#ff4d4f'
  }

  const handleEquipmentClick = (equipment: Fermenter | Distiller) => {
    setSelectedEquipment(equipment)
    setIsDetailVisible(true)
  }

  const heatmapData = [
    [0, 0, 80],
    [0, 1, 95],
    [0, 2, 70],
    [0, 3, 88],
    [1, 0, 65],
    [1, 1, 92],
    [1, 2, 45],
    [1, 3, 78],
    [2, 0, 85],
    [2, 1, 0],
    [2, 2, 75],
    [2, 3, 90],
  ]

  const heatmapOption = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const { value } = params
        return `利用率: ${value[2]}%`
      },
    },
    grid: { height: '60%', top: '10%' },
    xAxis: {
      type: 'category',
      data: ['1列', '2列', '3列', '4列'],
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: ['第一排', '第二排', '第三排'],
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#52c41a', '#faad14', '#ff4d4f'],
      },
    },
    series: [
      {
        name: '利用率',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: any) => `${params.value[2]}%`,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }

  const distillerHeatmapOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: distillers.map((d) => d.name),
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '利用率',
        type: 'bar',
        data: distillers.map((d) => (d.status === 'running' ? 85 + Math.random() * 15 : 0)),
        itemStyle: {
          color: (params: any) => {
            if (params.value > 90) return '#ff4d4f'
            if (params.value > 70) return '#52c41a'
            return '#bfbfbf'
          },
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
        },
      },
    ],
  }

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="运行中发酵罐"
              value={runningFermenters}
              suffix={`/ ${fermenters.length}`}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="运行中蒸馏设备"
              value={runningDistillers}
              suffix={`/ ${distillers.length}`}
              prefix={<AppstoreOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="活跃报警"
              value={activeAlarms}
              prefix={<InfoCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="平均利用率"
              value={72.5}
              suffix="%"
              prefix={<EnvironmentOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="陈酿库存"
              value={5.35}
              suffix="百万升"
              prefix={<SettingOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={18}>
          <Card
            title="车间布局图 - 发酵罐区"
            className="card-shadow"
            extra={
              <Space>
                <Select
                  value={heatmapType}
                  onChange={setHeatmapType}
                  style={{ width: 120 }}
                  size="small"
                >
                  <Option value="status">设备状态</Option>
                  <Option value="temperature">温度热力</Option>
                  <Option value="utilization">利用率</Option>
                </Select>
                <Button size="small" icon={<ReloadOutlined />} onClick={refreshData}>
                  刷新
                </Button>
              </Space>
            }
          >
            {heatmapType === 'status' && (
              <div style={{ padding: 20, background: '#fafafa', borderRadius: 8 }}>
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <Tag color="green">运行中</Tag>
                  <Tag color="default">空闲</Tag>
                  <Tag color="blue">清洗中</Tag>
                  <Tag color="orange">维护中</Tag>
                  <Tag color="gold">告警</Tag>
                  <Tag color="red">故障</Tag>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    padding: 20,
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                  }}
                >
                  {fermenters.map((fermenter) => (
                    <Tooltip
                      key={fermenter.id}
                      title={
                        <div>
                          <p><strong>{fermenter.name}</strong></p>
                          <p>状态: {getStatusText(fermenter.status)}</p>
                          <p>温度: {fermenter.temperature}°C</p>
                          <p>湿度: {fermenter.humidity}%</p>
                          <p>酒精度: {fermenter.alcoholContent}%vol</p>
                          {fermenter.batchNo && <p>批次: {fermenter.batchNo}</p>}
                        </div>
                      }
                    >
                      <div
                        onClick={() => handleEquipmentClick(fermenter)}
                        style={{
                          padding: 16,
                          background: getStatusBgColor(fermenter.status),
                          border: `2px solid ${getStatusColor(fermenter.status)}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.3s',
                          minHeight: 100,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{fermenter.name}</div>
                        <Tag color={fermenter.status === 'running' ? 'green' : fermenter.status === 'warning' ? 'gold' : 'default'}>
                          {getStatusText(fermenter.status)}
                        </Tag>
                        {(fermenter.status === 'running' || fermenter.status === 'warning') && (
                          <div style={{ marginTop: 8, fontSize: 12 }}>
                            <div style={{ color: '#ff4d4f', fontWeight: 500 }}>{fermenter.temperature}°C</div>
                            <div style={{ color: '#8c8c8c', fontSize: 11 }}>
                              {fermenter.alcoholContent}%vol
                            </div>
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#8c8c8c' }}>
                  点击设备卡片查看详细信息
                </div>
              </div>
            )}

            {heatmapType === 'temperature' && (
              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <span style={{ color: '#52c41a' }}>● 低温</span>
                  <span style={{ margin: '0 20px', color: '#faad14' }}>● 中温</span>
                  <span style={{ color: '#ff4d4f' }}>● 高温</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 16,
                    padding: 20,
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                  }}
                >
                  {fermenters.map((fermenter) => {
                    const tempColor = fermenter.temperature > 34
                      ? '#ff4d4f'
                      : fermenter.temperature > 30
                      ? '#faad14'
                      : '#52c41a'
                    return (
                      <Tooltip
                        key={fermenter.id}
                        title={`${fermenter.name}: ${fermenter.temperature}°C`}
                      >
                        <div
                          onClick={() => handleEquipmentClick(fermenter)}
                          style={{
                            padding: 20,
                            background: fermenter.status === 'idle' || fermenter.status === 'cleaning'
                              ? '#f5f5f5'
                              : tempColor + '33',
                            border: `3px solid ${fermenter.status === 'idle' ? '#d9d9d9' : tempColor}`,
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'center',
                            minHeight: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: fermenter.status === 'idle' ? '#bfbfbf' : tempColor }}>
                              {fermenter.status === 'idle' || fermenter.status === 'cleaning'
                                ? '-'
                                : fermenter.temperature + '°C'}
                            </div>
                            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                              {fermenter.name}
                            </div>
                          </div>
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )}

            {heatmapType === 'utilization' && (
              <ReactECharts option={heatmapOption} style={{ height: 350 }} />
            )}
          </Card>
        </Col>

        <Col span={6}>
          <Card title="图例说明" className="card-shadow" style={{ marginBottom: 16 }}>
            <List
              size="small"
              dataSource={[
                { status: 'running', label: '运行中', color: '#52c41a', count: runningFermenters },
                { status: 'idle', label: '空闲', color: '#bfbfbf', count: fermenters.filter((f) => f.status === 'idle').length },
                { status: 'cleaning', label: '清洗中', color: '#1677ff', count: fermenters.filter((f) => f.status === 'cleaning').length },
                { status: 'maintenance', label: '维护中', color: '#faad14', count: fermenters.filter((f) => f.status === 'maintenance').length },
                { status: 'warning', label: '告警', color: '#fa8c16', count: fermenters.filter((f) => f.status === 'warning').length },
                { status: 'error', label: '故障', color: '#ff4d4f', count: fermenters.filter((f) => f.status === 'error').length },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <span>{item.label}</span>
                  </Space>
                  <span style={{ fontWeight: 600 }}>{item.count} 台</span>
                </List.Item>
              )}
            />
          </Card>

          <Card title="实时告警" className="card-shadow">
            <List
              size="small"
              dataSource={alarms.filter((a) => a.status !== 'resolved').slice(0, 5)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: item.level === 'critical' || item.level === 'high' ? '#ff4d4f' : '#faad14',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    }
                    title={<span style={{ fontSize: 12 }}>{item.deviceName}</span>}
                    description={<span style={{ fontSize: 11 }}>{item.message}</span>}
                  />
                </List.Item>
              )}
            />
            {alarms.filter((a) => a.status !== 'resolved').length === 0 && (
              <div style={{ textAlign: 'center', padding: 20, color: '#52c41a' }}>
                暂无告警
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="蒸馏设备区" className="card-shadow">
            <div
              style={{
                display: 'flex',
                gap: 16,
                padding: 20,
                background: '#fafafa',
                borderRadius: 8,
                justifyContent: 'space-around',
              }}
            >
              {distillers.map((distiller) => (
                <Tooltip
                  key={distiller.id}
                  title={
                    <div>
                      <p><strong>{distiller.name}</strong></p>
                      <p>状态: {getStatusText(distiller.status)}</p>
                      {distiller.status === 'running' && (
                        <>
                          <p>温度: {distiller.temperature}°C</p>
                          <p>压力: {distiller.pressure} MPa</p>
                        </>
                      )}
                    </div>
                  }
                >
                  <div
                    onClick={() => handleEquipmentClick(distiller)}
                    style={{
                      flex: 1,
                      padding: 20,
                      background: getStatusBgColor(distiller.status),
                      border: `2px solid ${getStatusColor(distiller.status)}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
                    <div style={{ fontWeight: 600 }}>{distiller.name}</div>
                    <Tag color={distiller.status === 'running' ? 'green' : 'default'} style={{ marginTop: 8 }}>
                      {getStatusText(distiller.status)}
                    </Tag>
                    {distiller.status === 'running' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                        <div>{distiller.temperature}°C</div>
                        <div>{distiller.pressure} MPa</div>
                      </div>
                    )}
                  </div>
                </Tooltip>
              ))}
            </div>
            <ReactECharts option={distillerHeatmapOption} style={{ height: 200, marginTop: 16 }} />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="陈酿仓库区" className="card-shadow">
            <Row gutter={[12, 12]}>
              {agingWarehouses.map((warehouse) => (
                <Col span={12} key={warehouse.id}>
                  <div
                    style={{
                      padding: 16,
                      background: '#f9f0ff',
                      border: '1px solid #d3adf7',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{warehouse.name}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                      {warehouse.location}
                    </div>
                    <Progress
                      percent={(warehouse.usedCapacity / warehouse.totalCapacity) * 100}
                      size="small"
                      strokeColor="#722ed1"
                    />
                    <div style={{ marginTop: 8, fontSize: 11, color: '#8c8c8c' }}>
                      温度: {warehouse.temperature}°C | 湿度: {warehouse.humidity}%
                    </div>
                    {warehouse.barrels > 0 && (
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                        酒桶: {warehouse.barrels} 个
                      </div>
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title={selectedEquipment?.name + ' - 设备详情'}
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedEquipment && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <p><strong>设备编号：</strong>{selectedEquipment.id}</p>
                <p>
                  <strong>状态：</strong>
                  <Tag color={selectedEquipment.status === 'running' ? 'green' : selectedEquipment.status === 'warning' ? 'gold' : 'default'}>
                    {getStatusText(selectedEquipment.status)}
                  </Tag>
                </p>
                <p><strong>位置：</strong>第{selectedEquipment.position.row + 1}排 第{selectedEquipment.position.col + 1}列</p>
              </Col>
              <Col span={12}>
                {'temperature' in selectedEquipment && (
                  <>
                    <p><strong>当前温度：</strong>{selectedEquipment.temperature}°C</p>
                  </>
                )}
                {'humidity' in selectedEquipment && (
                  <p><strong>当前湿度：</strong>{(selectedEquipment as Fermenter).humidity}%</p>
                )}
                {'alcoholContent' in selectedEquipment && (
                  <p><strong>酒精度：</strong>{(selectedEquipment as Fermenter).alcoholContent}%vol</p>
                )}
                {'pressure' in selectedEquipment && (
                  <p><strong>压力：</strong>{(selectedEquipment as Distiller).pressure} MPa</p>
                )}
              </Col>
            </Row>
            {'capacity' in selectedEquipment && (
              <div style={{ marginBottom: 16 }}>
                <strong>容量：</strong>{(selectedEquipment as Fermenter).capacity.toLocaleString()} L
                {'currentVolume' in selectedEquipment && (
                  <span> | 当前装料: {(selectedEquipment as Fermenter).currentVolume.toLocaleString()} L</span>
                )}
              </div>
            )}
            {'batchNo' in selectedEquipment && (selectedEquipment as Fermenter).batchNo && (
              <div style={{ padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
                <p><strong>当前批次：</strong>{(selectedEquipment as Fermenter).batchNo}</p>
                <p><strong>配方：</strong>{(selectedEquipment as Fermenter).recipe}</p>
                <p><strong>开始时间：</strong>{(selectedEquipment as Fermenter).startTime}</p>
                <p><strong>预计结束：</strong>{(selectedEquipment as Fermenter).expectedEndTime}</p>
              </div>
            )}
            {'runHours' in selectedEquipment && (
              <div style={{ marginTop: 16 }}>
                <strong>累计运行时长：</strong>{selectedEquipment.runHours} 小时
                <Progress
                  percent={Math.min((selectedEquipment.runHours / 5000) * 100, 100)}
                  size="small"
                  strokeColor={selectedEquipment.runHours > 4000 ? '#ff4d4f' : '#52c41a'}
                  style={{ marginTop: 8 }}
                />
                <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                  下次维护: 还剩 {Math.max(0, 5000 - selectedEquipment.runHours)} 小时
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default WorkshopVisualization
