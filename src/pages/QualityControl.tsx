import { useState, useEffect } from 'react'
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
  Alert,
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

type Stage = 'fermentation' | 'distillation' | 'aging'

interface StandardItem {
  name: string
  field: string
  unit: string
  min: number
  max: number
  step: number
}

const STAGE_STANDARDS: Record<Stage, StandardItem[]> = {
  fermentation: [
    { name: '酒精度', field: 'alcohol', unit: '%vol', min: 8, max: 14, step: 0.1 },
    { name: '总酸', field: 'acid', unit: 'g/L', min: 1.0, max: 2.5, step: 0.1 },
    { name: '总酯', field: 'ester', unit: 'g/L', min: 2.0, max: 4.5, step: 0.1 },
    { name: '甲醇', field: 'methanol', unit: 'g/L', min: 0, max: 0.04, step: 0.001 },
  ],
  distillation: [
    { name: '酒精度', field: 'alcohol', unit: '%vol', min: 52, max: 58, step: 0.1 },
    { name: '总酸', field: 'acid', unit: 'g/L', min: 1.0, max: 2.5, step: 0.1 },
    { name: '总酯', field: 'ester', unit: 'g/L', min: 2.0, max: 4.5, step: 0.1 },
    { name: '固形物', field: 'solids', unit: 'g/L', min: 0, max: 0.5, step: 0.01 },
  ],
  aging: [
    { name: '酒精度', field: 'alcohol', unit: '%vol', min: 50, max: 55, step: 0.1 },
    { name: '总酸', field: 'acid', unit: 'g/L', min: 1.5, max: 3.0, step: 0.1 },
    { name: '总酯', field: 'ester', unit: 'g/L', min: 2.5, max: 5.0, step: 0.1 },
    { name: '己酸乙酯', field: 'caproicEster', unit: 'g/L', min: 2.0, max: 3.0, step: 0.1 },
  ],
}

const STAGE_NAMES: Record<Stage, string> = {
  fermentation: '发酵检测',
  distillation: '蒸馏检测',
  aging: '陈酿检测',
}

const getStandardByStage = (stage: Stage): StandardItem[] => STAGE_STANDARDS[stage] || []

const buildItems = (values: any, stage: Stage): QualityTest['items'] => {
  const standards = getStandardByStage(stage)
  return standards.map((std) => {
    const value = Number(values[std.field])
    const pass = value >= std.min && value <= std.max
    return {
      name: std.name,
      value,
      unit: std.unit,
      standard: { min: std.min, max: std.max },
      result: pass ? 'pass' : 'fail',
    }
  })
}

