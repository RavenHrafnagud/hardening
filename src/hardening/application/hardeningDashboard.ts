import type {
  Equipment,
  HardeningMetrics,
} from '../domain/hardening'

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
