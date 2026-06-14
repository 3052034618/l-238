import { useState, useMemo } from 'react'
import {
  Card,
  Table,
  Tag,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Input,
  message,
  Empty,
} from 'antd'
import {
  SearchOutlined,
  DownloadOutlined,
  InboxOutlined,
  ExportOutlined,
  ToolOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import type { StockRecord } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const TYPE_META: Record<string, { text: string; color: string; icon: any }> = {
  in: { text: '入库', color: 'green', icon: InboxOutlined },
  out: { text: '出库', color: 'blue', icon: ExportOutlined },
  maintenance: { text: '维保领用', color: 'orange', icon: ToolOutlined },
  adjust_in: { text: '盘盈调整', color: '#52c41a', icon: RiseOutlined },
  adjust_out: { text: '盘亏调整', color: '#faad14', icon: FallOutlined },
}

const MATERIAL_TYPE_META: Record<string, { text: string; color: string }> = {
  raw: { text: '原料', color: 'cyan' },
  spare: { text: '备件', color: 'purple' },
  aging: { text: '陈酿仓库', color: 'gold' },
}

const StockRecords: React.FC = () => {
  const stockRecords = useAppStore((state) => state.stockRecords)
  const rawMaterials = useAppStore((state) => state.rawMaterials)
  const spareParts = useAppStore((state) => state.spareParts)
  const agingWarehouses = useAppStore((state) => state.agingWarehouses)

  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterMaterialType, setFilterMaterialType] = useState<string | null>(null)
  const [filterMaterialId, setFilterMaterialId] = useState<string | null>(null)
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [searchText, setSearchText] = useState('')

  const filteredRecords = useMemo(() => {
    let result = [...stockRecords]
    if (filterType) result = result.filter((r) => r.type === filterType)
    if (filterMaterialType) result = result.filter((r) => r.materialType === filterMaterialType)
    if (filterMaterialId) result = result.filter((r) => r.materialId === filterMaterialId)
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const start = filterDateRange[0].startOf('day')
      const end = filterDateRange[1].endOf('day')
      result = result.filter((r) => {
        const t = dayjs(r.time)
        return t.isAfter(start) && t.isBefore(end)
      })
    }
    if (searchText.trim()) {
      const kw = searchText.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.materialName.toLowerCase().includes(kw) ||
          r.operator.toLowerCase().includes(kw) ||
          (r.batchNo && r.batchNo.toLowerCase().includes(kw)) ||
          (r.remark && r.remark.toLowerCase().includes(kw)) ||
          (r.relatedOrderId && r.relatedOrderId.toLowerCase().includes(kw)) ||
          (r.relatedOrderNo && r.relatedOrderNo.toLowerCase().includes(kw)),
      )
    }
    return result
  }, [stockRecords, filterType, filterMaterialType, filterMaterialId, filterDateRange, searchText])

  const materialOptions = useMemo(() => {
    if (filterMaterialType === 'raw') {
      return rawMaterials.map((m) => ({ id: m.id, name: `${m.name} (${m.quantity}${m.unit})` }))
    }
    if (filterMaterialType === 'spare') {
      return spareParts.map((p) => ({ id: p.id, name: `${p.name} (${p.quantity}${p.unit})` }))
    }
    if (filterMaterialType === 'aging') {
      return agingWarehouses.map((w) => ({ id: w.id, name: `${w.name}` }))
    }
    return []
  }, [filterMaterialType, rawMaterials, spareParts, agingWarehouses])

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      message.warning('暂无数据可导出')
      return
    }
    const filters: string[] = []
    if (filterType) filters.push(`类型=${TYPE_META[filterType]?.text || filterType}`)
    if (filterMaterialType) filters.push(`分类=${MATERIAL_TYPE_META[filterMaterialType]?.text || filterMaterialType}`)
    if (filterMaterialId) {
      const mat = materialOptions.find((m) => m.id === filterMaterialId)
      filters.push(`物料=${mat?.name || filterMaterialId}`)
    }
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      filters.push(`时间=${filterDateRange[0].format('YYYY-MM-DD')}至${filterDateRange[1].format('YYYY-MM-DD')}`)
    }
    if (searchText.trim()) filters.push(`关键词=${searchText.trim()}`)
    const filterStr = filters.length > 0 ? filters.join('_') : '全部'
    const checkNos = Array.from(new Set(filteredRecords.filter((r) => r.relatedOrderNo).map((r) => r.relatedOrderNo!)))
    const checkNoStr = checkNos.length > 0 ? `_盘点单${checkNos.join('-')}` : ''

    const headers = [
      '流水号',
      '类型',
      '物料分类',
      '物料名称',
      '数量',
      '单位',
      '账存数',
      '实盘数',
      '盈亏',
      '批次号',
      '关联单号',
      '盘点单号',
      '操作人',
      '时间',
      '备注',
    ]
    const rows = filteredRecords.map((r) => [
      r.id,
      TYPE_META[r.type]?.text || r.type,
      MATERIAL_TYPE_META[r.materialType]?.text || r.materialType,
      r.materialName,
      r.quantity.toString(),
      r.unit,
      r.bookQuantity?.toString() || '',
      r.actualQuantity?.toString() || '',
      r.diffQuantity !== undefined ? r.diffQuantity.toString() : '',
      r.batchNo || '',
      r.relatedOrderId || '',
      r.relatedOrderNo || '',
      r.operator,
      r.time,
      r.remark || '',
    ])
    const filterRow = [`筛选条件: ${filterStr}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    const csv = [headers, filterRow, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `库存流水_${filterStr}${checkNoStr}_${dayjs().format('YYYYMMDD_HHmm')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${filteredRecords.length} 条记录`)
  }

  const handleReset = () => {
    setFilterType(null)
    setFilterMaterialType(null)
    setFilterMaterialId(null)
    setFilterDateRange(null)
    setSearchText('')
  }

  const columns = [
    {
      title: '流水类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: StockRecord['type']) => {
        const meta = TYPE_META[type] || { text: type, color: 'default' }
        return <Tag color={meta.color}>{meta.text}</Tag>
      },
    },
    {
      title: '物料分类',
      dataIndex: 'materialType',
      key: 'materialType',
      width: 110,
      render: (t: StockRecord['materialType']) => {
        const meta = MATERIAL_TYPE_META[t] || { text: t, color: 'default' }
        return <Tag color={meta.color}>{meta.text}</Tag>
      },
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName',
      width: 180,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right' as const,
      render: (q: number, r: StockRecord) => {
        const isPlus = r.type === 'in' || r.type === 'adjust_in'
        return (
          <span style={{ fontWeight: 600, color: isPlus ? '#52c41a' : '#cf1322' }}>
            {isPlus ? '+' : '-'}
            {q.toLocaleString()} {r.unit}
          </span>
        )
      },
    },
    {
      title: '账存',
      dataIndex: 'bookQuantity',
      key: 'bookQuantity',
      width: 90,
      align: 'right' as const,
      render: (v?: number) => (v !== undefined ? v.toLocaleString() : '-'),
    },
    {
      title: '实盘',
      dataIndex: 'actualQuantity',
      key: 'actualQuantity',
      width: 90,
      align: 'right' as const,
      render: (v?: number) => (v !== undefined ? v.toLocaleString() : '-'),
    },
    {
      title: '盈亏',
      dataIndex: 'diffQuantity',
      key: 'diffQuantity',
      width: 90,
      align: 'right' as const,
      render: (v?: number) => {
        if (v === undefined) return '-'
        const color = v > 0 ? '#52c41a' : v < 0 ? '#cf1322' : '#595959'
        return (
          <span style={{ color, fontWeight: 500 }}>
            {v > 0 ? '+' : ''}
            {v.toLocaleString()}
          </span>
        )
      },
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 130,
      render: (t?: string) => t || '-',
    },
    {
      title: '盘点单号',
      dataIndex: 'relatedOrderNo',
      key: 'relatedOrderNo',
      width: 140,
      render: (t?: string) => (t ? <Tag color="purple">{t}</Tag> : '-'),
    },
    {
      title: '关联单号',
      dataIndex: 'relatedOrderId',
      key: 'relatedOrderId',
      width: 130,
      render: (t?: string) => t || '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      sorter: (a: StockRecord, b: StockRecord) => a.time.localeCompare(b.time),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (t?: string) => t || '-',
    },
  ]

  const totalIn = filteredRecords.filter((r) => r.type === 'in' || r.type === 'adjust_in').reduce((s, r) => s + r.quantity, 0)
  const totalOut = filteredRecords
    .filter((r) => r.type === 'out' || r.type === 'maintenance' || r.type === 'adjust_out')
    .reduce((s, r) => s + r.quantity, 0)

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>流水总条数</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{stockRecords.length}</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>筛选后数量</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#1677ff' }}>{filteredRecords.length}</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>入库合计</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#52c41a' }}>+{totalIn.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small">
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>出库/领用合计</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#cf1322' }}>-{totalOut.toLocaleString()}</div>
          </Card>
        </Col>
        <Col span={4}>
          <Button type="primary" icon={<DownloadOutlined />} size="large" style={{ width: '100%', height: 56 }} onClick={handleExport}>
            导出 CSV
          </Button>
        </Col>
      </Row>

      <Card
        title="库存流水记录"
        className="card-shadow"
        extra={
          <Space wrap>
            <Select
              style={{ width: 130 }}
              placeholder="流水类型"
              allowClear
              value={filterType || undefined}
              onChange={(v) => setFilterType(v || null)}
            >
              <Option value="in">入库</Option>
              <Option value="out">出库</Option>
              <Option value="maintenance">维保领用</Option>
              <Option value="adjust_in">盘盈调整</Option>
              <Option value="adjust_out">盘亏调整</Option>
            </Select>
            <Select
              style={{ width: 130 }}
              placeholder="物料分类"
              allowClear
              value={filterMaterialType || undefined}
              onChange={(v) => {
                setFilterMaterialType(v || null)
                setFilterMaterialId(null)
              }}
            >
              <Option value="raw">原料</Option>
              <Option value="spare">备件</Option>
              <Option value="aging">陈酿仓库</Option>
            </Select>
            <Select
              style={{ width: 180 }}
              placeholder="选择物料"
              allowClear
              disabled={!filterMaterialType}
              value={filterMaterialId || undefined}
              onChange={(v) => setFilterMaterialId(v || null)}
            >
              {materialOptions.map((m) => (
                <Option key={m.id} value={m.id}>{m.name}</Option>
              ))}
            </Select>
            <RangePicker
              value={filterDateRange as any}
              onChange={(v) => setFilterDateRange(v as any)}
              placeholder={['开始日期', '结束日期']}
            />
            <Input
              style={{ width: 220 }}
              placeholder="搜索物料/操作人/批次/盘点单号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button onClick={handleReset}>重置</Button>
          </Space>
        }
      >
        {filteredRecords.length === 0 ? (
          <Empty
            description={
              stockRecords.length === 0
                ? '暂无库存流水记录，入库、出库、维保领用时会自动生成'
                : '当前筛选条件下无记录'
            }
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRecords}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            scroll={{ x: 1800 }}
          />
        )}
      </Card>
    </div>
  )
}

export default StockRecords
