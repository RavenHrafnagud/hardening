import type {
  AssignedUserFormData,
  Equipment,
  EquipmentFormData,
  HardeningDatabase,
  HardeningMetrics,
} from '../domain/hardening'

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const now = () => new Date().toISOString()

export function createEquipment(
  database: HardeningDatabase,
  formData: EquipmentFormData,
): HardeningDatabase {
  const timestamp = now()
  const equipment: Equipment = {
    id: createId('eq'),
    name: formData.name.trim(),
    serial: formData.serial.trim(),
    assetId: formData.assetId.trim(),
    anydeskId: formData.anydeskId.trim(),
    bitlockerKey: formData.bitlockerKey.trim(),
    status: 'hardened',
    createdAt: timestamp,
    updatedAt: timestamp,
    assignedUsers: [],
  }

  return {
    ...database,
    equipments: [equipment, ...database.equipments],
  }
}

export function assignUserToEquipment(
  database: HardeningDatabase,
  formData: AssignedUserFormData,
): HardeningDatabase {
  const timestamp = now()

  return {
    ...database,
    equipments: database.equipments.map((equipment) => {
      if (equipment.id !== formData.equipmentId) {
        return equipment
      }

      return {
        ...equipment,
        status: 'assigned',
        updatedAt: timestamp,
        assignedUsers: [
          {
            id: createId('user'),
            name: formData.name.trim(),
            gmail: formData.gmail.trim(),
            outlook: formData.outlook.trim(),
            area: formData.area.trim(),
            assignedAt: timestamp,
            notes: formData.notes.trim(),
          },
          ...equipment.assignedUsers,
        ],
      }
    }),
  }
}

export function getHardeningMetrics(
  equipments: Equipment[],
): HardeningMetrics {
  const assigned = equipments.filter(
    (equipment) => equipment.assignedUsers.length > 0,
  ).length

  return {
    total: equipments.length,
    assigned,
    available: equipments.length - assigned,
    withBitlockerKey: equipments.filter((equipment) => equipment.bitlockerKey)
      .length,
  }
}

export function filterEquipments(
  equipments: Equipment[],
  query: string,
  status: 'all' | 'hardened' | 'assigned',
) {
  const normalizedQuery = query.trim().toLowerCase()

  return equipments.filter((equipment) => {
    const latestUser = equipment.assignedUsers[0]
    const statusMatches = status === 'all' || equipment.status === status
    const queryMatches =
      !normalizedQuery ||
      [
        equipment.name,
        equipment.serial,
        equipment.assetId,
        equipment.anydeskId,
        latestUser?.name,
        latestUser?.area,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))

    return statusMatches && queryMatches
  })
}
