export type EquipmentStatus = 'hardened' | 'assigned'

export interface AssignedUser {
  id: string
  name: string
  gmail: string
  outlook: string
  area: string
  assignedAt: string
  notes: string
}

export interface Equipment {
  id: string
  name: string
  serial: string
  assetId: string
  anydeskId: string
  bitlockerKey: string
  status: EquipmentStatus
  createdAt: string
  updatedAt: string
  assignedUsers: AssignedUser[]
}

export interface HardeningDatabase {
  version: number
  importedAt: string
  source: string
  equipments: Equipment[]
}

export interface EquipmentFormData {
  name: string
  serial: string
  assetId: string
  anydeskId: string
  bitlockerKey: string
}

export interface EquipmentUpdateFormData extends EquipmentFormData {
  equipmentId: string
}

export interface AssignedUserFormData {
  equipmentId: string
  name: string
  gmail: string
  outlook: string
  area: string
  notes: string
}

export interface AssignedUserUpdateFormData {
  id: string
  name: string
  gmail: string
  outlook: string
  area: string
  notes: string
}

export interface HardeningMetrics {
  total: number
  assigned: number
  available: number
  withBitlockerKey: number
}
