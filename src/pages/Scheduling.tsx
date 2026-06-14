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
  DatePicker,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Timeline,
  Badge,
} from 'antd'
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import type { Schedule } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TextArea } = Input

const Scheduling: React.FC = () => {
  const schedules = useAppStore((state) => state.schedules)
  const recipes = useAppStore((state) => state.recipes)
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const updateSchedule = useAppStore((state) => state.updateSchedule)
  const addSchedule = useAppStore((state) => state.addSchedule)
  const approveScheduleAdjust = useAppStore((state) => state.approveScheduleAdjust)
  const rejectScheduleAdjust = useAppStore((state) => state.rejectScheduleAdjust)
  const currentUser = useAppStore((state) => state.currentUser)

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null)
  const [modalType, setModalType] = useState<'create' | 'adjust' | 'approve'>('create')
  const [form] = Form.useForm()

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      adjusting: '调整中',
      executing: '执行中',
      completed: '已完成',
    }
    return textMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'gold',
      approved: 'green',
      rejected: 'red',
      adjusting: 'orange',
      executing: 'blue',
      completed: 'default',
    }
    return colorMap[status] || 'default'
  }

  const getShiftText = (shift: string) => {
    const textMap: Record<string, string> = {
      morning: '早班 (08:00-16:00)',
      afternoon: '中班 (16:00-00:00)',
      night: '夜班 (00:00-08:00)',
    }
    return textMap[shift] || shift
  }

  const handleApprove = (schedule: Schedule) => {
    Modal.confirm({
      title: '确认批准排程',
      content: `确定批准 ${schedule.batchNo} 的排程吗？批准后将推送至各工段终端。`,
      okText: '批准',
      cancelText: '取消',
      onOk: () => {
        updateSchedule(schedule.id, {
          status: 'approved',
          approver: currentUser.name,
          approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        message.success('排程已批准')
      },
    })
  }

  const handleReject = (schedule: Schedule) => {
    Modal.confirm({
      title: '拒绝排程',
      content: `确定拒绝 ${schedule.batchNo} 的排程吗？`,
      okText: '拒绝',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        updateSchedule(schedule.id, {
          status: 'rejected',
          approver: currentUser.name,
          approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        message.success('排程已拒绝')
      },
    })
  }

  const handleApproveAdjust = (schedule: Schedule) => {
    Modal.confirm({
      title: '批准调整申请',
      content: `确定批准 ${schedule.batchNo} 的排程调整申请吗？批准后将使用新的排程信息。`,
      okText: '批准调整',
      cancelText: '取消',
      onOk: () => {
        approveScheduleAdjust(schedule.id, currentUser.name)
        message.success('调整申请已批准')
      },
    })
  }

  const handleRejectAdjust = (schedule: Schedule) => {
    Modal.confirm({
      title: '拒绝调整申请',
      content: `确定拒绝 ${schedule.batchNo} 的排程调整申请吗？拒绝后将保留原排程信息。`,
      okText: '拒绝调整',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        rejectScheduleAdjust(schedule.id, currentUser.name)
        message.success('调整申请已拒绝，原排程已恢复')
      },
    })
  }

  const handleCreate = () => {
    setModalType('create')
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleAdjust = (schedule: Schedule) => {
    setModalType('adjust')
    setCurrentSchedule(schedule)
    form.setFieldsValue({
      recipeId: schedule.recipeId,
      fermenterId: schedule.fermenterId,
      distillerId: schedule.distillerId,
      timeRange: [dayjs(schedule.startTime), dayjs(schedule.endTime)],
      shift: schedule.shift,
    })
    setIsModalVisible(true)
  }

  const handleViewDetail = (schedule: Schedule) => {
    setCurrentSchedule(schedule)
    setIsDetailVisible(true)
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (modalType === 'create') {
        const newSchedule: Schedule = {
          id: `S${Date.now()}`,
          date: values.timeRange[0].format('YYYY-MM-DD'),
          shift: values.shift,
          batchNo: `B${dayjs().format('YYYYMMDD')}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`,
          recipeId: values.recipeId,
          recipeName: recipes.find((r) => r.id === values.recipeId)?.name || '',
          fermenterId: values.fermenterId,
          fermenterName: fermenters.find((f) => f.id === values.fermenterId)?.name || '',
          distillerId: values.distillerId,
          distillerName: distillers.find((d) => d.id === values.distillerId)?.name || '',
          startTime: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
          endTime: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
          status: 'pending',
          applyTime: dayjs().format('YYYY-MM-DD HH:mm'),
          operator: currentUser.name,
        }
        addSchedule(newSchedule)
        message.success('排程已创建，等待审批')
      } else if (modalType === 'adjust' && currentSchedule) {
        updateSchedule(currentSchedule.id, {
          status: 'adjusting',
          adjustReason: values.reason,
          recipeId: values.recipeId,
          recipeName: recipes.find((r) => r.id === values.recipeId)?.name || '',
          fermenterId: values.fermenterId,
          fermenterName: fermenters.find((f) => f.id === values.fermenterId)?.name || '',
          distillerId: values.distillerId,
          distillerName: distillers.find((d) => d.id === values.distillerId)?.name || '',
          startTime: values.timeRange[0].format('YYYY-MM-DD HH:mm'),
          endTime: values.timeRange[1].format('YYYY-MM-DD HH:mm'),
          shift: values.shift,
          originalSchedule: {
            fermenterId: currentSchedule.fermenterId,
            fermenterName: currentSchedule.fermenterName,
            distillerId: currentSchedule.distillerId,
            distillerName: currentSchedule.distillerName,
            startTime: currentSchedule.startTime,
            endTime: currentSchedule.endTime,
            shift: currentSchedule.shift,
            status: currentSchedule.status,
          },
        })
        message.success('调整申请已提交，等待审批')
      }
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  const handleGenerateSchedule = () => {
    message.loading({ content: '正在智能生成排程...', key: 'generate' })
    setTimeout(() => {
      const fermenter = fermenters.find((f) => f.status === 'idle')
      if (fermenter) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)]
        const newSchedule: Schedule = {
          id: `S${Date.now()}`,
          date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
          shift: 'morning',
          batchNo: `B${dayjs().add(1, 'day').format('YYYYMMDD')}01`,
          recipeId: recipe.id,
          recipeName: recipe.name,
          fermenterId: fermenter.id,
          fermenterName: fermenter.name,
          startTime: dayjs().add(1, 'day').hour(8).minute(0).format('YYYY-MM-DD HH:mm'),
          endTime: dayjs()
            .add(1, 'day')
            .add(recipe.fermentationDays, 'day')
            .hour(18)
            .minute(0)
            .format('YYYY-MM-DD HH:mm'),
          status: 'pending',
          applyTime: dayjs().format('YYYY-MM-DD HH:mm'),
          operator: currentUser.name,
        }
        addSchedule(newSchedule)
        message.success({ content: '智能排程已生成，考虑了发酵罐清洗时间和批次切换规则', key: 'generate' })
      } else {
        message.warning({ content: '暂无空闲发酵罐可用', key: 'generate' })
      }
    }, 1500)
  }

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
    },
    {
      title: '酒品配方',
      dataIndex: 'recipeName',
      key: 'recipeName',
      width: 120,
    },
    {
      title: '发酵罐',
      dataIndex: 'fermenterName',
      key: 'fermenterName',
      width: 120,
    },
    {
      title: '蒸馏设备',
      dataIndex: 'distillerName',
      key: 'distillerName',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '班次',
      dataIndex: 'shift',
      key: 'shift',
      width: 100,
      render: (shift: string) => getShiftText(shift).split(' ')[0],
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 160,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 160,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right' as const,
      render: (_: any, record: Schedule) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'pending' && currentUser.role === 'director' && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record)}>
                批准
              </Button>
              <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => handleReject(record)}>
                拒绝
              </Button>
            </>
          )}
          {record.status === 'adjusting' && currentUser.role === 'director' && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApproveAdjust(record)}>
                批准调整
              </Button>
              <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => handleRejectAdjust(record)}>
                拒绝调整
              </Button>
            </>
          )}
          {(record.status === 'pending' || record.status === 'approved') && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleAdjust(record)}>
              申请调整
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const pendingCount = schedules.filter((s) => s.status === 'pending').length
  const approvedCount = schedules.filter((s) => s.status === 'approved').length
  const adjustingCount = schedules.filter((s) => s.status === 'adjusting').length
  const todayCount = schedules.filter((s) => s.date === dayjs().format('YYYY-MM-DD')).length

  return (
    <div className="page-container">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="今日排程"
              value={todayCount}
              prefix={<ClockCircleOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="待审批"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="已批准"
              value={approvedCount}
              prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="card-shadow">
            <Statistic
              title="调整申请"
              value={adjustingCount}
              prefix={<EditOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="酿造排程管理"
        className="card-shadow"
        extra={
          <Space>
            <Button icon={<ThunderboltOutlined />} type="primary" onClick={handleGenerateSchedule}>
              智能生成排程
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleCreate}>
              手动创建
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={schedules}
          rowKey="id"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={modalType === 'create' ? '创建排程' : '申请调整排程'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="recipeId"
                label="酒品配方"
                rules={[{ required: true, message: '请选择酒品配方' }]}
              >
                <Select placeholder="请选择配方">
                  {recipes.map((r) => (
                    <Select.Option key={r.id} value={r.id}>
                      {r.name} (发酵{r.fermentationDays}天)
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shift" label="班次" rules={[{ required: true, message: '请选择班次' }]}>
                <Select placeholder="请选择班次">
                  <Select.Option value="morning">早班 (08:00-16:00)</Select.Option>
                  <Select.Option value="afternoon">中班 (16:00-00:00)</Select.Option>
                  <Select.Option value="night">夜班 (00:00-08:00)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fermenterId"
                label="发酵罐"
                rules={[{ required: true, message: '请选择发酵罐' }]}
              >
                <Select placeholder="请选择发酵罐">
                  {fermenters
                    .filter((f) => f.status === 'idle' || f.status === 'cleaning')
                    .map((f) => (
                      <Select.Option key={f.id} value={f.id}>
                        {f.name} ({f.status === 'idle' ? '空闲' : '清洗中'})
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="distillerId" label="蒸馏设备">
                <Select placeholder="请选择蒸馏设备（可选）">
                  {distillers
                    .filter((d) => d.status === 'idle')
                    .map((d) => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.name}
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="timeRange"
            label="生产时间"
            rules={[{ required: true, message: '请选择生产时间' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
          {modalType === 'adjust' && (
            <Form.Item
              name="reason"
              label="调整原因"
              rules={[{ required: true, message: '请填写调整原因' }]}
            >
              <TextArea rows={3} placeholder="请详细说明调整原因..." />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="排程详情"
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={700}
      >
        {currentSchedule && (
          <div>
            {(() => {
              const latestSchedule = schedules.find((s) => s.id === currentSchedule.id) || currentSchedule
              return (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <p><strong>批次号：</strong>{latestSchedule.batchNo}</p>
                      <p><strong>酒品配方：</strong>{latestSchedule.recipeName}</p>
                      <p><strong>发酵罐：</strong>{latestSchedule.fermenterName}</p>
                      <p><strong>蒸馏设备：</strong>{latestSchedule.distillerName || '-'}</p>
                      <p><strong>班次：</strong>{getShiftText(latestSchedule.shift)}</p>
                    </Col>
                    <Col span={12}>
                      <p><strong>开始时间：</strong>{latestSchedule.startTime}</p>
                      <p><strong>结束时间：</strong>{latestSchedule.endTime}</p>
                      <p><strong>状态：</strong>
                        <Tag color={getStatusColor(latestSchedule.status)}>
                          {getStatusText(latestSchedule.status)}
                        </Tag>
                      </p>
                      <p><strong>申请人：</strong>{latestSchedule.operator || '-'}</p>
                      <p><strong>审批人：</strong>{latestSchedule.approver || '-'}</p>
                      {latestSchedule.approveTime && (
                        <p><strong>审批时间：</strong>{latestSchedule.approveTime}</p>
                      )}
                    </Col>
                  </Row>
                  {latestSchedule.originalSchedule && (
                    <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                      <strong>原排程信息：</strong>
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        <p>发酵罐：{latestSchedule.originalSchedule.fermenterName}</p>
                        <p>时间：{latestSchedule.originalSchedule.startTime} ~ {latestSchedule.originalSchedule.endTime}</p>
                        <p>班次：{getShiftText(latestSchedule.originalSchedule.shift)}</p>
                      </div>
                    </div>
                  )}
                  {latestSchedule.adjustReason && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                      <strong>调整原因：</strong>{latestSchedule.adjustReason}
                    </div>
                  )}
                  <div style={{ marginTop: 20 }}>
                    <h4>审批流程</h4>
                    <Timeline
                      items={[
                        {
                          color: 'green',
                          children: (
                            <div>
                              <p>排程申请提交</p>
                              <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {latestSchedule.operator} · {latestSchedule.applyTime}
                              </p>
                            </div>
                          ),
                        },
                        ...(latestSchedule.status !== 'pending'
                          ? [
                              {
                                color: latestSchedule.status === 'rejected' ? 'red' : 'blue',
                                children: (
                                  <div>
                                    <p>
                                      {latestSchedule.status === 'rejected' ? '排程已拒绝' :
                                       latestSchedule.status === 'adjusting' ? '调整申请待审批' :
                                       '排程已批准'}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      {latestSchedule.approver} · {latestSchedule.approveTime}
                                    </p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        ...(latestSchedule.status === 'approved'
                          ? [
                              {
                                color: '#52c41a',
                                children: (
                                  <div>
                                    <p>执行中</p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>已推送至工段终端</p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Scheduling
