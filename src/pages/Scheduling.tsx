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
  DatePicker,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Timeline,
  Badge,
  Tabs,
  Tooltip,
  Alert,
  List,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  WarningOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'
import type { Schedule } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { TextArea } = Input
const { Option } = Select

type ViewMode = 'list' | 'calendar' | 'execution'

const Scheduling: React.FC = () => {
  const schedules = useAppStore((state) => state.schedules)
  const recipes = useAppStore((state) => state.recipes)
  const fermenters = useAppStore((state) => state.fermenters)
  const distillers = useAppStore((state) => state.distillers)
  const updateSchedule = useAppStore((state) => state.updateSchedule)
  const addSchedule = useAppStore((state) => state.addSchedule)
  const approveScheduleAdjust = useAppStore((state) => state.approveScheduleAdjust)
  const rejectScheduleAdjust = useAppStore((state) => state.rejectScheduleAdjust)
  const checkScheduleConflict = useAppStore((state) => state.checkScheduleConflict)
  const syncScheduleToDevice = useAppStore((state) => state.syncScheduleToDevice)
  const releaseDeviceFromSchedule = useAppStore((state) => state.releaseDeviceFromSchedule)
  const initSyncSchedulesToDevice = useAppStore((state) => state.initSyncSchedulesToDevice)
  const startSchedule = useAppStore((state) => state.startSchedule)
  const completeSchedule = useAppStore((state) => state.completeSchedule)
  const cancelSchedule = useAppStore((state) => state.cancelSchedule)
  const currentUser = useAppStore((state) => state.currentUser)

  useEffect(() => {
    initSyncSchedulesToDevice()
  }, [])

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isCancelVisible, setIsCancelVisible] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null)
  const [modalType, setModalType] = useState<'create' | 'adjust' | 'approve'>('create')
  const [form] = Form.useForm()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [calendarDate, setCalendarDate] = useState(dayjs())

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      adjusting: '调整中',
      executing: '执行中',
      completed: '已完成',
      cancelled: '已取消',
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
      cancelled: 'default',
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

  const getShiftShort = (shift: string) => {
    const map: Record<string, string> = {
      morning: '早',
      afternoon: '中',
      night: '夜',
    }
    return map[shift] || shift
  }

  const handleApprove = (schedule: Schedule) => {
    Modal.confirm({
      title: '确认批准排程',
      content: `确定批准 ${schedule.batchNo} 的排程吗？批准后将推送至各工段终端，并同步占用对应发酵罐/蒸馏设备。`,
      okText: '批准',
      cancelText: '取消',
      onOk: () => {
        updateSchedule(schedule.id, {
          status: 'approved',
          approver: currentUser.name,
          approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        setTimeout(() => syncScheduleToDevice(schedule.id), 0)
        message.success('排程已批准，设备已同步占用')
      },
    })
  }

  const handleReject = (schedule: Schedule) => {
    Modal.confirm({
      title: '拒绝排程',
      content: `确定拒绝 ${schedule.batchNo} 的排程吗？拒绝后将释放相关设备。`,
      okText: '拒绝',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        updateSchedule(schedule.id, {
          status: 'rejected',
          approver: currentUser.name,
          approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
        })
        releaseDeviceFromSchedule(schedule.id)
        message.success('排程已拒绝')
      },
    })
  }

  const handleApproveAdjust = (schedule: Schedule) => {
    Modal.confirm({
      title: '批准调整申请',
      content: `确定批准 ${schedule.batchNo} 的排程调整申请吗？批准后将使用新的排程信息并同步更新设备占用。`,
      okText: '批准调整',
      cancelText: '取消',
      onOk: () => {
        approveScheduleAdjust(schedule.id, currentUser.name)
        setTimeout(() => syncScheduleToDevice(schedule.id), 0)
        message.success('调整申请已批准，设备已更新')
      },
    })
  }

  const handleRejectAdjust = (schedule: Schedule) => {
    Modal.confirm({
      title: '拒绝调整申请',
      content: `确定拒绝 ${schedule.batchNo} 的排程调整申请吗？拒绝后将完全恢复原排程信息（配方、设备、班次、时间）。`,
      okText: '拒绝调整',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        rejectScheduleAdjust(schedule.id, currentUser.name)
        message.success('调整申请已拒绝，原排程已完全恢复')
      },
    })
  }

  const handleStartSchedule = (schedule: Schedule) => {
    Modal.confirm({
      title: '开始执行排程',
      content: `确定开始执行批次 ${schedule.batchNo} 的排程吗？执行后设备状态将同步为运行中。`,
      okText: '开始执行',
      okType: 'primary',
      cancelText: '取消',
      onOk: () => {
        startSchedule(schedule.id, currentUser.name)
        message.success('排程已开始执行，设备已同步占用')
      },
    })
  }

  const handleCompleteSchedule = (schedule: Schedule) => {
    Modal.confirm({
      title: '完成排程',
      content: `确定批次 ${schedule.batchNo} 排程已完成吗？完成后发酵罐将进入清洗状态，蒸馏设备将恢复空闲。`,
      okText: '确认完成',
      okType: 'primary',
      cancelText: '取消',
      onOk: () => {
        completeSchedule(schedule.id, currentUser.name)
        message.success('排程已完成，设备已释放')
      },
    })
  }

  const handleOpenCancel = (schedule: Schedule) => {
    setCurrentSchedule(schedule)
    setCancelReason('')
    setIsCancelVisible(true)
  }

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      message.warning('请填写取消原因')
      return
    }
    if (currentSchedule) {
      cancelSchedule(currentSchedule.id, currentUser.name, cancelReason)
      message.success('排程已取消，设备已释放')
    }
    setIsCancelVisible(false)
    setCancelReason('')
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
      const startTime = values.timeRange[0].format('YYYY-MM-DD HH:mm')
      const endTime = values.timeRange[1].format('YYYY-MM-DD HH:mm')
      const excludeScheduleId = modalType === 'adjust' && currentSchedule ? currentSchedule.id : undefined

      const { hasConflict, conflicts } = checkScheduleConflict({
        fermenterId: values.fermenterId,
        distillerId: values.distillerId,
        startTime,
        endTime,
        excludeScheduleId,
      })

      if (hasConflict) {
        Modal.error({
          title: '设备时间冲突',
          width: 520,
          content: (
            <div>
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message="检测到以下设备占用冲突，请调整后再提交："
                style={{ marginBottom: 12 }}
              />
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {conflicts.map((c, idx) => (
                  <li key={idx} style={{ marginBottom: 4, color: '#cf1322' }}>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ),
        })
        return
      }

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
          startTime,
          endTime,
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
          startTime,
          endTime,
          shift: values.shift,
          date: values.timeRange[0].format('YYYY-MM-DD'),
          originalSchedule: {
            date: currentSchedule.date,
            shift: currentSchedule.shift,
            recipeId: currentSchedule.recipeId,
            recipeName: currentSchedule.recipeName,
            fermenterId: currentSchedule.fermenterId,
            fermenterName: currentSchedule.fermenterName,
            distillerId: currentSchedule.distillerId,
            distillerName: currentSchedule.distillerName,
            startTime: currentSchedule.startTime,
            endTime: currentSchedule.endTime,
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
      const availableFermenter = fermenters.find(
        (f) => !schedules.some((s) => s.fermenterId === f.id && s.status !== 'completed' && s.status !== 'rejected'),
      )
      const availableRecipe = recipes[0]

      if (availableFermenter && availableRecipe) {
        const newSchedule: Schedule = {
          id: `S${Date.now()}`,
          date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
          shift: 'morning',
          batchNo: `B${dayjs().add(1, 'day').format('YYYYMMDD')}01`,
          recipeId: availableRecipe.id,
          recipeName: availableRecipe.name,
          fermenterId: availableFermenter.id,
          fermenterName: availableFermenter.name,
          startTime: dayjs().add(1, 'day').hour(8).minute(0).format('YYYY-MM-DD HH:mm'),
          endTime: dayjs()
            .add(1, 'day')
            .add(availableRecipe.fermentationDays, 'day')
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
      render: (text: string, record: Schedule) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => handleViewDetail(record)}>
          {text}
        </Button>
      ),
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
      width: 360,
      fixed: 'right' as const,
      render: (_: any, record: Schedule) => (
        <Space size="small" wrap>
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
          {record.status === 'approved' && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStartSchedule(record)}>
              开始执行
            </Button>
          )}
          {(record.status === 'approved' || record.status === 'executing') && (
            <>
              <Button type="link" size="small" icon={<StopOutlined />} onClick={() => handleCompleteSchedule(record)}>
                完成
              </Button>
              <Button type="link" size="small" danger icon={<ExclamationCircleOutlined />} onClick={() => handleOpenCancel(record)}>
                取消
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const pendingCount = schedules.filter((s) => s.status === 'pending').length
  const approvedCount = schedules.filter((s) => s.status === 'approved').length
  const adjustingCount = schedules.filter((s) => s.status === 'adjusting').length
  const todayCount = schedules.filter((s) => s.date === dayjs().format('YYYY-MM-DD')).length

  const weekDays = Array.from({ length: 7 }, (_, i) => calendarDate.startOf('week').add(i, 'day'))
  const shifts: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night']

  const getScheduleForSlot = (date: dayjs.Dayjs, shift: string) => {
    const dateStr = date.format('YYYY-MM-DD')
    return schedules.filter(
      (s) =>
        s.date === dateStr &&
        s.shift === shift &&
        s.status !== 'completed' &&
        s.status !== 'rejected' &&
        s.status !== 'cancelled',
    )
  }

  const renderExecutionBoard = () => {
    const statusGroups: Array<{
      key: Schedule['status'] | string; title: string; color: string }> = [
      { key: 'approved', title: '已批准（待开始）', color: '#52c41a' },
      { key: 'executing', title: '执行中', color: '#1677ff' },
      { key: 'completed', title: '已完成', color: '#8c8c8c' },
      { key: 'cancelled', title: '已取消', color: '#bfbfbf' },
    ]

    const renderCard = (s: Schedule) => (
      <Card
        key={s.id}
        size="small"
        style={{
          marginBottom: 8,
          cursor: 'pointer',
          borderLeft: `3px solid ${getStatusColor(s.status) === 'default' ? '#d9d9d9' : getStatusColor(s.status)}`,
        }}
        onClick={() => handleViewDetail(s)}
      >
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.batchNo}</div>
        <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
          {s.recipeName}
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
          {s.fermenterName}{s.distillerName ? ' · ' + s.distillerName : ''}
        </div>
        <div style={{ fontSize: 11, color: '#8c8c8c' }}>
          {s.startTime.slice(5)} ~ {s.endTime.slice(5)} · {getShiftShort(s.shift)}班
        </div>
        <div style={{ marginTop: 6 }}>
          <Tag color={getStatusColor(s.status)} style={{ margin: 0 }}>
            {getStatusText(s.status)}
          </Tag>
        </div>
        <div style={{ marginTop: 8 }}>
          {s.status === 'approved' && (
            <Space size="small">
              <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleStartSchedule(s) }}>
                开始执行
              </Button>
              <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenCancel(s) }}>
                取消
              </Button>
            </Space>
          )}
          {s.status === 'executing' && (
            <Space size="small">
              <Button type="primary" size="small" icon={<StopOutlined />} onClick={(e) => { e.stopPropagation(); handleCompleteSchedule(s) }}>
                完成
              </Button>
              <Button size="small" danger icon={<ExclamationCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleOpenCancel(s) }}>
                取消
              </Button>
            </Space>
          )}
        </div>
      </Card>
    )

    return (
      <div>
      <Row gutter={[16, 16]}>
        {statusGroups.map((group) => {
          const list = schedules.filter((s) => s.status === group.key)
          return (
            <Col span={6} key={group.key}>
              <Card
                title={<span style={{ color: group.color, fontWeight: 500 }}>{group.title} ({list.length})</span>}
                size="small"
                style={{ height: '100%' }}
                bodyStyle={{ padding: 12, maxHeight: 520, overflowY: 'auto' }}
              >
                {list.length === 0 ? (
                  <Empty description="暂无" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  list.map(renderCard)
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
      </div>
    )
  }

  const renderCalendarView = () => (
    <div>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Button.Group>
            <Button icon={<CalendarOutlined />} onClick={() => setCalendarDate(calendarDate.subtract(1, 'week'))}>
              上一周
            </Button>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => setCalendarDate(dayjs())}
              type={calendarDate.isSame(dayjs(), 'week') ? 'primary' : 'default'}
            >
              本周
            </Button>
            <Button icon={<CalendarOutlined />} onClick={() => setCalendarDate(calendarDate.add(1, 'week'))}>
              下一周
            </Button>
          </Button.Group>
        </Col>
        <Col>
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            {calendarDate.startOf('week').format('YYYY年MM月DD日')} - {calendarDate.endOf('week').format('MM月DD日')}
          </span>
        </Col>
      </Row>
      <div style={{ overflowX: 'auto' }}>
        <table className="calendar-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #f0f0f0', padding: 8, width: 80, background: '#fafafa' }}>班次</th>
              {weekDays.map((d) => (
                <th
                  key={d.format('YYYY-MM-DD')}
                  style={{
                    border: '1px solid #f0f0f0',
                    padding: 8,
                    background: d.isSame(dayjs(), 'day') ? '#e6f4ff' : '#fafafa',
                    fontWeight: 500,
                  }}
                >
                  {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.day()]} {d.format('MM/DD')}
                  {d.isSame(dayjs(), 'day') && <Tag color="blue" style={{ marginLeft: 4 }}>今天</Tag>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift}>
                <td style={{ border: '1px solid #f0f0f0', padding: 8, background: '#fafafa', fontWeight: 500 }}>
                  <div>{getShiftShort(shift)}班</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 'normal' }}>
                    {shift === 'morning'
                      ? '08-16'
                      : shift === 'afternoon'
                      ? '16-24'
                      : '00-08'}
                  </div>
                </td>
                {weekDays.map((d) => {
                  const daySchedules = getScheduleForSlot(d, shift)
                  return (
                    <td
                      key={d.format('YYYY-MM-DD') + shift}
                      style={{
                        border: '1px solid #f0f0f0',
                        padding: 4,
                        verticalAlign: 'top',
                        minHeight: 90,
                        height: 90,
                        background: d.isSame(dayjs(), 'day') ? '#fafcff' : '#ffffff',
                      }}
                    >
                      {daySchedules.length === 0 ? (
                        <div style={{ fontSize: 11, color: '#bfbfbf', textAlign: 'center', paddingTop: 20 }}>空闲</div>
                      ) : (
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          {daySchedules.slice(0, 3).map((s) => (
                            <Tooltip
                              key={s.id}
                              title={`${s.batchNo} · ${s.recipeName} · ${s.fermenterName}${
                                s.distillerName ? ' / ' + s.distillerName : ''
                              }\n状态: ${getStatusText(s.status)}\n${s.startTime} ~ ${s.endTime}`}
                            >
                              <div
                                onClick={() => handleViewDetail(s)}
                                style={{
                                  padding: '4px 6px',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  lineHeight: 1.4,
                                  background:
                                    s.status === 'approved' || s.status === 'executing'
                                      ? '#f6ffed'
                                      : s.status === 'adjusting'
                                      ? '#fff7e6'
                                      : s.status === 'rejected'
                                      ? '#fff1f0'
                                      : '#e6f4ff',
                                  borderLeft: `3px solid ${
                                    s.status === 'approved' || s.status === 'executing'
                                      ? '#52c41a'
                                      : s.status === 'adjusting'
                                      ? '#fa8c16'
                                      : s.status === 'rejected'
                                      ? '#f5222d'
                                      : '#1677ff'
                                  }`,
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>{s.batchNo}</div>
                                <div style={{ fontSize: 10, color: '#8c8c8c' }}>
                                  {s.recipeName.slice(0, 8)}
                                </div>
                                <Tag
                                  style={{ margin: 0, marginTop: 2 }}
                                  color={getStatusColor(s.status)}
                                >
                                  {getStatusText(s.status)}
                                </Tag>
                              </div>
                            </Tooltip>
                          ))}
                          {daySchedules.length > 3 && (
                            <div style={{ fontSize: 11, color: '#8c8c8c', textAlign: 'center' }}>
                              共 {daySchedules.length} 条
                            </div>
                          )}
                        </Space>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="发酵罐占用" size="small" className="card-shadow">
            <List
              size="small"
              dataSource={fermenters}
              renderItem={(f) => {
                const busy = schedules.find(
                  (s) =>
                    s.fermenterId === f.id &&
                    s.status !== 'completed' &&
                    s.status !== 'rejected',
                )
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={f.name}
                      description={
                        busy ? (
                          <span>
                            占用: <Tag color="orange">{busy.batchNo}</Tag> {busy.startTime.slice(5)}
                          </span>
                        ) : (
                          <Tag color="green">空闲</Tag>
                        )
                      }
                    />
                    <Badge status={busy ? 'processing' : 'default'} />
                  </List.Item>
                )
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="蒸馏设备占用" size="small" className="card-shadow">
            <List
              size="small"
              dataSource={distillers}
              renderItem={(d) => {
                const busy = schedules.find(
                  (s) =>
                    s.distillerId === d.id &&
                    s.status !== 'completed' &&
                    s.status !== 'rejected',
                )
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={d.name}
                      description={
                        busy ? (
                          <span>
                            占用: <Tag color="orange">{busy.batchNo}</Tag>
                          </span>
                        ) : (
                          <Tag color="green">空闲</Tag>
                        )
                      }
                    />
                    <Badge status={busy ? 'processing' : 'default'} />
                  </List.Item>
                )
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )

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
        tabList={[
          {
            key: 'list',
            tab: (
              <span>
                <UnorderedListOutlined /> 列表视图
              </span>
            ),
          },
          {
            key: 'calendar',
            tab: (
              <span>
                <CalendarOutlined /> 日历视图
              </span>
            ),
          },
          {
            key: 'execution',
            tab: (
              <span>
                <DashboardOutlined /> 执行看板
              </span>
            ),
          },
        ]}
        activeTabKey={viewMode}
        onTabChange={(k) => setViewMode(k as ViewMode)}
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
        {viewMode === 'list' ? (
          <Table columns={columns} dataSource={schedules} rowKey="id" pagination={{ pageSize: 8 }} scroll={{ x: 1200 }} />
        ) : viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          renderExecutionBoard()
        )}
      </Card>

      <Modal
        title={modalType === 'create' ? '创建排程' : '申请调整排程'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={600}
        okText="提交"
        cancelText="取消"
        confirmLoading={false}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="recipeId" label="酒品配方" rules={[{ required: true, message: '请选择酒品配方' }]}>
                <Select placeholder="请选择配方">
                  {recipes.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.name} (发酵{r.fermentationDays}天)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shift" label="班次" rules={[{ required: true, message: '请选择班次' }]}>
                <Select placeholder="请选择班次">
                  <Option value="morning">早班 (08:00-16:00)</Option>
                  <Option value="afternoon">中班 (16:00-00:00)</Option>
                  <Option value="night">夜班 (00:00-08:00)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fermenterId" label="发酵罐" rules={[{ required: true, message: '请选择发酵罐' }]}>
                <Select placeholder="请选择发酵罐">
                  {fermenters.map((f) => (
                    <Option key={f.id} value={f.id}>
                      {f.name} ({f.capacity.toLocaleString()}L)
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="distillerId" label="蒸馏设备（可选）">
                <Select placeholder="请选择蒸馏设备" allowClear>
                  {distillers.map((d) => (
                    <Option key={d.id} value={d.id}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="timeRange"
            label="生产时间范围"
            rules={[{ required: true, message: '请选择生产时间范围' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>
          {modalType === 'adjust' && (
            <Form.Item name="reason" label="调整原因" rules={[{ required: true, message: '请输入调整原因' }]}>
              <TextArea rows={3} placeholder="请说明调整原因..." />
            </Form.Item>
          )}
          <Alert
            type="info"
            showIcon
            message="提交前会自动检查发酵罐和蒸馏设备的时间冲突"
            style={{ fontSize: 12 }}
          />
        </Form>
      </Modal>

      <Modal
        title="排程详情"
        open={isDetailVisible}
        onCancel={() => setIsDetailVisible(false)}
        footer={null}
        width={720}
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
                      <p>
                        <strong>状态：</strong>
                        <Tag color={getStatusColor(latestSchedule.status)}>{getStatusText(latestSchedule.status)}</Tag>
                      </p>
                      <p><strong>申请人：</strong>{latestSchedule.operator || '-'}</p>
                      <p><strong>审批人：</strong>{latestSchedule.approver || '-'}</p>
                      {latestSchedule.approveTime && <p><strong>审批时间：</strong>{latestSchedule.approveTime}</p>}
                      {latestSchedule.executeTime && <p><strong>开始执行：</strong>{latestSchedule.executeTime}</p>}
                      {latestSchedule.completeTime && <p><strong>完成时间：</strong>{latestSchedule.completeTime}</p>}
                      {latestSchedule.cancelTime && <p><strong>取消时间：</strong>{latestSchedule.cancelTime}</p>}
                      {latestSchedule.cancelReason && (
                        <p>
                          <strong>取消原因：</strong>
                          <Tag color="red">{latestSchedule.cancelReason}</Tag>
                        </p>
                      )}
                    </Col>
                  </Row>
                  {latestSchedule.originalSchedule && (
                    <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
                      <strong>原排程信息（调整中）：</strong>
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        <p>配方：{latestSchedule.originalSchedule.recipeName}</p>
                        <p>发酵罐：{latestSchedule.originalSchedule.fermenterName}</p>
                        <p>蒸馏设备：{latestSchedule.originalSchedule.distillerName || '-'}</p>
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
                  {latestSchedule.adjustRejectRemark && (
                    <div style={{ marginTop: 16, padding: 12, background: '#fff1f0', borderRadius: 4 }}>
                      <strong>审批备注：</strong>{latestSchedule.adjustRejectRemark}
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
                                color: latestSchedule.status === 'rejected' || latestSchedule.adjustRejected
                                  ? 'red'
                                  : latestSchedule.status === 'adjusting'
                                  ? 'orange'
                                  : 'blue',
                                children: (
                                  <div>
                                    <p>
                                      {latestSchedule.status === 'rejected'
                                        ? '排程已拒绝'
                                        : latestSchedule.status === 'adjusting'
                                        ? '调整申请待审批'
                                        : latestSchedule.adjustRejected
                                        ? '调整申请已拒绝，恢复原排程'
                                        : '排程已批准'}
                                    </p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      {latestSchedule.approver} · {latestSchedule.approveTime}
                                    </p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        ...(latestSchedule.status === 'approved' || latestSchedule.status === 'executing'
                          ? [
                              {
                                color: latestSchedule.status === 'executing' ? '#1677ff' : '#52c41a',
                                children: (
                                  <div>
                                    <p>排程已批准{latestSchedule.executeTime ? '（已开始执行）' : '（待开始执行）'}</p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      {latestSchedule.approver} · {latestSchedule.approveTime}
                                    </p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        ...(latestSchedule.status === 'executing'
                          ? [
                              {
                                color: 'blue',
                                children: (
                                  <div>
                                    <p>执行中</p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      开始时间: {latestSchedule.executeTime} · 发酵罐/蒸馏设备运行中
                                    </p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        ...(latestSchedule.status === 'completed'
                          ? [
                              {
                                color: 'green',
                                children: (
                                  <div>
                                    <p>排程已完成</p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      完成时间: {latestSchedule.completeTime} · 发酵罐已进入清洗
                                    </p>
                                  </div>
                                ),
                              },
                            ]
                          : []),
                        ...(latestSchedule.status === 'cancelled'
                          ? [
                              {
                                color: 'red',
                                children: (
                                  <div>
                                    <p>排程已取消</p>
                                    <p style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      取消时间: {latestSchedule.cancelTime} · 原因: {latestSchedule.cancelReason}
                                    </p>
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

      <Modal
        title="取消排程"
        open={isCancelVisible}
        onOk={handleConfirmCancel}
        onCancel={() => setIsCancelVisible(false)}
        okText="确认取消排程"
        okType="danger"
        cancelText="返回"
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            type="warning"
            showIcon
            message="排程取消后相关设备将恢复为空闲状态，请谨慎操作"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <strong>待取消排程：</strong>{currentSchedule?.batchNo} - {currentSchedule?.recipeName}
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>
            取消原因 <span style={{ color: 'red' }}>*</span>
          </label>
          <TextArea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="请填写取消原因，例如：原料不足、设备故障等"
          />
        </div>
      </Modal>
    </div>
  )
}

export default Scheduling
