import { useState, useMemo } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  message,
  Empty,
  Descriptions,
  Divider,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  FileSearchOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import type { StockCheckOrder, StockCheckItem } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const STATUS_META: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  checking: { text: '盘点中', color: 'processing' },
  completed: { text: '盘点完成', color: 'warning' },
  adjusted: { text: '已调整', color: 'success' },
}

const WAREHOUSES = ['原料库A', '原料库B', '备件库', '陈酿车间']

const StockCheck: React.FC = () => {
  const stockCheckOrders = useAppStore((state) => state.stockCheckOrders)
  const createStockCheckOrder = useAppStore((state) => state.createStockCheckOrder)
  const updateStockCheckItem = useAppStore((state) => state.updateStockCheckItem)
  const completeStockCheck = useAppStore((state) => state.completeStockCheck)
  const adjustStockByCheck = useAppStore((state) => state.adjustStockByCheck)
  const currentUser = useAppStore((state) => state.currentUser)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<StockCheckOrder | null>(null)
  const [createForm] = Form.useForm()

  const handleCreate = () => {
    createForm
      .validateFields()
      .then((values) => {
        const order = createStockCheckOrder(values.warehouse, currentUser.name)
        message.success(`盘点单 ${order.orderNo} 创建成功`)
        setCreateOpen(false)
        createForm.resetFields()
        setCurrentOrder(order)
        setDetailOpen(true)
      })
      .catch(() => {})
  }

  const openDetail = (order: StockCheckOrder) => {
    const fresh = stockCheckOrders.find((o) => o.id === order.id) || order
    setCurrentOrder({ ...fresh, items: fresh.items.map((i) => ({ ...i })) })
    setDetailOpen(true)
  }

  const handleQuantityChange = (itemId: string, value: number | null) => {
    if (!currentOrder) return
    const q = value === null ? 0 : value
    const existing = currentOrder.items.find((i) => i.id === itemId)
    const next: StockCheckOrder = {
      ...currentOrder,
      items: currentOrder.items.map((i) => {
        if (i.id !== itemId) return i
        const diff = q - i.bookQuantity
        return {
          ...i,
          actualQuantity: q,
          diffQuantity: diff,
          diffType: diff > 0 ? 'surplus' : diff < 0 ? 'loss' : 'none',
        }
      }),
    }
    setCurrentOrder(next)
    updateStockCheckItem(currentOrder.id, itemId, q, existing?.remark)
  }

  const handleRemarkChange = (itemId: string, value: string) => {
    if (!currentOrder) return
    const next: StockCheckOrder = {
      ...currentOrder,
      items: currentOrder.items.map((i) => (i.id === itemId ? { ...i, remark: value } : i)),
    }
    setCurrentOrder(next)
    const it = next.items.find((i) => i.id === itemId)
    if (it && it.actualQuantity !== undefined) {
      updateStockCheckItem(currentOrder.id, itemId, it.actualQuantity, value)
    }
  }

  const handleComplete = () => {
    if (!currentOrder) return
    const unfilled = currentOrder.items.some((i) => i.actualQuantity === undefined)
    if (unfilled) {
      message.warning('还有物料未录入实盘数量')
      return
    }
    completeStockCheck(currentOrder.id, currentUser.name)
    const fresh = stockCheckOrders.find((o) => o.id === currentOrder.id)
    if (fresh) setCurrentOrder(fresh)
    message.success('盘点完成，已统计盈亏')
  }

  const handleAdjust = () => {
    if (!currentOrder) return
    adjustStockByCheck(currentOrder.id, currentUser.name)
    const fresh = stockCheckOrders.find((o) => o.id === currentOrder.id)
    if (fresh) setCurrentOrder(fresh)
    message.success('已将盈亏调整写入库存流水')
  }

  const listColumns = [
    {
      title: '盘点单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
      render: (t: string, r: StockCheckOrder) => (
        <a onClick={() => openDetail(r)}>
          <FileSearchOutlined /> {t}
        </a>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: StockCheckOrder['status']) => {
        const meta = STATUS_META[s]
        return <Tag color={meta.color}>{meta.text}</Tag>
      },
    },
    {
      title: '物料数',
      dataIndex: 'items',
      key: 'items',
      width: 90,
      render: (items: StockCheckItem[]) => items.length,
    },
    {
      title: '总盘盈',
      dataIndex: 'totalSurplus',
      key: 'totalSurplus',
      width: 100,
      align: 'right' as const,
      render: (v?: number) => (v !== undefined ? <span style={{ color: '#52c41a', fontWeight: 600 }}>+{v.toLocaleString()}</span> : '-'),
    },
    {
      title: '总盘亏',
      dataIndex: 'totalLoss',
      key: 'totalLoss',
      width: 100,
      align: 'right' as const,
      render: (v?: number) => (v !== undefined ? <span style={{ color: '#cf1322', fontWeight: 600 }}>-{v.toLocaleString()}</span> : '-'),
    },
    {
      title: '创建人',
      dataIndex: 'creator',
      key: 'creator',
      width: 100,
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
      width: 150,
      render: (_: any, r: StockCheckOrder) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>
            查看
          </Button>
        </Space>
      ),
    },
  ]

  const detailColumns = [
    {
      title: '物料分类',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 100,
      render: (t: StockCheckItem['materialType']) =>
        t === 'raw' ? <Tag color="cyan">原料</Tag> : t === 'spare' ? <Tag color="purple">备件</Tag> : <Tag color="gold">陈酿</Tag>,
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 180,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 70,
    },
    {
      title: '账面数量',
      dataIndex: 'bookQuantity',
      key: 'bookQuantity',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <strong>{v.toLocaleString()}</strong>,
    },
    {
      title: '实盘数量',
      dataIndex: 'actualQuantity',
      key: 'actualQuantity',
      width: 160,
      align: 'right' as const,
      render: (_: any, r: StockCheckItem) => {
        if (currentOrder && (currentOrder.status === 'completed' || currentOrder.status === 'adjusted')) {
          return <span style={{ fontWeight: 600 }}>{r.actualQuantity?.toLocaleString() ?? '-'}</span>
        }
        return (
          <InputNumber
            min={0}
            style={{ width: 130 }}
            value={r.actualQuantity}
            placeholder="请输入"
            onChange={(v) => handleQuantityChange(r.id, v)}
          />
        )
      },
    },
    {
      title: '盈亏数量',
      dataIndex: 'diffQuantity',
      key: 'diffQuantity',
      width: 110,
      align: 'right' as const,
      render: (v?: number) => {
        if (v === undefined) return '-'
        const color = v > 0 ? '#52c41a' : v < 0 ? '#cf1322' : '#595959'
        return (
          <span style={{ color, fontWeight: 600 }}>
            {v > 0 ? '+' : ''}
            {v.toLocaleString()}
          </span>
        )
      },
    },
    {
      title: '盈亏状态',
      dataIndex: 'diffType',
      key: 'diffType',
      width: 100,
      render: (t?: StockCheckItem['diffType']) =>
        t === 'surplus' ? (
          <Tag color="green">盘盈</Tag>
        ) : t === 'loss' ? (
          <Tag color="red">盘亏</Tag>
        ) : t === 'none' ? (
          <Tag>一致</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      render: (v: string | undefined, r: StockCheckItem) => {
        if (currentOrder && (currentOrder.status === 'completed' || currentOrder.status === 'adjusted')) {
          return v || '-'
        }
        return (
          <Input
            value={r.remark}
            placeholder="可选"
            onChange={(e) => handleRemarkChange(r.id, e.target.value)}
          />
        )
      },
    },
  ]

  const stats = useMemo(() => {
    const total = stockCheckOrders.length
    const checking = stockCheckOrders.filter((o) => o.status === 'checking').length
    const adjusted = stockCheckOrders.filter((o) => o.status === 'adjusted').length
    return { total, checking, adjusted }
  }, [stockCheckOrders])

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>盘点单总数</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{stats.total}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>盘点中</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#1677ff' }}>{stats.checking}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>已完成调整</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#52c41a' }}>{stats.adjusted}</div>
          </Card>
        </Col>
        <Col span={6}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{ width: '100%', height: 56 }}
            onClick={() => setCreateOpen(true)}
          >
            新建盘点单
          </Button>
        </Col>
      </Row>

      <Card
        title="盘点单列表"
        className="card-shadow"
        extra={<span style={{ color: '#8c8c8c' }}>按仓库生成盘点单，录入实盘后自动计算盈亏</span>}
      >
        {stockCheckOrders.length === 0 ? (
          <Empty
            description="暂无盘点单，点击右上角「新建盘点单」开始"
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={listColumns}
            dataSource={stockCheckOrders}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 张盘点单` }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

      <Modal
        title="新建盘点单"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => {
          setCreateOpen(false)
          createForm.resetFields()
        }}
        okText="创建"
        width={480}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="warehouse"
            label="选择仓库"
            rules={[{ required: true, message: '请选择盘点仓库' }]}
          >
            <Select placeholder="选择要盘点的仓库">
              {WAREHOUSES.map((w) => (
                <Option key={w} value={w}>{w}</Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ color: '#8c8c8c', fontSize: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
            创建后将自动带入该仓库下所有物料的账面数量，可逐行录入实盘数
          </div>
        </Form>
      </Modal>

      <Modal
        title={currentOrder ? `盘点单：${currentOrder.orderNo}` : '盘点单详情'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          currentOrder ? (
            <Space>
              <Button onClick={() => setDetailOpen(false)}>关闭</Button>
              {currentOrder.status === 'draft' || currentOrder.status === 'checking' ? (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleComplete}>
                  完成盘点
                </Button>
              ) : null}
              {currentOrder.status === 'completed' ? (
                <Popconfirm
                  title="确认将盘点盈亏调整到库存？"
                  description="将生成库存流水，盘盈入库、盘亏出库"
                  onConfirm={handleAdjust}
                  okText="确认调整"
                  cancelText="取消"
                >
                  <Button type="primary" danger icon={<SwapOutlined />}>
                    盈亏调整入库
                  </Button>
                </Popconfirm>
              ) : null}
              {currentOrder.status === 'adjusted' ? (
                <Tag color="success" style={{ padding: '4px 10px' }}>
                  <CheckCircleOutlined /> 已完成调整
                </Tag>
              ) : null}
            </Space>
          ) : null
        }
        width={1100}
        destroyOnClose
      >
        {currentOrder && (
          <div>
            <Descriptions column={3} size="small" bordered style={{ marginBottom: 12 }}>
              <Descriptions.Item label="盘点单号">{currentOrder.orderNo}</Descriptions.Item>
              <Descriptions.Item label="仓库">{currentOrder.warehouse}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_META[currentOrder.status].color}>{STATUS_META[currentOrder.status].text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{currentOrder.creator}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{currentOrder.createTime}</Descriptions.Item>
              <Descriptions.Item label="备注">{currentOrder.remark || '-'}</Descriptions.Item>
              {currentOrder.checkTime && (
                <Descriptions.Item label="盘点人/时间">
                  {currentOrder.checker} · {currentOrder.checkTime}
                </Descriptions.Item>
              )}
              {currentOrder.adjustTime && (
                <Descriptions.Item label="调整人/时间">
                  {currentOrder.adjustor} · {currentOrder.adjustTime}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="盈亏统计">
                {currentOrder.totalSurplus !== undefined ? (
                  <Space>
                    <span style={{ color: '#52c41a' }}>盘盈 +{currentOrder.totalSurplus}</span>
                    <span style={{ color: '#cf1322' }}>盘亏 -{currentOrder.totalLoss || 0}</span>
                  </Space>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '12px 0' }} orientation="left" plain>
              物料明细（共 {currentOrder.items.length} 项）
            </Divider>
            <Table
              columns={detailColumns}
              dataSource={currentOrder.items}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 380, x: 1000 }}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default StockCheck
