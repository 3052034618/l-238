export interface Fermenter {
  id: string
  name: string
  capacity: number
  currentVolume: number
  status: 'running' | 'idle' | 'cleaning' | 'maintenance' | 'warning' | 'error'
  temperature: number
  humidity: number
  alcoholContent: number
  batchNo?: string
  recipe?: string
  startTime?: string
  expectedEndTime?: string
  position: { row: number; col: number }
  runHours: number
  coolingAction?: 'cooling' | 'heating' | 'humidifying' | 'dehumidifying'
  coolingActionTime?: string
}

export interface Distiller {
  id: string
  name: string
  capacity: number
  status: 'running' | 'idle' | 'maintenance' | 'error'
  currentBatch?: string
  temperature: number
  pressure: number
  runHours: number
  position: { row: number; col: number }
}

export interface RawMaterial {
  id: string
  name: string
  category: 'grain' | 'water' | 'yeast' | 'auxiliary'
  quantity: number
  unit: string
  safeStock: number
  warehouse: string
  lastUpdate: string
}

export interface AgingWarehouse {
  id: string
  name: string
  location: string
  totalCapacity: number
  usedCapacity: number
  temperature: number
  humidity: number
  barrels: number
}

export interface Recipe {
  id: string
  name: string
  type: string
  fermentationDays: number
  rawMaterials: { materialId: string; materialName: string; quantity: number; unit: string }[]
  temperatureRange: { min: number; max: number }
  humidityRange: { min: number; max: number }
  alcoholTarget: number
  description: string
}

export interface Schedule {
  id: string
  date: string
  shift: 'morning' | 'afternoon' | 'night'
  batchNo: string
  recipeId: string
  recipeName: string
  fermenterId: string
  fermenterName: string
  distillerId?: string
  distillerName?: string
  startTime: string
  endTime: string
  status: 'pending' | 'approved' | 'rejected' | 'adjusting' | 'executing' | 'completed'
  operator?: string
  approver?: string
  approveTime?: string
  applyTime?: string
  adjustReason?: string
  originalSchedule?: {
    date: string
    shift: 'morning' | 'afternoon' | 'night'
    recipeId: string
    recipeName: string
    fermenterId: string
    fermenterName: string
    distillerId?: string
    distillerName?: string
    startTime: string
    endTime: string
    status: 'pending' | 'approved' | 'rejected' | 'adjusting' | 'executing' | 'completed'
  }
  adjustRejected?: boolean
  adjustRejectRemark?: string
}

export interface AlarmRecord {
  id: string
  type: 'temperature' | 'humidity' | 'alcohol' | 'pressure' | 'equipment'
  level: 'low' | 'medium' | 'high' | 'critical'
  deviceId: string
  deviceName: string
  deviceType: 'fermenter' | 'distiller'
  value: number
  threshold: number
  message: string
  time: string
  status: 'active' | 'confirmed' | 'resolved'
  handler?: string
  handleTime?: string
  handleRemark?: string
}

export interface QualityTest {
  id: string
  batchNo: string
  testTime: string
  tester: string
  items: {
    name: string
    value: number
    unit: string
    standard: { min: number; max: number }
    result: 'pass' | 'fail'
  }[]
  overallResult: 'pass' | 'fail' | 'recheck' | 'degraded'
  stage: 'fermentation' | 'distillation' | 'aging'
  remark?: string
}

export interface MaintenanceOrder {
  id: string
  orderNo: string
  equipmentId: string
  equipmentName: string
  equipmentType: 'fermenter' | 'distiller' | 'other'
  type: 'routine' | 'fault' | 'preventive'
  status: 'pending' | 'assigned' | 'processing' | 'completed'
  priority: 'low' | 'medium' | 'high'
  description: string
  createTime: string
  assignedTeam?: string
  assignedTime?: string
  startTime?: string
  completeTime?: string
  partsUsed: { partId: string; partName: string; quantity: number }[]
  remark?: string
}

export interface SparePart {
  id: string
  name: string
  spec: string
  quantity: number
  unit: string
  safeStock: number
  location: string
  lastUpdate: string
}

export interface ProductionStat {
  date: string
  batchCount: number
  totalOutput: number
  alcoholYield: number
  premiumRate: number
  equipmentUtilization: number
  team: string
}

export interface BatchRecord {
  id: string
  batchNo: string
  recipeName: string
  startTime: string
  endTime?: string
  fermenterName: string
  distillerName?: string
  operator: string
  output: number
  alcoholContent: number
  qualityLevel: 'premium' | 'first' | 'qualified' | 'unqualified'
  status: 'fermenting' | 'distilling' | 'aging' | 'completed'
}

export interface User {
  id: string
  name: string
  role: 'director' | 'foreman' | 'operator' | 'quality' | 'maintenance'
  department: string
  avatar?: string
}
