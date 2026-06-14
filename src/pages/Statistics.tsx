import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  DatePicker,
  Button,
  Space,
  Table,
  Tag,
  message,
  Tabs,
  List,
} from 'antd'
import {
  BarChartOutlined,
  DownloadOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { RangePicker } = DatePicker
const { Option } = Select

const Statistics: React.FC = () => {
  const productionStats = useAppStore((state) => state.productionStats)
  const batchRecords = useAppStore((state) => state.batchRecords)
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const [statType, setStatType] = useState<'daily' | 'monthly'>('monthly')
  const [activeTab, setActiveTab] = useState('production')

  const totalOutput = productionStats.reduce((sum, s) => sum + s.totalOutput, 0)
  const avgYield = productionStats.reduce((sum, s) => sum + s.alcoholYield, 0) / productionStats.length
  const avgPremiumRate = productionStats.reduce((sum, s) => sum + s.premiumRate, 0) / productionStats.length
  const avgUtilization = productionStats.reduce((sum, s) => sum + s.equipmentUtilization, 0) / productionStats.length

  const handleExportPDF = () => {
    message.loading({ content: '正在生成PDF报告...', key: 'pdf' })

    setTimeout(() => {
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text('酒厂月度运营报告', 105, 20, { align: 'center' })

      doc.setFontSize(10)
      doc.text(`生成时间: ${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 30)
      doc.text(`报告周期: ${dayjs().subtract(29, 'day').format('YYYY-MM-DD')} 至 ${dayjs().format('YYYY-MM-DD')}`, 14, 36)

      const summaryData = [
        ['指标', '数值', '单位'],
        ['总产量', totalOutput.toLocaleString(), 'kg'],
        ['平均出酒率', avgYield.toFixed(1), '%'],
        ['平均优级品率', avgPremiumRate.toFixed(1), '%'],
        ['平均设备利用率', avgUtilization.toFixed(1), '%'],
        ['生产批次', productionStats.reduce((sum, s) => sum + s.batchCount, 0).toString(), '批'],
      ]

      autoTable(doc, {
        startY: 45,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [22, 119, 255] },
      })

      const tableData = productionStats.slice(-15).map((s) => [
        s.date,
        s.team,
        s.batchCount.toString(),
        s.totalOutput.toString(),
        s.alcoholYield.toFixed(1) + '%',
        s.premiumRate.toFixed(1) + '%',
        s.equipmentUtilization.toFixed(1) + '%',
      ])

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['日期', '班组', '批次', '产量(kg)', '出酒率', '优级品率', '设备利用率']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 119, 255] },
      })

      doc.text('批次品质统计', 14, (doc as any).lastAutoTable.finalY + 15)

      const batchData = batchRecords.map((b) => [
        b.batchNo,
        b.recipeName,
        b.operator,
        b.status === 'completed' ? '已完成' : b.status === 'fermenting' ? '发酵中' : b.status === 'distilling' ? '蒸馏中' : '陈酿中',
        b.output.toString() + ' kg',
        b.alcoholContent + '%vol',
        b.qualityLevel === 'premium' ? '优级' : b.qualityLevel === 'first' ? '一级' : b.qualityLevel === 'qualified' ? '合格' : '不合格',
      ])

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['批次号', '配方', '操作员', '状态', '产量', '酒精度', '品质等级']],
        body: batchData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [82, 196, 26] },
      })

      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, 105, 290, { align: 'center' })
      }

      doc.save(`酒厂月度运营报告_${dayjs().format('YYYYMMDD')}.pdf`)
      message.success({ content: 'PDF报告生成成功', key: 'pdf' })
    }, 1000)
  }

  const productionTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['产量(kg)', '出酒率(%)', '优级品率(%)'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: productionStats.map((s) => s.date.slice(5)),
    },
    yAxis: [
      { type: 'value', name: '产量(kg)', position: 'left' },
      { type: 'value', name: '比率(%)', position: 'right', min: 0, max: 100 },
    ],
    series: [
      {
        name: '产量(kg)',
        type: 'bar',
        data: productionStats.map((s) => s.totalOutput),
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '出酒率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: productionStats.map((s) => s.alcoholYield),
        smooth: true,
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '优级品率(%)',
        type: 'line',
        yAxisIndex: 1,
        data: productionStats.map((s) => s.premiumRate),
        smooth: true,
        itemStyle: { color: '#faad14' },
      },
    ],
  }

  const teamCompareOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['一班', '二班', '三班'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['产量(kg)', '出酒率(%)', '优级品率(%)', '设备利用率(%)'],
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '一班',
        type: 'bar',
        data: [9500, 42.5, 35.2, 82.5],
        itemStyle: { color: '#1677ff' },
      },
      {
        name: '二班',
        type: 'bar',
        data: [8800, 40.8, 32.1, 78.3],
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '三班',
        type: 'bar',
        data: [9200, 41.5, 34.0, 80.1],
        itemStyle: { color: '#faad14' },
      },
    ],
  }

  const equipmentUtilizationOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['设备利用率(%)'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: productionStats.map((s) => s.date.slice(5)),
    },
    yAxis: { type: 'value', min: 60, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '设备利用率(%)',
        type: 'line',
        data: productionStats.map((s) => s.equipmentUtilization),
        smooth: true,
        areaStyle: { opacity: 0.3, color: '#722ed1' },
        itemStyle: { color: '#722ed1' },
      },
    ],
  }

  const qualityDistributionOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '品质分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: 35, name: '优级品', itemStyle: { color: '#52c41a' } },
          { value: 45, name: '一级品', itemStyle: { color: '#1677ff' } },
          { value: 18, name: '合格品', itemStyle: { color: '#faad14' } },
          { value: 2, name: '不合格品', itemStyle: { color: '#ff4d4f' } },
        ],
      },
    ],
  }

  const batchColumns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
    },
    {
      title: '酒品配方',
      dataIndex: 'recipeName',
      key: 'recipeName',
      width: 120,
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '发酵罐',
      dataIndex: 'fermenterName',
      key: 'fermenterName',
      width: 120,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const textMap: Record<string, string> = {
          fermenting: '发酵中',
          distilling: '蒸馏中',
          aging: '陈酿中',
          completed: '已完成',
        }
        const colorMap: Record<string, string> = {
          fermenting: 'processing',
          distilling: 'blue',
          aging: 'purple',
          completed: 'success',
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      },
    },
    {
      title: '品质等级',
      dataIndex: 'qualityLevel',
      key: 'qualityLevel',
      width: 100,
      render: (level: string) => {
        const textMap: Record<string, string> = {
          premium: '优级',
          first: '一级',
          qualified: '合格',
          unqualified: '不合格',
        }
        const colorMap: Record<string, string> = {
          premium: 'green',
          first: 'blue',
          qualified: 'gold',
          unqualified: 'red',
        }
        return <Tag color={colorMap[level]}>{textMap[level]}</Tag>
      },
    },
    {
      title: '产量(kg)',
      dataIndex: 'output',
      key: 'output',
      width: 100,
      render: (val: number) => (val > 0 ? val : '-'),
    },
    {
      title: '酒精度(%vol)',
      dataIndex: 'alcoholContent',
      key: 'alcoholContent',
      width: 120,
    },
  ]

  const tabItems = [
    {
      key: 'production',
      label: '生产统计',
    },
    {
      key: 'quality',
      label: '品质分析',
    },
    {
      key: 'equipment',
      label: '设备效率',
    },
    {
      key: 'batch',
      label: '批次记录',
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="累计产量"
              value={totalOutput}
              precision={0}
              suffix="kg"
              prefix={<BarChartOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
            <div className="metric-trend">
              <Tag color="green" icon={<RiseOutlined />}>
                +8.5% 环比
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="平均出酒率"
              value={avgYield}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="metric-trend">
              <Tag color="green" icon={<RiseOutlined />}>
                +1.2% 环比
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="优级品率"
              value={avgPremiumRate}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="metric-trend">
              <Tag color="green" icon={<RiseOutlined />}>
                +2.1% 环比
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="设备利用率"
              value={avgUtilization}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="metric-trend">
              <Tag color="orange" icon={<FallOutlined />}>
                -1.3% 环比
              </Tag>
            </div>
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="生产批次"
              value={productionStats.reduce((sum, s) => sum + s.batchCount, 0)}
              prefix={<ClockCircleOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="card-shadow"
        extra={
          <Space>
            <Select value={statType} onChange={setStatType} style={{ width: 120 }}>
              <Option value="daily">按日统计</Option>
              <Option value="monthly">按月统计</Option>
            </Select>
            <RangePicker
              defaultValue={[dayjs().subtract(29, 'day'), dayjs()]}
              style={{ width: 260 }}
            />
            <Button icon={<DownloadOutlined />} type="primary" onClick={handleExportPDF}>
              导出PDF报告
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        {activeTab === 'production' && (
          <div>
            <Card size="small" title="生产趋势" style={{ marginBottom: 16 }}>
              <ReactECharts option={productionTrendOption} style={{ height: 350 }} />
            </Card>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="班组产量对比">
                  <ReactECharts option={teamCompareOption} style={{ height: 280 }} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="产量Top5批次">
                  <List
                    size="small"
                    dataSource={[...batchRecords].sort((a, b) => b.output - a.output).slice(0, 5)}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Space>
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: index < 3 ? '#faad14' : '#d9d9d9',
                              color: index < 3 ? '#fff' : '#595959',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}
                          >
                            {index + 1}
                          </span>
                          <span>{item.batchNo}</span>
                          <Tag color="blue">{item.recipeName}</Tag>
                        </Space>
                        <span style={{ fontWeight: 600 }}>{item.output} kg</span>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {activeTab === 'quality' && (
          <Row gutter={16}>
            <Col span={8}>
              <Card size="small" title="品质等级分布">
                <ReactECharts option={qualityDistributionOption} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={16}>
              <Card size="small" title="品质趋势">
                <ReactECharts
                  option={{
                    tooltip: { trigger: 'axis' },
                    legend: { data: ['优级品率', '一级品率', '合格率'], right: 0 },
                    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                    xAxis: {
                      type: 'category',
                      data: productionStats.slice(-15).map((s) => s.date.slice(5)),
                    },
                    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
                    series: [
                      {
                        name: '优级品率',
                        type: 'line',
                        data: productionStats.slice(-15).map(() => 30 + Math.random() * 15),
                        smooth: true,
                        itemStyle: { color: '#52c41a' },
                      },
                      {
                        name: '一级品率',
                        type: 'line',
                        data: productionStats.slice(-15).map(() => 40 + Math.random() * 10),
                        smooth: true,
                        itemStyle: { color: '#1677ff' },
                      },
                      {
                        name: '合格率',
                        type: 'line',
                        data: productionStats.slice(-15).map(() => 95 + Math.random() * 3),
                        smooth: true,
                        itemStyle: { color: '#faad14' },
                      },
                    ],
                  }}
                  style={{ height: 300 }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {activeTab === 'equipment' && (
          <div>
            <Card size="small" title="设备利用率趋势" style={{ marginBottom: 16 }}>
              <ReactECharts option={equipmentUtilizationOption} style={{ height: 350 }} />
            </Card>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="发酵罐运行时长">
                  <List
                    size="small"
                    dataSource={[...fermenters].sort((a, b) => b.runHours - a.runHours)}
                    renderItem={(item) => (
                      <List.Item>
                        <span>{item.name}</span>
                        <span>{item.runHours} 小时</span>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="蒸馏设备运行时长">
                  <List
                    size="small"
                    dataSource={[...distillers].sort((a, b) => b.runHours - a.runHours)}
                    renderItem={(item) => (
                      <List.Item>
                        <span>{item.name}</span>
                        <span>{item.runHours} 小时</span>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {activeTab === 'batch' && (
          <Table
            columns={batchColumns}
            dataSource={batchRecords}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>
    </div>
  )
}

export default Statistics
