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

  interface TimelineNode {
    key: string
    time: string
    color: string
    title: string
    type: 'test' | 'recheckRequest' | 'disposal'
    test?: QualityTest
    extra?: Record<string, any>
  }

  const buildTimelineNodes = (): TimelineNode[] => {
    const nodes: TimelineNode[] = []
    batchTests.forEach((t) => {
      if (!t.isRecheck) {
        nodes.push({
          key: `t-${t.id}`,
          time: t.testTime,
          color: STAGE_COLORS[t.stage] || '#8c8c8c',
          title: `${STAGE_NAMES[t.stage]}初检`,
          type: 'test',
          test: t,
        })
        if (t.recheckRequestTime) {
          nodes.push({
            key: `rr-${t.id}`,
            time: t.recheckRequestTime,
            color: '#fa8c16',
            title: `${STAGE_NAMES[t.stage]}复检申请`,
            type: 'recheckRequest',
            test: t,
            extra: {
              applicant: t.recheckApplicant,
              reason: t.recheckReason,
            },
          })
        }
      }
    })
    batchTests.forEach((t) => {
      if (t.isRecheck) {
        nodes.push({
          key: `t-${t.id}`,
          time: t.testTime,
          color: '#722ed1',
          title: `${STAGE_NAMES[t.stage]}复检结果`,
          type: 'test',
          test: t,
        })
      }
    })
    batchTests.forEach((t) => {
      if (t.disposal && t.disposalTime) {
        nodes.push({
          key: `d-${t.id}`,
          time: t.disposalTime,
          color:
            t.disposal === 'release'
              ? '#52c41a'
              : t.disposal === 'degrade'
              ? '#faad14'
              : t.disposal === 'discard'
              ? '#f5222d'
              : '#1677ff',
          title: `最终处置 - ${
            t.disposal === 'release'
              ? '放行'
              : t.disposal === 'degrade'
              ? '降级'
              : t.disposal === 'discard'
              ? '报废'
              : '返工'
          }`,
          type: 'disposal',
          test: t,
          extra: {
            operator: t.disposalOperator,
            remark: t.disposalRemark,
          },
        })
      }
    })
    nodes.sort((a, b) => a.time.localeCompare(b.time))
    return nodes
  }

  const timelineNodes = buildTimelineNodes()

  const timelineItems = timelineNodes.map((node) => {
    if (node.type === 'recheckRequest') {
      return {
        color: node.color,
        dot: <ReloadOutlined />,
        children: (
          <div>
            <Space>
              <strong style={{ fontSize: 14 }}>{node.title}</strong>
              <Tag color="orange">申请复检</Tag>
            </Space>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {node.time} · 申请人: {node.extra?.applicant || '-'}
            </div>
            {node.extra?.reason && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <strong>申请原因: </strong>
                {node.extra.reason}
              </div>
            )}
          </div>
        ),
      }
    }
    if (node.type === 'disposal') {
      const disp = node.test?.disposal || ''
      const colorMap: Record<string, string> = {
        release: 'green',
        degrade: 'gold',
        discard: 'red',
        rework: 'orange',
      }
      const textMap: Record<string, string> = {
        release: '放行',
        degrade: '降级',
        discard: '报废',
        rework: '返工',
      }
      return {
        color: node.color,
        dot: node.test?.disposal === 'release' ? <CheckCircleOutlined /> : <ArrowDownOutlined />,
        children: (
          <div>
            <Space>
              <strong style={{ fontSize: 14 }}>{node.title}</strong>
              <Tag color={colorMap[disp]}>{textMap[disp]}</Tag>
              <Tag color="purple">最终处置</Tag>
            </Space>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
              {node.time} · 处置人: {node.extra?.operator || '-'}
            </div>
            {node.extra?.remark && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <strong>处置备注: </strong>
                {node.extra.remark}
              </div>
            )}
          </div>
        ),
      }
    }
    const test = node.test!
    return {
      color: node.color,
      children: (
        <div>
          <Space>
            <strong style={{ fontSize: 14 }}>{node.title}</strong>
            {test.isRecheck && <Tag color="purple">复检</Tag>}
            {!test.isRecheck && <Tag color="blue">初检</Tag>}
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
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
              setSelectedTest(test)
              setDetailVisible(true)
            }}>
              查看全部 {test.items.length} 项明细
            </Button>
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

  const finalDisposition = (() => {
    if (timelineNodes.length === 0) return { text: '未检测', color: 'default' }
    const disposal = timelineNodes.filter((n) => n.type === 'disposal').slice(-1)[0]
    if (disposal) {
      const disp = disposal.test?.disposal || ''
      const colorMap: Record<string, string> = {
        release: 'green',
        degrade: 'gold',
        discard: 'red',
        rework: 'orange',
      }
      const textMap: Record<string, string> = {
        release: '放行',
        degrade: '降级',
        discard: '报废',
        rework: '返工',
      }
      return { text: textMap[disp] || disp, color: colorMap[disp] || 'default' }
    }
    const last = batchTests[batchTests.length - 1]
    if (!last) return { text: '未检测', color: 'default' }
    if (last.overallResult === 'pass') return { text: '合格，待处置', color: 'green' }
    if (last.overallResult === 'recheck') return { text: '待复检', color: 'orange' }
    if (last.overallResult === 'degraded') return { text: '降级处理', color: 'gold' }
    if (last.overallResult === 'fail') return { text: '不合格-待处理', color: 'red' }
    return { text: getResultText(last.overallResult), color: getResultColor(last.overallResult) }
  })()

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
