import { create } from 'zustand'
import {
  Fermenter,
  Distiller,
  RawMaterial,
  AgingWarehouse,
  Recipe,
  Schedule,
  AlarmRecord,
  QualityTest,
  MaintenanceOrder,
  SparePart,
  ProductionStat,
  BatchRecord,
  User,
  StockRecord,
} from '../types'
import {
  mockFermenters,
  mockDistillers,
  mockRawMaterials,
  mockAgingWarehouses,
  mockRecipes,
  mockSchedules,
  mockAlarms,
  mockQualityTests,
  mockMaintenanceOrders,
  mockSpareParts,
  mockProductionStats,
  mockBatchRecords,
  mockUsers,
  currentUser as mockCurrentUser,
} from '../data/mockData'
import dayjs from 'dayjs'

interface UsedPart {
  partId: string
  partName: string
  quantity: number
}

interface AppState {
  fermenters: Fermenter[]
  distillers: Distiller[]
  rawMaterials: RawMaterial[]
  agingWarehouses: AgingWarehouse[]
  recipes: Recipe[]
  schedules: Schedule[]
  alarms: AlarmRecord[]
  qualityTests: QualityTest[]
  maintenanceOrders: MaintenanceOrder[]
  spareParts: SparePart[]
  productionStats: ProductionStat[]
  batchRecords: BatchRecord[]
  users: User[]
  currentUser: User
  stockRecords: StockRecord[]
  addStockRecord: (record: StockRecord) => void
  updateFermenter: (id: string, data: Partial<Fermenter>) => void
  addSchedule: (schedule: Schedule) => void
  updateSchedule: (id: string, data: Partial<Schedule>) => void
  confirmAlarm: (id: string, handler: string, remark: string) => void
  resolveAlarm: (id: string, handler: string, remark: string) => void
  addQualityTest: (test: QualityTest) => void
  updateQualityTest: (id: string, data: Partial<QualityTest>) => void
  addMaintenanceOrder: (order: MaintenanceOrder) => void
  updateMaintenanceOrder: (id: string, data: Partial<MaintenanceOrder>) => void
  completeMaintenanceOrder: (id: string, partsUsed: UsedPart[], remark: string, handler: string) => void
  addAlarm: (alarm: AlarmRecord) => void
  refreshData: () => void
  stockIn: (type: 'raw' | 'spare' | 'aging', id: string, quantity: number, batchNo?: string) => boolean
  stockOut: (type: 'raw' | 'spare' | 'aging', id: string, quantity: number, batchNo?: string) => boolean
  adjustCoolingSystem: (fermenterId: string, action: 'cooling' | 'heating' | 'humidifying' | 'dehumidifying') => void
  getRawMaterial: (id: string) => RawMaterial | undefined
  getSparePart: (id: string) => SparePart | undefined
  getAgingWarehouse: (id: string) => AgingWarehouse | undefined
  approveScheduleAdjust: (id: string, approver: string) => void
  rejectScheduleAdjust: (id: string, approver: string) => void
  checkScheduleConflict: (params: {
    fermenterId: string
    distillerId?: string
    startTime: string
    endTime: string
    excludeScheduleId?: string
  }) => { hasConflict: boolean; conflicts: string[] }
  syncScheduleToDevice: (scheduleId: string) => void
  releaseDeviceFromSchedule: (scheduleId: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  fermenters: mockFermenters,
  distillers: mockDistillers,
  rawMaterials: mockRawMaterials,
  agingWarehouses: mockAgingWarehouses,
  recipes: mockRecipes,
  schedules: mockSchedules,
  alarms: mockAlarms,
  qualityTests: mockQualityTests,
  maintenanceOrders: mockMaintenanceOrders,
  spareParts: mockSpareParts,
  productionStats: mockProductionStats,
  batchRecords: mockBatchRecords,
  users: mockUsers,
  currentUser: mockCurrentUser,
  stockRecords: [],

  getRawMaterial: (id) => get().rawMaterials.find((m) => m.id === id),
  getSparePart: (id) => get().spareParts.find((p) => p.id === id),
  getAgingWarehouse: (id) => get().agingWarehouses.find((w) => w.id === id),

  addStockRecord: (record) =>
    set((state) => ({
      stockRecords: [record, ...state.stockRecords],
    })),

  updateFermenter: (id, data) =>
    set((state) => ({
      fermenters: state.fermenters.map((f) => (f.id === id ? { ...f, ...data } : f)),
    })),

  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [...state.schedules, schedule],
    })),

  updateSchedule: (id, data) =>
    set((state) => ({
      schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  approveScheduleAdjust: (id, approver) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id
          ? {
              ...s,
              status: 'approved',
              approver,
              approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
            }
          : s,
      ),
    })),

  rejectScheduleAdjust: (id, approver) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id && s.originalSchedule
          ? {
              id: s.id,
              batchNo: s.batchNo,
              date: s.originalSchedule.date,
              shift: s.originalSchedule.shift,
              recipeId: s.originalSchedule.recipeId,
              recipeName: s.originalSchedule.recipeName,
              fermenterId: s.originalSchedule.fermenterId,
              fermenterName: s.originalSchedule.fermenterName,
              distillerId: s.originalSchedule.distillerId,
              distillerName: s.originalSchedule.distillerName,
              startTime: s.originalSchedule.startTime,
              endTime: s.originalSchedule.endTime,
              status: s.originalSchedule.status,
              operator: s.operator,
              applyTime: s.applyTime,
              approver,
              approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
              originalSchedule: undefined,
              adjustReason: undefined,
              adjustRejected: true,
              adjustRejectRemark: '调整申请已拒绝，已恢复原排程',
            } as Schedule
          : s,
      ),
    })),

  syncScheduleToDevice: (scheduleId) =>
    set((state) => {
      const schedule = state.schedules.find((s) => s.id === scheduleId)
      if (!schedule || (schedule.status !== 'approved' && schedule.status !== 'executing')) return state

      const updatedFermenters = state.fermenters.map((f) =>
        f.id === schedule.fermenterId
          ? {
              ...f,
              batchNo: schedule.batchNo,
              recipe: schedule.recipeName,
              expectedEndTime: schedule.endTime,
              startTime: schedule.startTime,
              status: f.status === 'idle' || f.status === 'cleaning' ? ('running' as const) : f.status,
            }
          : f,
      )

      const updatedDistillers = schedule.distillerId
        ? state.distillers.map((d) =>
            d.id === schedule.distillerId
              ? {
                  ...d,
                  batchNo: schedule.batchNo,
                  status: d.status === 'idle' || d.status === 'cleaning' ? ('running' as const) : d.status,
                }
              : d,
          )
        : state.distillers

      return {
        ...state,
        fermenters: updatedFermenters,
        distillers: updatedDistillers,
      }
    }),

  releaseDeviceFromSchedule: (scheduleId) =>
    set((state) => {
      const schedule = state.schedules.find((s) => s.id === scheduleId)
      if (!schedule) return state

      const updatedFermenters = state.fermenters.map((f) =>
        f.id === schedule.fermenterId
          ? {
              ...f,
              batchNo: undefined,
              recipe: undefined,
              expectedEndTime: undefined,
              startTime: undefined,
              status: 'cleaning' as const,
            }
          : f,
      )

      const updatedDistillers = schedule.distillerId
        ? state.distillers.map((d) =>
            d.id === schedule.distillerId
              ? {
                  ...d,
                  batchNo: undefined,
                  status: 'idle' as const,
                }
              : d,
          )
        : state.distillers

      return {
        ...state,
        fermenters: updatedFermenters,
        distillers: updatedDistillers,
      }
    }),

  checkScheduleConflict: ({ fermenterId, distillerId, startTime, endTime, excludeScheduleId }) => {
    const schedules = get().schedules
    const conflicts: string[] = []
    const start = dayjs(startTime)
    const end = dayjs(endTime)

    schedules.forEach((s) => {
      if (excludeScheduleId && s.id === excludeScheduleId) return
      if (s.status === 'completed' || s.status === 'rejected') return

      const sStart = dayjs(s.startTime)
      const sEnd = dayjs(s.endTime)

      const hasOverlap = !(end.isBefore(sStart) || start.isAfter(sEnd))

      if (hasOverlap && s.fermenterId === fermenterId) {
        conflicts.push(`发酵罐 ${s.fermenterName} 在 ${s.startTime} ~ ${s.endTime} 已被批次 ${s.batchNo} 占用`)
      }
      if (hasOverlap && distillerId && s.distillerId === distillerId) {
        conflicts.push(`蒸馏设备 ${s.distillerName} 在 ${s.startTime} ~ ${s.endTime} 已被批次 ${s.batchNo} 占用`)
      }
    })

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    }
  },

  confirmAlarm: (id, handler, remark) =>
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'confirmed',
              handler,
              handleTime: dayjs().format('YYYY-MM-DD HH:mm'),
              handleRemark: remark,
            }
          : a,
      ),
    })),

  resolveAlarm: (id, handler, remark) =>
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'resolved',
              handler,
              handleTime: dayjs().format('YYYY-MM-DD HH:mm'),
              handleRemark: remark,
            }
          : a,
      ),
    })),

  addQualityTest: (test) =>
    set((state) => ({
      qualityTests: [test, ...state.qualityTests],
    })),

  updateQualityTest: (id, data) =>
    set((state) => ({
      qualityTests: state.qualityTests.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),

  addMaintenanceOrder: (order) =>
    set((state) => ({
      maintenanceOrders: [...state.maintenanceOrders, order],
    })),

  updateMaintenanceOrder: (id, data) =>
    set((state) => ({
      maintenanceOrders: state.maintenanceOrders.map((o) => (o.id === id ? { ...o, ...data } : o)),
    })),

  completeMaintenanceOrder: (id, partsUsed, remark, handler) => {
    set((state) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm')
      const updatedParts = [...state.spareParts]
      const newRecords: StockRecord[] = partsUsed.map((used, idx) => {
        const partIndex = updatedParts.findIndex((p) => p.id === used.partId)
        let unit = '个'
        if (partIndex !== -1) {
          unit = updatedParts[partIndex].unit || '个'
          updatedParts[partIndex] = {
            ...updatedParts[partIndex],
            quantity: updatedParts[partIndex].quantity - used.quantity,
            lastUpdate: now,
          }
        }
        return {
          id: `SR${Date.now()}${idx}${Math.floor(Math.random() * 100)}`,
          type: 'maintenance' as const,
          materialType: 'spare' as const,
          materialId: used.partId,
          materialName: used.partName,
          unit,
          quantity: used.quantity,
          relatedOrderId: id,
          operator: handler,
          time: now,
          remark: `维保工单领用 ${remark || ''}`,
        }
      })

      const updatedOrders = state.maintenanceOrders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: 'completed' as const,
              completeTime: now,
              partsUsed,
              remark,
            }
          : o,
      )

      return {
        spareParts: updatedParts,
        maintenanceOrders: updatedOrders,
        stockRecords: [...newRecords, ...state.stockRecords],
      }
    })
  },

  addAlarm: (alarm) =>
    set((state) => {
      const exists = state.alarms.some(
        (a) => a.deviceId === alarm.deviceId && a.type === alarm.type && a.status === 'active',
      )
      if (exists) return state
      return { alarms: [alarm, ...state.alarms] }
    }),

  stockIn: (type, id, quantity, batchNo) => {
    set((state) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm')
      let materialName = ''
      let unit = ''
      if (type === 'raw') {
        const m = state.rawMaterials.find((x) => x.id === id)
        materialName = m?.name || ''
        unit = m?.unit || 'kg'
        return {
          rawMaterials: state.rawMaterials.map((m) =>
            m.id === id ? { ...m, quantity: m.quantity + quantity, lastUpdate: now } : m,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'in',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '入库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      } else if (type === 'spare') {
        const p = state.spareParts.find((x) => x.id === id)
        materialName = p?.name || ''
        unit = p?.unit || '个'
        return {
          spareParts: state.spareParts.map((p) =>
            p.id === id ? { ...p, quantity: p.quantity + quantity, lastUpdate: now } : p,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'in',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '入库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      } else if (type === 'aging') {
        const w = state.agingWarehouses.find((x) => x.id === id)
        materialName = w?.name || ''
        unit = 'L'
        return {
          agingWarehouses: state.agingWarehouses.map((w) =>
            w.id === id ? { ...w, usedCapacity: Math.min(w.usedCapacity + quantity, w.totalCapacity) } : w,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'in',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '入库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      }
      return state
    })
    return true
  },

  stockOut: (type, id, quantity, batchNo) => {
    const state = get()
    if (type === 'raw') {
      const material = state.rawMaterials.find((m) => m.id === id)
      if (!material || material.quantity < quantity) {
        return false
      }
    } else if (type === 'spare') {
      const part = state.spareParts.find((p) => p.id === id)
      if (!part || part.quantity < quantity) {
        return false
      }
    } else if (type === 'aging') {
      const warehouse = state.agingWarehouses.find((w) => w.id === id)
      if (!warehouse || warehouse.usedCapacity < quantity) {
        return false
      }
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm')
    set((state) => {
      let materialName = ''
      let unit = ''
      if (type === 'raw') {
        const m = state.rawMaterials.find((x) => x.id === id)
        materialName = m?.name || ''
        unit = m?.unit || 'kg'
        return {
          rawMaterials: state.rawMaterials.map((m) =>
            m.id === id ? { ...m, quantity: m.quantity - quantity, lastUpdate: now } : m,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'out',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '出库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      } else if (type === 'spare') {
        const p = state.spareParts.find((x) => x.id === id)
        materialName = p?.name || ''
        unit = p?.unit || '个'
        return {
          spareParts: state.spareParts.map((p) =>
            p.id === id ? { ...p, quantity: p.quantity - quantity, lastUpdate: now } : p,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'out',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '出库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      } else if (type === 'aging') {
        const w = state.agingWarehouses.find((x) => x.id === id)
        materialName = w?.name || ''
        unit = 'L'
        return {
          agingWarehouses: state.agingWarehouses.map((w) =>
            w.id === id ? { ...w, usedCapacity: w.usedCapacity - quantity } : w,
          ),
          stockRecords: [
            {
              id: `SR${Date.now()}${Math.floor(Math.random() * 100)}`,
              type: 'out',
              materialType: type,
              materialId: id,
              materialName,
              unit,
              quantity,
              batchNo,
              operator: state.currentUser.name,
              time: now,
              remark: '出库',
            } as StockRecord,
            ...state.stockRecords,
          ],
        }
      }
      return state
    })
    return true
  },

  adjustCoolingSystem: (fermenterId, action) =>
    set((state) => ({
      fermenters: state.fermenters.map((f) =>
        f.id === fermenterId
          ? {
              ...f,
              coolingAction: action,
              coolingActionTime: dayjs().format('YYYY-MM-DD HH:mm'),
            }
          : f,
      ),
    })),

  refreshData: () => {
    set((state) => {
      const newAlarms: AlarmRecord[] = []

      const TEMP_MAX = 35
      const TEMP_MIN = 28
      const HUMIDITY_MAX = 80
      const HUMIDITY_MIN = 60
      const ALCOHOL_MAX = 15

      const updatedFermenters = state.fermenters.map((f) => {
        if (f.status === 'running' || f.status === 'warning') {
          const tempChange = (Math.random() - 0.5) * 1.5
          let newTemp = Number((f.temperature + tempChange).toFixed(1))
          const alcoholChange = Math.random() * 0.15
          let newAlcohol = Number((f.alcoholContent + alcoholChange).toFixed(2))
          let newHumidity = Number((f.humidity + (Math.random() - 0.5) * 2).toFixed(1))
          let newStatus = f.status

          let coolingAction = f.coolingAction

          if (newTemp > TEMP_MAX) {
            newStatus = 'warning'
            coolingAction = 'cooling'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'temperature' && a.status === 'active',
            )
            if (!existing) {
              const isCritical = newTemp > TEMP_MAX + 2
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-t`,
                type: 'temperature',
                level: isCritical ? 'critical' : 'high',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newTemp,
                threshold: TEMP_MAX,
                message: `温度${newTemp}°C超过上限${TEMP_MAX}°C，${isCritical ? '严重' : ''}超限，已自动开启冷却系统`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (newTemp < TEMP_MIN) {
            newStatus = 'warning'
            coolingAction = 'heating'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'temperature' && a.status === 'active',
            )
            if (!existing) {
              const isCritical = newTemp < TEMP_MIN - 3
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-t`,
                type: 'temperature',
                level: isCritical ? 'critical' : 'medium',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newTemp,
                threshold: TEMP_MIN,
                message: `温度${newTemp}°C低于下限${TEMP_MIN}°C，${isCritical ? '严重' : ''}偏低，已自动开启加热系统`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (f.status === 'warning' && newTemp >= TEMP_MIN && newTemp <= TEMP_MAX) {
            newStatus = 'running'
          }

          if (newHumidity < HUMIDITY_MIN) {
            newStatus = 'warning'
            coolingAction = 'humidifying'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'humidity' && a.status === 'active',
            )
            if (!existing) {
              const isLow = newHumidity < HUMIDITY_MIN - 5
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-h`,
                type: 'humidity',
                level: isLow ? 'medium' : 'low',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newHumidity,
                threshold: HUMIDITY_MIN,
                message: `湿度${newHumidity}%低于下限${HUMIDITY_MIN}%，${isLow ? '严重' : ''}偏低，已自动开启加湿系统`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (newHumidity > HUMIDITY_MAX) {
            newStatus = 'warning'
            coolingAction = 'dehumidifying'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'humidity' && a.status === 'active',
            )
            if (!existing) {
              const isHigh = newHumidity > HUMIDITY_MAX + 5
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-h`,
                type: 'humidity',
                level: isHigh ? 'high' : 'low',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newHumidity,
                threshold: HUMIDITY_MAX,
                message: `湿度${newHumidity}%超过上限${HUMIDITY_MAX}%，${isHigh ? '严重' : ''}偏高，已自动开启除湿系统`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else {
            if (coolingAction === 'humidifying' || coolingAction === 'dehumidifying') {
              coolingAction = f.coolingAction && f.coolingAction !== 'humidifying' && f.coolingAction !== 'dehumidifying'
                ? f.coolingAction
                : undefined
            }
          }

          if (newAlcohol > ALCOHOL_MAX) {
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'alcohol' && a.status === 'active',
            )
            if (!existing) {
              const isHigh = newAlcohol > ALCOHOL_MAX + 1
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-a`,
                type: 'alcohol',
                level: isHigh ? 'high' : 'medium',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: Number(newAlcohol),
                threshold: ALCOHOL_MAX,
                message: `酒精度${newAlcohol}%vol超过阈值${ALCOHOL_MAX}%vol，${isHigh ? '严重' : ''}偏高，请关注发酵进度`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          }

          return {
            ...f,
            temperature: Number(newTemp),
            alcoholContent: Number(newAlcohol),
            humidity: Number(newHumidity),
            status: newStatus,
            coolingAction,
            coolingActionTime: coolingAction ? dayjs().format('YYYY-MM-DD HH:mm') : undefined,
          }
        }
        return f
      })

      return {
        fermenters: updatedFermenters,
        alarms: [...newAlarms, ...state.alarms],
      }
    })
  },
}))