const QualityControl: React.FC = () => {
  const qualityTests = useAppStore((state) => state.qualityTests)
  const recipes = useAppStore((state) => state.recipes)
  const addQualityTest = useAppStore((state) => state.addQualityTest)
  const updateQualityTest = useAppStore((state) => state.updateQualityTest)
  const batchRecords = useAppStore((state) => state.batchRecords)
  const currentUser = useAppStore((state) => state.currentUser)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isRecheckModalVisible, setIsRecheckModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [currentTest, setCurrentTest] = useState<QualityTest | null>(null)
  const [recheckTest, setRecheckTest] = useState<QualityTest | null>(null)
  const [modalStage, setModalStage] = useState<Stage>('fermentation')
  const [form] = Form.useForm()
  const [recheckForm] = Form.useForm()
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

  const getStageText = (stage: string) => STAGE_NAMES[stage as Stage] || stage

  const handleAddTest = () => {
    form.resetFields()
    setModalStage('fermentation')
    setIsModalVisible(true)
  }

  const handleStageChange = (value: Stage) => {
    setModalStage(value)
  }

  const handleViewDetail = (test: QualityTest) => {
    setCurrentTest(test)
    setIsDetailVisible(true)
  }

  const handleRequestRecheck = (test: QualityTest) => {
    Modal.confirm({
      title: '申请复检',
      content: `确定对批次 ${test.batchNo} 申请复检吗？申请后状态将变为"待复检"，等待复检完成。`,
      okText: '确认申请复检',
      cancelText: '取消',
      onOk: () => {
        updateQualityTest(test.id, {
          overallResult: 'recheck',
        })
        if (currentTest?.id === test.id) {
          setCurrentTest({ ...test, overallResult: 'recheck' })
        }
        message.success('复检申请已提交，列表状态已更新为待复检')
      },
    })
  }

  const handleOpenRecheck = (test: QualityTest) => {
    setRecheckTest(test)
    recheckForm.resetFields()
    const standards = getStandardByStage(test.stage as Stage)
    const initialValues: Record<string, number> = {}
    standards.forEach((std) => {
      const existing = test.items.find((it) => it.name === std.name)
      initialValues[std.field] = existing?.value ?? 0
    })
    recheckForm.setFieldsValue(initialValues)
    setIsRecheckModalVisible(true)
  }

  const handleDegrade = (test: QualityTest) => {
    Modal.confirm({
      title: '降级处理',
      content: `确定将批次 ${test.batchNo} 做降级处理吗？`,
      okText: '确认降级',
      okType: 'danger',
      onOk: () => {
        updateQualityTest(test.id, {
          overallResult: 'degraded',
        })
        if (currentTest?.id === test.id) {
          setCurrentTest({ ...test, overallResult: 'degraded' })
        }
        message.success('已做降级处理')
      },
    })
  }

  const handlePass = (test: QualityTest) => {
    Modal.confirm({
      title: '合格判定',
      content: `确定批次 ${test.batchNo} 检测合格吗？合格后方可进入下一工序。`,
      onOk: () => {
        updateQualityTest(test.id, {
          overallResult: 'pass',
        })
        if (currentTest?.id === test.id) {
          setCurrentTest({ ...test, overallResult: 'pass' })
        }
        message.success('判定为合格，可进入下一工序')
      },
    })
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const stage = values.stage as Stage
      const items = buildItems(values, stage)
      const overallPass = items.every((item) => item.result === 'pass')

      const newTest: QualityTest = {
        id: `Q${Date.now()}`,
        batchNo: values.batchNo,
        testTime: dayjs().format('YYYY-MM-DD HH:mm'),
        tester: currentUser.name,
        stage,
        items,
        overallResult: overallPass ? 'pass' : 'fail',
      }
      addQualityTest(newTest)
      message.success(overallPass ? '检测记录已添加，全部项目合格' : '检测记录已添加，存在不合格项目')
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  const handleRecheckSubmit = () => {
    if (!recheckTest) return
    recheckForm.validateFields().then((values) => {
      const stage = recheckTest.stage as Stage
      const items = buildItems(values, stage)
      const overallPass = items.every((item) => item.result === 'pass')

      updateQualityTest(recheckTest.id, {
        items,
        overallResult: overallPass ? 'pass' : 'fail',
        testTime: dayjs().format('YYYY-MM-DD HH:mm'),
        tester: currentUser.name,
        remark: `复检完成 - ${overallPass ? '复检合格' : '复检不合格'}`,
      })
      if (currentTest?.id === recheckTest.id) {
        setCurrentTest({
          ...recheckTest,
          items,
          overallResult: overallPass ? 'pass' : 'fail',
          testTime: dayjs().format('YYYY-MM-DD HH:mm'),
          tester: currentUser.name,
          remark: `复检完成 - ${overallPass ? '复检合格' : '复检不合格'}`,
        })
      }
      message.success(overallPass ? '复检完成，判定合格' : '复检完成，仍不合格')
      setIsRecheckModalVisible(false)
      setRecheckTest(null)
      recheckForm.resetFields()
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
      width: 240,
      render: (_: any, record: QualityTest) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.overallResult === 'fail' && (
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => handleRequestRecheck(record)}>
              申请复检
            </Button>
          )}
          {record.overallResult === 'recheck' && (
            <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => handleOpenRecheck(record)}>
              完成复检
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

  const currentStandards = getStandardByStage(modalStage)

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
          <Card title="各阶段理化指标标准" className="card-shadow">
            <Tabs
              items={[
                {
                  key: 'fermentation',
                  label: '发酵检测',
                  children: (
                    <List
                      size="small"
                      dataSource={STAGE_STANDARDS.fermentation}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.name}
                            description={`标准范围: ${item.min} - ${item.max} ${item.unit}`}
                          />
                          <Tag color="blue">发酵</Tag>
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: 'distillation',
                  label: '蒸馏检测',
                  children: (
                    <List
                      size="small"
                      dataSource={STAGE_STANDARDS.distillation}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.name}
                            description={`标准范围: ${item.min} - ${item.max} ${item.unit}`}
                          />
                          <Tag color="orange">蒸馏</Tag>
                        </List.Item>
                      )}
                    />
                  ),
                },
                {
                  key: 'aging',
                  label: '陈酿检测',
                  children: (
                    <List
                      size="small"
                      dataSource={STAGE_STANDARDS.aging}
                      renderItem={(item) => (
                        <List.Item>
                          <List.Item.Meta
                            title={item.name}
                            description={`标准范围: ${item.min} - ${item.max} ${item.unit}`}
                          />
                          <Tag color="gold">陈酿</Tag>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]}
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
        <Alert
          message={`当前阶段: ${STAGE_NAMES[modalStage]} - 共 ${currentStandards.length} 项指标`}
          description={currentStandards.map((s) => `${s.name}: ${s.min}-${s.max}${s.unit}`).join(' | ')}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="batchNo" label="批次号" rules={[{ required: true, message: '请选择批次' }]}>
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
                <Select placeholder="请选择" onChange={handleStageChange}>
                  <Option value="fermentation">发酵检测</Option>
                  <Option value="distillation">蒸馏检测</Option>
                  <Option value="aging">陈酿检测</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <div className="section-title">理化指标检测（按当前阶段标准判定）</div>
          <Row gutter={16}>
            {currentStandards.map((std, idx) => (
              <Col span={12} key={std.field}>
                <Form.Item
                  name={std.field}
                  label={`${std.name} (${std.unit})`}
                  rules={[{ required: true, message: `请输入${std.name}` }]}
                  extra={`标准范围: ${std.min} ~ ${std.max} ${std.unit}`}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    step={std.step}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>

      <Modal
        title={`完成复检 - ${recheckTest?.batchNo || ''} (${STAGE_NAMES[(recheckTest?.stage as Stage) || 'fermentation']})`}
        open={isRecheckModalVisible}
        onOk={handleRecheckSubmit}
        onCancel={() => {
          setIsRecheckModalVisible(false)
          setRecheckTest(null)
        }}
        width={600}
        okText="提交复检结果"
        cancelText="取消"
      >
        {recheckTest && (
          <>
            <Alert
              message={`复检阶段: ${STAGE_NAMES[recheckTest.stage as Stage]} - 共 ${getStandardByStage(recheckTest.stage as Stage).length} 项指标`}
              description="请重新输入检测值，系统将按标准范围重新判定合格/不合格"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form form={recheckForm} layout="vertical">
              <div className="section-title">复检指标（按阶段标准重新判定）</div>
              <Row gutter={16}>
                {getStandardByStage(recheckTest.stage as Stage).map((std) => (
                  <Col span={12} key={std.field}>
                    <Form.Item
                      name={std.field}
                      label={`${std.name} (${std.unit})`}
                      rules={[{ required: true, message: `请输入${std.name}` }]}
                      extra={`标准范围: ${std.min} ~ ${std.max} ${std.unit}`}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        step={std.step}
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title="检测详情"
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={650}
      >
        {currentTest && (
          <div>
            {(() => {
              const latestTest = qualityTests.find((t) => t.id === currentTest.id) || currentTest
              return (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <p><strong>批次号：</strong>{latestTest.batchNo}</p>
                      <p><strong>检测阶段：</strong>{getStageText(latestTest.stage)}</p>
                      <p><strong>检测时间：</strong>{latestTest.testTime}</p>
                    </Col>
                    <Col span={12}>
                      <p><strong>检测员：</strong>{latestTest.tester}</p>
                      <p>
                        <strong>整体结果：</strong>
                        <Tag color={getResultColor(latestTest.overallResult)}>
                          {getResultText(latestTest.overallResult)}
                        </Tag>
                      </p>
                    </Col>
                  </Row>
                  <div className="section-title">检测项目明细（按阶段标准判定）</div>
                  <List
                    size="small"
                    dataSource={latestTest.items}
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
                  {latestTest.remark && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                      <strong>备注：</strong>{latestTest.remark}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default QualityControl
