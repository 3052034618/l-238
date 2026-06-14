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
  InputNumber,
  message,
  Row,
  Col,
  Statistic,
  Tabs,
  List,
  Progress,
} from 'antd'
import {
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ArrowDownOutlined,
  PlusOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '../store/useAppStore'
import type { QualityTest } from '../types'
import dayjs from 'dayjs'

const { Option } = Select

const QualityControl: React.FC = () => {
  const qualityTests = useAppStore((state) => state.qualityTests)
  const recipes = useAppStore((state) => state.recipes)
  const addQualityTest = useAppStore((state) => state.addQualityTest)
  const batchRecords = useAppStore((state) => state.batchRecords)
  const currentUser = useAppStore((state) => state.currentUser)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [currentTest, setCurrentTest] = useState<QualityTest | null>(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('all')

  const passCount = qualityTests.filter((t) => t.overallResult === 'pass').length
  const failCount = qualityTests.filter((t) => t.overallResult === 'fail').length
  const recheckCount = qualityTests.filter((t) => t.overallResult === 'recheck').length
  const degradedCount = qualityTests.filter((t) => t.overallResult === 'degraded').length

  const passRate = qualityTests.length > 0 ? ((passCount / qualityTests.length) * 100).toFixed(1) : '0'

  const getResultText = (result: string) => {
    const textMap: Record<string, string> = {
      pass: '合格',
      fail: '不合格',
      recheck: '待复检',
      degraded: '降级',
    }
    return textMap[result] || result
  }

  const getResultColor = (result: string) => {
    const colorMap: Record<string, string> = {
      pass: 'green',
      fail: 'red',
      recheck: 'orange',
      degraded: 'gold',
    }
    return colorMap[result] || 'default'
  }

  const getStageText = (stage: string) => {
    const textMap: Record<string, string> = {
      fermentation: '发酵检测',
      distillation: '蒸馏检测',
      aging: '陈酿检测',
    }
    return textMap[stage] || stage
  }

  const handleAddTest = () => {
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleViewDetail = (test: QualityTest) => {
    setCurrentTest(test)
    setIsDetailVisible(true)
  }

  const handleRecheck = (test: QualityTest) => {
    Modal.confirm({
      title: '申请复检',
      content: `确定对批次 ${test.batchNo} 申请复检吗？`,
      onOk: () => {
        message.success('复检申请已提交')
      },
    })
  }

  const handleDegrade = (test: QualityTest) => {
    Modal.confirm({
      title: '降级处理',
      content: `确定将批次 ${test.batchNo} 做降级处理吗？`,
      okText: '确认降级',
      okType: 'danger',
      onOk: () => {
        const updatedTest = { ...test, overallResult: 'degraded' as const }
        setCurrentTest(updatedTest)
        message.success('已做降级处理')
      },
    })
  }

  const handlePass = (test: QualityTest) => {
    Modal.confirm({
      title: '合格判定',
      content: `确定批次 ${test.batchNo} 检测合格吗？合格后方可进入下一工序。`,
      onOk: () => {
        message.success('判定为合格，可进入下一工序')
      },
    })
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const items = [
        { name: '酒精度', value: values.alcohol, unit: '%vol', standard: { min: 10, max: 15 }, result: 'pass' as const },
        { name: '总酸', value: values.acid, unit: 'g/L', standard: { min: 1.2, max: 2.5 }, result: 'pass' as const },
        { name: '总酯', value: values.ester, unit: 'g/L', standard: { min: 2.5, max: 4.0 }, result: 'pass' as const },
        { name: '固形物', value: values.solids, unit: 'g/L', standard: { min: 0, max: 0.5 }, result: 'pass' as const },
      ]

      const overallPass = items.every((item) => {
        return item.value >= item.standard.min && item.value <= item.standard.max
      })

      const newTest: QualityTest = {
        id: `Q${Date.now()}`,
        batchNo: values.batchNo,
        testTime: dayjs().format('YYYY-MM-DD HH:mm'),
        tester: currentUser.name,
        stage: values.stage,
        items,
        overallResult: overallPass ? 'pass' : 'fail',
      }
      addQualityTest(newTest)
      message.success('检测记录已添加')
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  const columns = [
    {
      title: '检测时间',
      dataIndex: 'testTime',
      key: 'testTime',
      width: 160,
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 120,
    },
    {
      title: '检测阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 100,
      render: (stage: string) => getStageText(stage),
    },
    {
      title: '检测项目',
      dataIndex: 'items',
      key: 'items',
      width: 150,
      render: (items: QualityTest['items']) => `${items.length} 项`,
    },
    {
      title: '检测结果',
      dataIndex: 'overallResult',
      key: 'overallResult',
      width: 100,
      render: (result: string) => <Tag color={getResultColor(result)}>{getResultText(result)}</Tag>,
    },
    {
      title: '检测员',
      dataIndex: 'tester',
      key: 'tester',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: QualityTest) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.overallResult === 'recheck' && (
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRecheck(record)}>
              复检
            </Button>
          )}
          {record.overallResult === 'fail' && (
            <>
              <Button type="link" size="small" onClick={() => handlePass(record)}>
                判合格
              </Button>
              <Button type="link" size="small" danger icon={<ArrowDownOutlined />} onClick={() => handleDegrade(record)}>
                降级
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const qualityTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['合格率', '优级品率'], right: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    },
    yAxis: { type: 'value', min: 80, max: 100 },
    series: [
      {
        name: '合格率',
        type: 'line',
        data: [92.5, 93.2, 91.8, 94.1, 95.2, 93.8, 94.5, 95.8, 96.1, 95.3, 96.5, 97.2],
        smooth: true,
        itemStyle: { color: '#52c41a' },
        areaStyle: { opacity: 0.2, color: '#52c41a' },
      },
      {
        name: '优级品率',
        type: 'line',
        data: [28.5, 30.2, 29.8, 32.1, 33.5, 32.8, 34.2, 35.1, 34.8, 36.2, 37.5, 38.2],
        smooth: true,
        itemStyle: { color: '#1677ff' },
      },
    ],
  }

  const tabItems = [
    {
      key: 'all',
      label: '全部记录',
      children: (
        <Table columns={columns} dataSource={qualityTests} rowKey="id" pagination={{ pageSize: 8 }} />
      ),
    },
    {
      key: 'pass',
      label: '合格',
      children: (
        <Table
          columns={columns}
          dataSource={qualityTests.filter((t) => t.overallResult === 'pass')}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      ),
    },
    {
      key: 'recheck',
      label: '待复检',
      children: (
        <Table
          columns={columns}
          dataSource={qualityTests.filter((t) => t.overallResult === 'recheck')}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      ),
    },
    {
      key: 'degraded',
      label: '降级',
      children: (
        <Table
          columns={columns}
          dataSource={qualityTests.filter((t) => t.overallResult === 'degraded')}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      ),
    },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="总检测批次"
              value={qualityTests.length}
              prefix={<ExperimentOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="合格批次"
              value={passCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="合格率"
              value={passRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="card-shadow">
            <Statistic
              title="待复检"
              value={recheckCount}
              prefix={<ReloadOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="card-shadow">
            <Statistic
              title="降级批次"
              value={degradedCount}
              prefix={<ArrowDownOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="质量趋势分析" className="card-shadow">
            <ReactECharts option={qualityTrendOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={16}>
          <Card
            title="品质检测记录"
            className="card-shadow"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTest}>
                新增检测
              </Button>
            }
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="理化指标标准" className="card-shadow">
            <List
              size="small"
              dataSource={[
                { name: '酒精度', standard: '52-58 %vol', stage: '蒸馏' },
                { name: '总酸', standard: '1.0-2.5 g/L', stage: '发酵/蒸馏' },
                { name: '总酯', standard: '2.0-4.5 g/L', stage: '发酵/蒸馏' },
                { name: '固形物', standard: '≤0.5 g/L', stage: '蒸馏' },
                { name: '甲醇', standard: '≤0.04 g/L', stage: '发酵' },
                { name: '己酸乙酯', standard: '2.0-3.0 g/L', stage: '陈酿' },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <span>
                        标准: <code>{item.standard}</code> | 检测阶段: {item.stage}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="近期批次品质分布" className="card-shadow">
            <Row gutter={[16, 16]}>
              {batchRecords.slice(0, 4).map((batch) => (
                <Col span={12} key={batch.id}>
                  <div style={{ padding: 16, background: '#fafafa', borderRadius: 8 }}>
                    <div style={{ fontWeight: 500, marginBottom: 8 }}>{batch.batchNo}</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                      {batch.recipeName} · {batch.operator}
                    </div>
                    <Progress
                      percent={batch.qualityLevel === 'premium' ? 95 : batch.qualityLevel === 'first' ? 85 : 70}
                      size="small"
                      strokeColor={
                        batch.qualityLevel === 'premium'
                          ? '#52c41a'
                          : batch.qualityLevel === 'first'
                          ? '#1677ff'
                          : '#faad14'
                      }
                      format={() => (
                        <Tag
                          color={
                            batch.qualityLevel === 'premium'
                              ? 'green'
                              : batch.qualityLevel === 'first'
                              ? 'blue'
                              : 'gold'
                          }
                        >
                          {batch.qualityLevel === 'premium'
                            ? '优级'
                            : batch.qualityLevel === 'first'
                            ? '一级'
                            : '合格'}
                        </Tag>
                      )}
                    />
                    <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                      酒精度: {batch.alcoholContent}%vol | 产量: {batch.output}kg
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title="新增品质检测"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="提交检测"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="batchNo" label="批次号" rules={[{ required: true, message: '请输入批次号' }]}>
                <Select placeholder="请选择批次" showSearch>
                  {batchRecords.map((b) => (
                    <Option key={b.id} value={b.batchNo}>
                      {b.batchNo} ({b.recipeName})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stage" label="检测阶段" rules={[{ required: true, message: '请选择检测阶段' }]}>
                <Select placeholder="请选择">
                  <Option value="fermentation">发酵检测</Option>
                  <Option value="distillation">蒸馏检测</Option>
                  <Option value="aging">陈酿检测</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <div className="section-title">理化指标检测</div>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="alcohol" label="酒精度 (%vol)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="acid" label="总酸 (g/L)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ester" label="总酯 (g/L)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="solids" label="固形物 (g/L)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="检测详情"
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={600}
      >
        {currentTest && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <p><strong>批次号：</strong>{currentTest.batchNo}</p>
                <p><strong>检测阶段：</strong>{getStageText(currentTest.stage)}</p>
                <p><strong>检测时间：</strong>{currentTest.testTime}</p>
              </Col>
              <Col span={12}>
                <p><strong>检测员：</strong>{currentTest.tester}</p>
                <p>
                  <strong>整体结果：</strong>
                  <Tag color={getResultColor(currentTest.overallResult)}>
                    {getResultText(currentTest.overallResult)}
                  </Tag>
                </p>
              </Col>
            </Row>
            <div className="section-title">检测项目明细</div>
            <List
              size="small"
              dataSource={currentTest.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={`标准范围: ${item.standard.min} - ${item.standard.max} ${item.unit}`}
                  />
                  <Space>
                    <span style={{ fontWeight: 600 }}>
                      {item.value} {item.unit}
                    </span>
                    <Tag color={item.result === 'pass' ? 'green' : 'red'}>
                      {item.result === 'pass' ? '合格' : '不合格'}
                    </Tag>
                  </Space>
                </List.Item>
              )}
            />
            {currentTest.remark && (
              <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                <strong>备注：</strong>{currentTest.remark}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default QualityControl
