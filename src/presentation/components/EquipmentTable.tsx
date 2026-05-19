import type { Equipment, UserRole } from '../../domain/hardening'

interface EquipmentTableProps {
  equipments: Equipment[]
  role: UserRole
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export function EquipmentTable({ equipments, role }: EquipmentTableProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <span className="eyebrow">Base de datos</span>
        <h2>Equipos registrados</h2>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Serial</th>
              <th>AnyDesk</th>
              <th>Usuario</th>
              <th>Estado</th>
              {role === 'admin' && <th>BitLocker</th>}
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {equipments.map((equipment) => {
              const latestUser = equipment.assignedUsers[0]

              return (
                <tr key={equipment.id}>
                  <td data-label="Equipo">
                    <strong>{equipment.name}</strong>
                    <span>{equipment.assetId || 'Sin id activo'}</span>
                  </td>
                  <td data-label="Serial">{equipment.serial}</td>
                  <td data-label="AnyDesk">{equipment.anydeskId}</td>
                  <td data-label="Usuario">
                    {latestUser ? (
                      <>
                        <strong>{latestUser.name}</strong>
                        <span>{latestUser.area || 'Sin area'}</span>
                      </>
                    ) : (
                      <span>Disponible</span>
                    )}
                  </td>
                  <td data-label="Estado">
                    <span className={`status status-${equipment.status}`}>
                      {equipment.status === 'assigned'
                        ? 'Asignado'
                        : 'Hardening'}
                    </span>
                  </td>
                  {role === 'admin' && (
                    <td data-label="BitLocker">
                      {equipment.bitlockerKey ? (
                        <details className="secret">
                          <summary>Ver llave</summary>
                          <code>{equipment.bitlockerKey}</code>
                        </details>
                      ) : (
                        <span>Sin llave</span>
                      )}
                    </td>
                  )}
                  <td data-label="Actualizado">{formatDate(equipment.updatedAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
