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

  getRawMaterial: (id) => get().rawMaterials.find((m) => m.id === id),
  getSparePart: (id) => get().spareParts.find((p) => p.id === id),
  getAgingWarehouse: (id) => get().agingWarehouses.find((w) => w.id === id),

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
              ...s.originalSchedule,
              id: s.id,
              batchNo: s.batchNo,
              recipeId: s.recipeId,
              recipeName: s.recipeName,
              operator: s.operator,
              applyTime: s.applyTime,
              date: s.date,
              status: s.originalSchedule.status,
              approver,
              approveTime: dayjs().format('YYYY-MM-DD HH:mm'),
              adjustRejected: true,
              adjustRejectRemark: '调整申请已拒绝，保留原排程',
            } as Schedule
          : s,
      ),
    })),

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
      const updatedParts = [...state.spareParts]
      partsUsed.forEach((used) => {
        const partIndex = updatedParts.findIndex((p) => p.id === used.partId)
        if (partIndex !== -1) {
          updatedParts[partIndex] = {
            ...updatedParts[partIndex],
            quantity: updatedParts[partIndex].quantity - used.quantity,
            lastUpdate: dayjs().format('YYYY-MM-DD HH:mm'),
          }
        }
      })

      const updatedOrders = state.maintenanceOrders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: 'completed' as const,
              completeTime: dayjs().format('YYYY-MM-DD HH:mm'),
              partsUsed,
              remark,
            }
          : o,
      )

      return {
        spareParts: updatedParts,
        maintenanceOrders: updatedOrders,
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

  stockIn: (type, id, quantity) => {
    set((state) => {
      const now = dayjs().format('YYYY-MM-DD HH:mm')
      if (type === 'raw') {
        return {
          rawMaterials: state.rawMaterials.map((m) =>
            m.id === id
              ? { ...m, quantity: m.quantity + quantity, lastUpdate: now }
              : m,
          ),
        }
      } else if (type === 'spare') {
        return {
          spareParts: state.spareParts.map((p) =>
            p.id === id
              ? { ...p, quantity: p.quantity + quantity, lastUpdate: now }
              : p,
          ),
        }
      } else if (type === 'aging') {
        return {
          agingWarehouses: state.agingWarehouses.map((w) =>
            w.id === id
              ? { ...w, usedCapacity: Math.min(w.usedCapacity + quantity, w.totalCapacity) }
              : w,
          ),
        }
      }
      return state
    })
    return true
  },

  stockOut: (type, id, quantity) => {
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
      if (type === 'raw') {
        return {
          rawMaterials: state.rawMaterials.map((m) =>
            m.id === id
              ? { ...m, quantity: m.quantity - quantity, lastUpdate: now }
              : m,
          ),
        }
      } else if (type === 'spare') {
        return {
          spareParts: state.spareParts.map((p) =>
            p.id === id
              ? { ...p, quantity: p.quantity - quantity, lastUpdate: now }
              : p,
          ),
        }
      } else if (type === 'aging') {
        return {
          agingWarehouses: state.agingWarehouses.map((w) =>
            w.id === id
              ? { ...w, usedCapacity: w.usedCapacity - quantity }
              : w,
          ),
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

      const updatedFermenters = state.fermenters.map((f) => {
        if (f.status === 'running' || f.status === 'warning') {
          const tempChange = (Math.random() - 0.5) * 1.5
          let newTemp = Number((f.temperature + tempChange).toFixed(1))
          const alcoholChange = Math.random() * 0.15
          let newAlcohol = Number((f.alcoholContent + alcoholChange).toFixed(2))
          let newHumidity = Number((f.humidity + (Math.random() - 0.5) * 2).toFixed(1))
          let newStatus = f.status

          let coolingAction = f.coolingAction

          if (newTemp > 35) {
            newStatus = 'warning'
            coolingAction = 'cooling'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'temperature' && a.status === 'active',
            )
            if (!existing) {
              newAlarms.push({
                id: `A${Date.now()}-${f.id}`,
                type: 'temperature',
                level: newTemp > 37 ? 'high' : 'medium',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newTemp,
                threshold: 35,
                message: `发酵罐温度${newTemp > 37 ? '严重' : ''}超过上限阈值，已自动开启冷却系统`,
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (newTemp < 26) {
            newStatus = 'warning'
            coolingAction = 'heating'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'temperature' && a.status === 'active',
            )
            if (!existing) {
              newAlarms.push({
                id: `A${Date.now()}-${f.id}`,
                type: 'temperature',
                level: 'medium',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newTemp,
                threshold: 28,
                message: '发酵罐温度低于下限阈值，已自动开启加热系统',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (f.status === 'warning' && newTemp >= 28 && newTemp <= 35) {
            newStatus = 'running'
          }

          if (newHumidity < 55) {
            coolingAction = 'humidifying'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'humidity' && a.status === 'active',
            )
            if (!existing) {
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-h`,
                type: 'humidity',
                level: 'low',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newHumidity,
                threshold: 60,
                message: '发酵罐湿度低于下限阈值，已自动开启加湿系统',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          } else if (newHumidity > 85) {
            coolingAction = 'dehumidifying'
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'humidity' && a.status === 'active',
            )
            if (!existing) {
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-h`,
                type: 'humidity',
                level: 'low',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: newHumidity,
                threshold: 80,
                message: '发酵罐湿度超过上限阈值，已自动开启除湿系统',
                time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: 'active',
              })
            }
          }

          if (newAlcohol > 15) {
            const existing = state.alarms.some(
              (a) => a.deviceId === f.id && a.type === 'alcohol' && a.status === 'active',
            )
            if (!existing) {
              newAlarms.push({
                id: `A${Date.now()}-${f.id}-a`,
                type: 'alcohol',
                level: 'medium',
                deviceId: f.id,
                deviceName: f.name,
                deviceType: 'fermenter',
                value: Number(newAlcohol),
                threshold: 15,
                message: '发酵罐酒精度偏高，请关注发酵进度',
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
