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
  addMaintenanceOrder: (order: MaintenanceOrder) => void
  updateMaintenanceOrder: (id: string, data: Partial<MaintenanceOrder>) => void
  addAlarm: (alarm: AlarmRecord) => void
  refreshData: () => void
}

export const useAppStore = create<AppState>((set) => ({
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

  confirmAlarm: (id, handler, remark) =>
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? { ...a, status: 'confirmed', handler, handleTime: new Date().toISOString(), handleRemark: remark }
          : a,
      ),
    })),

  resolveAlarm: (id, handler, remark) =>
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? { ...a, status: 'resolved', handler, handleTime: new Date().toISOString(), handleRemark: remark }
          : a,
      ),
    })),

  addQualityTest: (test) =>
    set((state) => ({
      qualityTests: [test, ...state.qualityTests],
    })),

  addMaintenanceOrder: (order) =>
    set((state) => ({
      maintenanceOrders: [...state.maintenanceOrders, order],
    })),

  updateMaintenanceOrder: (id, data) =>
    set((state) => ({
      maintenanceOrders: state.maintenanceOrders.map((o) => (o.id === id ? { ...o, ...data } : o)),
    })),

  addAlarm: (alarm) =>
    set((state) => ({
      alarms: [alarm, ...state.alarms],
    })),

  refreshData: () => {
    set((state) => ({
      fermenters: state.fermenters.map((f) => {
        if (f.status === 'running' || f.status === 'warning') {
          const tempChange = (Math.random() - 0.5) * 1
          const newTemp = Number((f.temperature + tempChange).toFixed(1))
          const alcoholChange = Math.random() * 0.1
          const newAlcohol = Number((f.alcoholContent + alcoholChange).toFixed(2))
          const newHumidity = Number((f.humidity + (Math.random() - 0.5) * 2).toFixed(1))
          let newStatus = f.status
          if (newTemp > 36) newStatus = 'warning'
          else if (f.status === 'warning' && newTemp <= 35) newStatus = 'running'
          return {
            ...f,
            temperature: newTemp,
            alcoholContent: newAlcohol,
            humidity: newHumidity,
            status: newStatus,
          }
        }
        return f
      }),
    }))
  },
}))
