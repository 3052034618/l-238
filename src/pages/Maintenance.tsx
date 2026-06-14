import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  List,
  Progress,
} from 'antd'
import {
  ToolOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import type { MaintenanceOrder, SparePart } from '../types'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const Maintenance: React.FC = () => {
  const maintenanceOrders = useAppStore((state) => state.maintenanceOrders)
  const spareParts = useAppStore((state) => state.spareParts)
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const addMaintenanceOrder = useAppStore((state) => state.addMaintenanceOrder)
  const updateMaintenanceOrder = useAppStore((state) => state.updateMaintenanceOrder)
  const currentUser = useAppStore((state) => state.currentUser)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<MaintenanceOrder | null>(null)
  const [modalType, setModalType] = useState<'create' | 'process'>('create')
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('orders')

  const pendingCount = maintenanceOrders.filter((o) => o.status === 'pending').length
  const processingCount = maintenanceOrders.filter((o) => o.status === 'processing' || o.status === 'assigned').length
  const completedCount = maintenanceOrders.filter((o) => o.status === 'completed').length
  const lowStockParts = spareParts.filter((p) => p.quantity < p.safeStock).length

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待分配',
      assigned: '已派单',
      processing: '处理中',
      completed: '已完成',
    }
    return textMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'gold',
      assigned: 'blue',
      processing: 'processing',
      completed: 'green',
    }
    return colorMap[status] || 'default'
  }

  const getTypeText = (type: string) => {
    const textMap: Record<string, string> = {
      routine: '日常保养',
      fault: '故障维修',
      preventive: '预防性维护',
    }
    return textMap[type] || type
  }

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      routine: 'blue',
      fault: 'red',
      preventive: 'green',
    }
    return colorMap[type] || 'default'
  }

  const getPriorityText = (priority: string) => {
    const textMap: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    }
    return textMap[priority] || priority
  }

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: 'default',
      medium: 'gold',
      high: 'red',
    }
    return colorMap[priority] || 'default'
  }

  const handleCreate = () => {
    setModalType('create')
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleProcess = (order: MaintenanceOrder) => {
    setModalType('process')
    setCurrentOrder(order)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleViewDetail = (order: MaintenanceOrder) => {
    setCurrentOrder(order)
    setIsDetailVisible(true)
  }

  const handleComplete = (order: MaintenanceOrder) => {
    Modal.confirm({
      title: '完成工单',
      content: `确定完成工单 ${order.orderNo} 吗？`,
      onOk: () => {
        updateMaintenanceOrder(order.id, {
          status: 'completed',
          completeTime: dayjs().format('YYYY-MM-DD HH:mm'),
          remark: '维修完成，设备运行正常',
        })
        message.success('工单已完成')
      },
    })
  }

  const handleAssign = (order: MaintenanceOrder) => {
    Modal.confirm({
      title: '派单确认',
      content: `确定将工单 ${order.orderNo} 分配给维修一班吗？`,
      onOk: () => {
        updateMaintenanceOrder(order.id, {
          status: 'assigned',
          assignedTeam: '维修一班',
          assignedTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        message.success('工单已派单')
      },
    })
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (modalType === 'create') {
        const newOrder: MaintenanceOrder = {
          id: `MO${Date.now()}`,
          orderNo: `WT${dayjs().format('YYYYMMDD')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          equipmentId: values.equipmentId,
          equipmentName:
            fermenters.find((f) => f.id === values.equipmentId)?.name ||
            distillers.find((d) => d.id === values.equipmentId)?.name ||
            '',
          equipmentType: values.equipmentId.startsWith('F') ? 'fermenter' : 'distiller',
          type: values.type,
          status: 'pending',
          priority: values.priority,
          description: values.description,
          createTime: dayjs().format('YYYY-MM-DD HH:mm'),
          partsUsed: [],
        }
        addMaintenanceOrder(newOrder)
        message.success('工单已创建')
      } else if (modalType === 'process' && currentOrder) {
        updateMaintenanceOrder(currentOrder.id, {
          status: 'processing',
          startTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        message.success('已开始处理')
      }
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  const generateMaintenanceOrders = () => {
    message.loading({ content: '正在根据运行时长生成维保工单...', key: 'generate' })
    setTimeout(() => {
      const allEquipments = [
        ...fermenters.map((f) => ({ id: f.id, name: f.name, type: 'fermenter' as const, hours: f.runHours })),
        ...distillers.map((d) => ({ id: d.id, name: d.name, type: 'distiller' as const, hours: d.runHours })),
      ]
      const needMaintenance = allEquipments.filter((e) => e.hours > 2000)
      needMaintenance.forEach((eq, index) => {
        const newOrder: MaintenanceOrder = {
          id: `MO${Date.now()}-${index}`,
          orderNo: `WT${dayjs().format('YYYYMMDD')}${(100 + index).toString().padStart(3, '0')}`,
          equipmentId: eq.id,
          equipmentName: eq.name,
          equipmentType: eq.type,
          type: 'preventive',
          status: 'pending',
          priority: 'medium',
          description: `设备累计运行${eq.hours}小时，需进行预防性维护`,
          createTime: dayjs().format('YYYY-MM-DD HH:mm'),
          partsUsed: [],
        }
        addMaintenanceOrder(newOrder)
      })
      message.success({ content: `已生成 ${needMaintenance.length} 条维保工单`, key: 'generate' })
    }, 1500)
  }

  const orderColumns = [
    {
      title: '工单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 140,
    },
    {
      title: '设备名称',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag color={getTypeColor(type)}>{getTypeText(type)}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{getPriorityText(priority)}</Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: MaintenanceOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => handleAssign(record)}>
              派单
            </Button>
          )}
          {record.status === 'assigned' && (
            <Button type="link" size="small" onClick={() => handleProcess(record)}>
              开始处理
            </Button>
          )}
          {record.status === 'processing' && (
            <Button type="link" size="small" onClick={() => handleComplete(record)}>
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const partColumns = [
    {
      title: '备件名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '规格',
      dataIndex: 'spec',
      key: 'spec',
      width: 200,
    },
    {
      title: '库存数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty: number, record: SparePart) => (
        <span style={{ color: qty < record.safeStock ? '#ff4d4f' : undefined, fontWeight: qty < record.safeStock ? 600 : undefined }}>
          {qty} {record.unit}
        </span>
      ),
    },
    {
      title: '安全库存',
      dataIndex: 'safeStock',
      key: 'safeStock',
      width: 100,
      render: (qty: number, record: SparePart) => `${qty} ${record.unit}`,
    },
    {
      title: '库存状态',
      key: 'status',
      width: 100,
      render: (_: any, record: SparePart) => (
        <Tag color={record.quantity < record.safeStock ? 'red' : 'green'}>
          {record.quantity < record.safeStock ? '库存不足' : '充足'}
        </Tag>
      ),
    },
    {
      title: '存放位置',
      dataIndex: 'location',
      key: 'location',
      width: 120,
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      width: 150,
    },
  ]

  const equipmentUtilizationOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['发酵罐利用率', '蒸馏设备利用率'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '发酵罐利用率',
        type: 'line',
        data: [78, 82, 75, 88, 85, 72, 68],
        smooth: true,
        itemStyle: { color: '#1677ff' },
        areaStyle: { opacity: 0.2, color: '#1677ff' },
      },
      {
        name: '蒸馏设备利用率',
        type: 'line',
        data: [65, 70, 68, 75, 72, 60, 55],
        smooth: true,
        itemStyle: { color: '#52c41a' },
        areaStyle: { opacity: 0.2, color: '#52c41a' },
      },
    ],
  }

  const maintenanceTypeOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '维保类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: maintenanceOrders.filter((o) => o.type === 'routine').length, name: '日常保养', itemStyle: { color: '#1677ff' } },
          { value: maintenanceOrders.filter((o) => o.type === 'fault').length, name: '故障维修', itemStyle: { color: '#ff4d4f' } },
          { value: maintenanceOrders.filter((o) => o.type === 'preventive').length, name: '预防性维护', itemStyle: { color: '#52c41a' } },
        ],
      },
    ],
  }

  const tabItems = [
    {
      key: 'orders',
      label: '维保工单',
      children: (
        <Table columns={orderColumns} dataSource={maintenanceOrders} rowKey="id" pagination={{ pageSize: 8 }} />
      ),
    },
    {
      key: 'parts',
      label: '备件库存',
      children: (
        <Table columns={partColumns} dataSource={spareParts} rowKey="id" pagination={{ pageSize: 8 }} />
      ),
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="待处理工单"
              value={pendingCount + processingCount}
              prefix={<ToolOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="处理中"
              value={processingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="已完成"
              value={completedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="库存不足备件"
              value={lowStockParts}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="设备平均利用率"
              value={78.5}
              suffix="%"
              prefix={<SettingOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="设备利用率趋势" className="card-shadow">
            <ReactECharts option={equipmentUtilizationOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card title="维保类型分布" className="card-shadow">
            <ReactECharts option={maintenanceTypeOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="设备运行时长排行" className="card-shadow">
            <List
              size="small"
              dataSource={[...fermenters, ...distillers]
                .sort((a, b) => b.runHours - a.runHours)
                .slice(0, 6)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<RocketOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                    title={item.name}
                    description={`累计运行 ${item.runHours} 小时`}
                  />
                  <Progress
                    type="dashboard"
                    percent={Math.min((item.runHours / 5000) * 100, 100)}
                    size={40}
                    strokeColor={item.runHours > 4000 ? '#ff4d4f' : '#52c41a'}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="设备维保管理"
        className="card-shadow"
        style={{ marginTop: 16 }}
        tabList={tabItems}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
        extra={
          <Space>
            <Button icon={<ToolOutlined />} onClick={generateMaintenanceOrders}>
              自动生成工单
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建工单
            </Button>
          </Space>
        }
      >
        {activeTab === 'orders' ? (
          <Table columns={orderColumns} dataSource={maintenanceOrders} rowKey="id" pagination={{ pageSize: 8 }} />
        ) : (
          <Table columns={partColumns} dataSource={spareParts} rowKey="id" pagination={{ pageSize: 8 }} />
        )}
      </Card>

      <Modal
        title={modalType === 'create' ? '新建维保工单' : '开始处理工单'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {modalType === 'create' ? (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="equipmentId" label="设备" rules={[{ required: true, message: '请选择设备' }]}>
                    <Select placeholder="请选择设备">
                      <Select.OptGroup label="发酵罐">
                        {fermenters.map((f) => (
                          <Option key={f.id} value={f.id}>
                            {f.name}
                          </Option>
                        ))}
                      </Select.OptGroup>
                      <Select.OptGroup label="蒸馏设备">
                        {distillers.map((d) => (
                          <Option key={d.id} value={d.id}>
                            {d.name}
                          </Option>
                        ))}
                      </Select.OptGroup>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="type" label="维保类型" rules={[{ required: true, message: '请选择类型' }]}>
                    <Select placeholder="请选择">
                      <Option value="routine">日常保养</Option>
                      <Option value="fault">故障维修</Option>
                      <Option value="preventive">预防性维护</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
                <Select placeholder="请选择">
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                </Select>
              </Form.Item>
              <Form.Item name="description" label="问题描述" rules={[{ required: true, message: '请填写问题描述' }]}>
                <TextArea rows={4} placeholder="请详细描述故障或维保需求..." />
              </Form.Item>
            </>
          ) : (
            <div>
              <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                <p><strong>工单号：</strong>{currentOrder?.orderNo}</p>
                <p><strong>设备：</strong>{currentOrder?.equipmentName}</p>
                <p><strong>类型：</strong>{getTypeText(currentOrder?.type || '')}</p>
                <p><strong>描述：</strong>{currentOrder?.description}</p>
              </div>
              <Form.Item name="remark" label="处理说明">
                <TextArea rows={3} placeholder="请输入处理说明（可选）" />
              </Form.Item>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="工单详情"
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentOrder && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <p><strong>工单号：</strong>{currentOrder.orderNo}</p>
                <p><strong>设备名称：</strong>{currentOrder.equipmentName}</p>
                <p>
                  <strong>类型：</strong>
                  <Tag color={getTypeColor(currentOrder.type)}>{getTypeText(currentOrder.type)}</Tag>
                </p>
                <p>
                  <strong>优先级：</strong>
                  <Tag color={getPriorityColor(currentOrder.priority)}>
                    {getPriorityText(currentOrder.priority)}
                  </Tag>
                </p>
              </Col>
              <Col span={12}>
                <p>
                  <strong>状态：</strong>
                  <Tag color={getStatusColor(currentOrder.status)}>{getStatusText(currentOrder.status)}</Tag>
                </p>
                <p><strong>创建时间：</strong>{currentOrder.createTime}</p>
                <p><strong>分配班组：</strong>{currentOrder.assignedTeam || '-'}</p>
                <p><strong>开始时间：</strong>{currentOrder.startTime || '-'}</p>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <strong>问题描述：</strong>
              <p style={{ marginTop: 4 }}>{currentOrder.description}</p>
            </div>
            {currentOrder.partsUsed.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>使用备件：</strong>
                <List
                  size="small"
                  dataSource={currentOrder.partsUsed}
                  renderItem={(item) => (
                    <List.Item>
                      <span>{item.partName}</span>
                      <span>x {item.quantity}</span>
                    </List.Item>
                  )}
                  style={{ marginTop: 4 }}
                />
              </div>
            )}
            {currentOrder.remark && (
              <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
                <strong>处理备注：</strong>{currentOrder.remark}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Maintenance
