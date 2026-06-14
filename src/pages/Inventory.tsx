import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  Progress,
} from 'antd'
import {
  DatabaseOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InboxOutlined,
  AppstoreOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const Inventory: React.FC = () => {
  const rawMaterials = useAppStore((state) => state.rawMaterials)
  const agingWarehouses = useAppStore((state) => state.agingWarehouses)
  const spareParts = useAppStore((state) => state.spareParts)
  const stockIn = useAppStore((state) => state.stockIn)
  const stockOut = useAppStore((state) => state.stockOut)
  const getRawMaterial = useAppStore((state) => state.getRawMaterial)
  const getSparePart = useAppStore((state) => state.getSparePart)
  const getAgingWarehouse = useAppStore((state) => state.getAgingWarehouse)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'in' | 'out'>('in')
  const [activeTab, setActiveTab] = useState('raw')
  const [form] = Form.useForm()

  const totalRawMaterials = rawMaterials.reduce((sum, m) => sum + m.quantity, 0)
  const lowStockCount = rawMaterials.filter((m) => m.quantity < m.safeStock).length
  const lowSpareParts = spareParts.filter((p) => p.quantity < p.safeStock).length
  const totalWarehouseCapacity = agingWarehouses.reduce((sum, w) => sum + w.totalCapacity, 0)
  const totalUsedCapacity = agingWarehouses.reduce((sum, w) => sum + w.usedCapacity, 0)

  const getCategoryText = (category: string) => {
    const textMap: Record<string, string> = {
      grain: '粮食原料',
      water: '酿造用水',
      yeast: '酒曲',
      auxiliary: '辅料',
    }
    return textMap[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      grain: 'geekblue',
      water: 'blue',
      yeast: 'green',
      auxiliary: 'purple',
    }
    return colorMap[category] || 'default'
  }

  const handleStockIn = () => {
    setModalType('in')
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleStockOut = () => {
    setModalType('out')
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const { materialId, quantity, batchNo } = values
      const type = activeTab === 'raw' ? 'raw' : activeTab === 'spare' ? 'spare' : 'aging'
      
      if (modalType === 'out') {
        if (type === 'raw') {
          const material = getRawMaterial(materialId)
          if (material && quantity > material.quantity) {
            message.error(`出库失败！${material.name} 库存不足，当前库存: ${material.quantity.toLocaleString()} ${material.unit}`)
            return
          }
        } else if (type === 'spare') {
          const part = getSparePart(materialId)
          if (part && quantity > part.quantity) {
            message.error(`出库失败！${part.name} 库存不足，当前库存: ${part.quantity} ${part.unit}`)
            return
          }
        } else if (type === 'aging') {
          const warehouse = getAgingWarehouse(materialId)
          if (warehouse && quantity > warehouse.usedCapacity) {
            message.error(`出库失败！${warehouse.name} 当前存量: ${(warehouse.usedCapacity / 1000).toFixed(0)}k L`)
            return
          }
        }
        const success = stockOut(type, materialId, quantity, batchNo)
        if (success) {
          message.success('出库成功')
        } else {
          message.error('出库失败，库存不足')
          return
        }
      } else {
        stockIn(type, materialId, quantity, batchNo)
        message.success('入库成功')
      }
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  const rawColumns = [
    {
      title: '原料名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={getCategoryColor(category)}>{getCategoryText(category)}</Tag>
      ),
    },
    {
      title: '当前库存',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (qty: number, record: any) => (
        <span style={{ color: qty < record.safeStock ? '#ff4d4f' : undefined, fontWeight: qty < record.safeStock ? 600 : undefined }}>
          {qty.toLocaleString()} {record.unit}
        </span>
      ),
    },
    {
      title: '安全库存',
      dataIndex: 'safeStock',
      key: 'safeStock',
      width: 120,
      render: (qty: number, record: any) => `${qty.toLocaleString()} ${record.unit}`,
    },
    {
      title: '库存状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => (
        <Tag color={record.quantity < record.safeStock ? 'red' : 'green'}>
          {record.quantity < record.safeStock ? '库存不足' : '充足'}
        </Tag>
      ),
    },
    {
      title: '库存占比',
      key: 'progress',
      width: 150,
      render: (_: any, record: any) => (
        <Progress
          percent={Math.min((record.quantity / (record.safeStock * 3)) * 100, 100)}
          size="small"
          status={record.quantity < record.safeStock ? 'exception' : 'normal'}
        />
      ),
    },
    {
      title: '存放位置',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 120,
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      width: 160,
    },
  ]

  const warehouseColumns = [
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 100,
    },
    {
      title: '总容量',
      dataIndex: 'totalCapacity',
      key: 'totalCapacity',
      width: 120,
      render: (val: number) => `${(val / 1000).toFixed(0)}k L`,
    },
    {
      title: '已使用',
      dataIndex: 'usedCapacity',
      key: 'usedCapacity',
      width: 120,
      render: (val: number) => `${(val / 1000).toFixed(0)}k L`,
    },
    {
      title: '使用率',
      key: 'usage',
      width: 150,
      render: (_: any, record: any) => (
        <Progress
          percent={(record.usedCapacity / record.totalCapacity) * 100}
          size="small"
          strokeColor="#722ed1"
        />
      ),
    },
    {
      title: '温度',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      render: (val: number) => `${val}°C`,
    },
    {
      title: '湿度',
      dataIndex: 'humidity',
      key: 'humidity',
      width: 100,
      render: (val: number) => `${val}%`,
    },
    {
      title: '酒桶数',
      dataIndex: 'barrels',
      key: 'barrels',
      width: 100,
      render: (val: number) => (val > 0 ? `${val} 个` : '-'),
    },
  ]

  const inventoryChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['当前库存', '安全库存'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: rawMaterials.map((m) => m.name),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '当前库存',
        type: 'bar',
        data: rawMaterials.map((m) => m.quantity),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '安全库存',
        type: 'bar',
        data: rawMaterials.map((m) => m.safeStock),
        itemStyle: { color: '#faad14' },
      },
    ],
  }

  const warehouseUsageOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} L ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '库容使用',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: agingWarehouses.map((w) => ({
          value: w.usedCapacity,
          name: w.name,
        })),
      },
    ],
  }

  const tabItems = [
    {
      key: 'raw',
      label: '原料库存',
    },
    {
      key: 'aging',
      label: '陈酿仓库',
    },
    {
      key: 'spare',
      label: '备件库存',
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="原料种类"
              value={rawMaterials.length}
              prefix={<AppstoreOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="库存不足"
              value={lowStockCount}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="陈酿库容"
              value={(totalUsedCapacity / totalWarehouseCapacity * 100).toFixed(1)}
              suffix="%"
              prefix={<DatabaseOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="备件预警"
              value={lowSpareParts}
              prefix={<InboxOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={10}>
          <Card title="原料库存对比" className="card-shadow">
            <ReactECharts option={inventoryChartOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={7}>
          <Card title="陈酿仓库使用分布" className="card-shadow">
            <ReactECharts option={warehouseUsageOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={7}>
          <Card title="库存预警" className="card-shadow">
            {rawMaterials
              .filter((m) => m.quantity < m.safeStock)
              .map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: '#fff2f0',
                    borderRadius: 6,
                    borderLeft: '3px solid #ff4d4f',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <Tag color="red">库存不足</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                    当前: {m.quantity.toLocaleString()} {m.unit} / 安全: {m.safeStock.toLocaleString()}
                  </div>
                  <Progress
                    percent={(m.quantity / m.safeStock) * 100}
                    size="small"
                    status="exception"
                    style={{ marginTop: 8 }}
                  />
                </div>
              ))}
            {rawMaterials.filter((m) => m.quantity < m.safeStock).length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>
                暂无库存预警
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="库存管理"
        className="card-shadow"
        style={{ marginTop: 16 }}
        tabList={tabItems}
        activeTabKey={activeTab}
        onTabChange={setActiveTab}
        extra={
          <Space>
            <Button icon={<ArrowUpOutlined />} type="primary" onClick={handleStockIn}>
              入库
            </Button>
            <Button icon={<ArrowDownOutlined />} onClick={handleStockOut}>
              出库
            </Button>
          </Space>
        }
      >
        {activeTab === 'raw' && (
          <Table columns={rawColumns} dataSource={rawMaterials} rowKey="id" pagination={{ pageSize: 8 }} />
        )}
        {activeTab === 'aging' && (
          <Table columns={warehouseColumns} dataSource={agingWarehouses} rowKey="id" pagination={{ pageSize: 8 }} />
        )}
        {activeTab === 'spare' && (
          <Table
            columns={[
              { title: '备件名称', dataIndex: 'name', key: 'name', width: 150 },
              { title: '规格', dataIndex: 'spec', key: 'spec' },
              {
                title: '库存数量',
                dataIndex: 'quantity',
                key: 'quantity',
                width: 100,
                render: (qty: number, record: any) => (
                  <span style={{ color: qty < record.safeStock ? '#ff4d4f' : undefined }}>
                    {qty} {record.unit}
                  </span>
                ),
              },
              {
                title: '安全库存',
                dataIndex: 'safeStock',
                key: 'safeStock',
                width: 100,
                render: (qty: number, record: any) => `${qty} ${record.unit}`,
              },
              {
                title: '状态',
                key: 'status',
                width: 100,
                render: (_: any, record: any) => (
                  <Tag color={record.quantity < record.safeStock ? 'red' : 'green'}>
                    {record.quantity < record.safeStock ? '库存不足' : '充足'}
                  </Tag>
                ),
              },
              { title: '存放位置', dataIndex: 'location', key: 'location', width: 120 },
              { title: '最后更新', dataIndex: 'lastUpdate', key: 'lastUpdate', width: 160 },
            ]}
            dataSource={spareParts}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>

      <Modal
        title={modalType === 'in' ? '物料入库' : '物料出库'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText="确认"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="materialId"
            label={activeTab === 'raw' ? '原料' : activeTab === 'spare' ? '备件' : '仓库'}
            rules={[{ required: true, message: '请选择' }]}
          >
            <Select placeholder="请选择">
              {activeTab === 'raw' &&
                rawMaterials.map((m) => (
                  <Option key={m.id} value={m.id}>
                    {m.name} ({m.quantity.toLocaleString()} {m.unit})
                  </Option>
                ))}
              {activeTab === 'spare' &&
                spareParts.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} {p.unit})
                  </Option>
                ))}
              {activeTab === 'aging' &&
                agingWarehouses.map((w) => (
                  <Option key={w.id} value={w.id}>
                    {w.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={1} />
          </Form.Item>
          {activeTab === 'aging' && (
            <Form.Item name="batchNo" label="批次号">
              <Input placeholder="请输入批次号" />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息（可选）" />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
            操作人：{dayjs().format('YYYY-MM-DD HH:mm')} · 系统自动记录
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default Inventory
