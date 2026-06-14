import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Space,
  Timeline,
  Modal,
  Divider,
  Descriptions,
  Empty,
  List,
} from 'antd'
import {
  SearchOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ArrowDownOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import type { QualityTest } from '../types'

const { Option } = Select

const STAGE_NAMES: Record<string, string> = {
  fermentation: '发酵检测',
  distillation: '蒸馏检测',
  aging: '陈酿检测',
}

const STAGE_ORDER = ['fermentation', 'distillation', 'aging']

const STAGE_COLORS: Record<string, string> = {
  fermentation: '#1677ff',
  distillation: '#722ed1',
  aging: '#fa8c16',
}

const BatchTracking: React.FC = () => {
  const qualityTests = useAppStore((state) => state.qualityTests)
  const batchRecords = useAppStore((state) => state.batchRecords)
  const recipes = useAppStore((state) => state.recipes)

  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedTest, setSelectedTest] = useState<QualityTest | null>(null)

  const allBatchNos = Array.from(
    new Set([...batchRecords.map((b) => b.batchNo), ...qualityTests.map((t) => t.batchNo)]),
  ).sort()

  const batchTests = selectedBatch
    ? qualityTests.filter((t) => t.batchNo === selectedBatch).sort((a, b) => a.testTime.localeCompare(b.testTime))
    : []

  const batchInfo = selectedBatch ? batchRecords.find((b) => b.batchNo === selectedBatch) : null

  const getResultText = (result: string) => {
    const map: Record<string, string> = {
      pass: '合格',
      fail: '不合格',
      recheck: '待复检',
      degraded: '降级',
    }
    return map[result] || result
  }

  const getResultColor = (result: string) => {
    const map: Record<string, string> = {
      pass: 'green',
      fail: 'red',
      recheck: 'orange',
      degraded: 'gold',
    }
    return map[result] || 'default'
  }

  const getStageTests = (stage: string) => batchTests.filter((t) => t.stage === stage)

  const latestByStage = (stage: string) => {
    const tests = getStageTests(stage)
    return tests.length > 0 ? tests[tests.length - 1] : null
  }

  const finalDisposition = (() => {
    if (batchTests.length === 0) return { text: '未检测', color: 'default' }
    const last = batchTests[batchTests.length - 1]
    if (last.overallResult === 'pass') return { text: '合格流转/入库', color: 'green' }
    if (last.overallResult === 'recheck') return { text: '待复检', color: 'orange' }
    if (last.overallResult === 'degraded') return { text: '降级处理', color: 'gold' }
    if (last.overallResult === 'fail') return { text: '不合格-待处理', color: 'red' }
    return { text: getResultText(last.overallResult), color: getResultColor(last.overallResult) }
  })()

  const timelineItems = batchTests.map((test, idx) => {
    const stageName = STAGE_NAMES[test.stage] || test.stage
    const isRecheck = test.remark?.includes('复检')
    return {
      color: STAGE_COLORS[test.stage] || '#8c8c8c',
      children: (
        <div>
          <Space>
            <strong style={{ fontSize: 14 }}>{stageName}</strong>
            {isRecheck && <Tag color="orange">复检</Tag>}
            <Tag color={getResultColor(test.overallResult)}>{getResultText(test.overallResult)}</Tag>
          </Space>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
            {test.testTime} · 检测员: {test.tester}
          </div>
          <div style={{ marginTop: 8 }}>
            <List
              size="small"
              dataSource={test.items.slice(0, 2)}
              renderItem={(item) => (
                <List.Item style={{ padding: '2px 0' }}>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>{item.name}:</span>
                  <Space style={{ marginLeft: 8 }}>
                    <span style={{ fontSize: 12 }}>
                      {item.value} {item.unit}
                    </span>
                    <Tag style={{ margin: 0 }} color={item.result === 'pass' ? 'green' : 'red'}>
                      {item.result === 'pass' ? '合格' : '不合格'}
                    </Tag>
                  </Space>
                </List.Item>
              )}
            />
            {test.items.length > 2 && (
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
                setSelectedTest(test)
                setDetailVisible(true)
              }}>
                查看全部 {test.items.length} 项明细
              </Button>
            )}
          </div>
          {test.remark && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#8c8c8c' }}>
              备注: {test.remark}
            </div>
          )}
        </div>
      ),
    }
  })

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
      render: (text: string) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => setSelectedBatch(text)}>
          {text}
        </Button>
      ),
    },
    {
      title: '配方',
      dataIndex: 'recipeName',
      key: 'recipeName',
      width: 140,
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '检测次数',
      key: 'count',
      width: 100,
      render: (_: any, record: any) => {
        const tests = qualityTests.filter((t) => t.batchNo === record.batchNo)
        return <span>{tests.length} 次</span>
      },
    },
    {
      title: '最终处置',
      key: 'disposition',
      width: 140,
      render: (_: any, record: any) => {
        const tests = qualityTests.filter((t) => t.batchNo === record.batchNo)
        if (tests.length === 0) return <Tag>未检测</Tag>
        const last = tests[tests.length - 1]
        return <Tag color={getResultColor(last.overallResult)}>{getResultText(last.overallResult)}</Tag>
      },
    },
  ]

  return (
    <div className="page-container">
      <Card
        title="批次质量追踪"
        className="card-shadow"
        extra={
          <Space>
            <Select
              style={{ width: 260 }}
              placeholder="请选择批次号查询"
              showSearch
              allowClear
              value={selectedBatch || undefined}
              onChange={(v) => setSelectedBatch(v || null)}
              suffixIcon={<SearchOutlined />}
            >
              {allBatchNos.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={10}>
            <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>批次列表</div>
            <Table
              size="small"
              columns={columns}
              dataSource={batchRecords}
              rowKey="batchNo"
              pagination={{ pageSize: 8 }}
              scroll={{ y: 520 }}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedBatch ? [selectedBatch] : [],
                onChange: (keys) => setSelectedBatch(keys[0] as string || null),
              }}
            />
          </Col>
          <Col span={14}>
            <div style={{ fontWeight: 500, marginBottom: 12, fontSize: 14 }}>
              批次检测时间线
              {selectedBatch && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {selectedBatch}
                </Tag>
              )}
              {selectedBatch && (
                <Tag color={finalDisposition.color} style={{ marginLeft: 4 }}>
                  最终处置: {finalDisposition.text}
                </Tag>
              )}
            </div>
            {!selectedBatch ? (
              <Empty description="请选择一个批次查看检测时间线" style={{ marginTop: 80 }} />
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 8 }}>
                {batchInfo && (
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="配方">{batchInfo.recipeName}</Descriptions.Item>
                      <Descriptions.Item label="酒精度">{batchInfo.alcoholContent}%vol</Descriptions.Item>
                      <Descriptions.Item label="产量">{batchInfo.output} kg</Descriptions.Item>
                      <Descriptions.Item label="操作员">{batchInfo.operator}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                )}

                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  {STAGE_ORDER.map((stage) => {
                    const test = latestByStage(stage)
                    return (
                      <Col span={8} key={stage}>
                        <Card
                          size="small"
                          style={{
                            borderTop: `3px solid ${STAGE_COLORS[stage]}`,
                            opacity: test ? 1 : 0.5,
                          }}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <div style={{ fontWeight: 500 }}>{STAGE_NAMES[stage]}</div>
                            {test ? (
                              <>
                                <Tag color={getResultColor(test.overallResult)}>
                                  {getResultText(test.overallResult)}
                                </Tag>
                                <div style={{ fontSize: 11, color: '#8c8c8c' }}>{test.testTime.slice(5)}</div>
                              </>
                            ) : (
                              <Tag>未检测</Tag>
                            )}
                          </Space>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>

                <Divider style={{ margin: '8px 0 12px 0' }} orientation="left" plain>
                  详细检测时间线
                </Divider>

                {timelineItems.length === 0 ? (
                  <Empty description="该批次暂无检测记录" style={{ marginTop: 60 }} />
                ) : (
                  <Timeline items={timelineItems} />
                )}
              </div>
            )}
          </Col>
        </Row>
      </Card>

      <Modal
        title="检测明细"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={580}
      >
        {selectedTest && (
          <div>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={12}>
                <p><strong>批次：</strong>{selectedTest.batchNo}</p>
                <p><strong>阶段：</strong>{STAGE_NAMES[selectedTest.stage]}</p>
              </Col>
              <Col span={12}>
                <p><strong>时间：</strong>{selectedTest.testTime}</p>
                <p>
                  <strong>整体：</strong>
                  <Tag color={getResultColor(selectedTest.overallResult)}>
                    {getResultText(selectedTest.overallResult)}
                  </Tag>
                </p>
              </Col>
            </Row>
            <Divider style={{ margin: '4px 0 12px 0' }}>检测项目明细</Divider>
            <List
              dataSource={selectedTest.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={`标准范围: ${item.standard.min} ~ ${item.standard.max} ${item.unit}`}
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
          </div>
        )}
      </Modal>
    </div>
  )
}

export default BatchTracking
