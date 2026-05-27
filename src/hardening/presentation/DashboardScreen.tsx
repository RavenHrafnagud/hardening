import { useMemo, useState } from 'react'
import type {
  AssignedUser,
  AssignedUserFormData,
  Equipment,
  EquipmentFormData,
  HardeningDatabase,
} from '../domain/hardening'
import type {
  Account,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../../identity-access/domain/accessControl'
import {
  filterEquipments,
  getHardeningMetrics,
} from '../application/hardeningDashboard'
import { createHardeningExcelExport } from '../application/exportHardeningSpreadsheet'
import { AccountManagementPanel } from '../../identity-access/presentation/AccountManagementPanel'
import { EditAssignedUserForm } from './components/EditAssignedUserForm'
import { EditEquipmentForm } from './components/EditEquipmentForm'
import { EquipmentForm } from './components/EquipmentForm'
import { EquipmentTable } from './components/EquipmentTable'
import { MetricCard } from './components/MetricCard'
import { UserAssignmentForm } from './components/UserAssignmentForm'

interface DashboardScreenProps {
  account: Account
  accounts: Account[]
  database: HardeningDatabase
  onAssignUser: (formData: AssignedUserFormData) => Promise<void>
  onCreateEquipment: (formData: EquipmentFormData) => Promise<void>
  onUpdateEquipment: (
    equipmentId: string,
    formData: EquipmentFormData,
  ) => Promise<void>
  onCreateUser: (formData: CreateUserFormData) => Promise<void>
  onUpdateAssignedUser: (
    assignmentId: string,
    formData: Omit<AssignedUserFormData, 'equipmentId'>,
  ) => Promise<void>
  onLogout: () => void
  onUpdateAccountCredentials: (
    formData: UpdateAccountCredentialsFormData,
  ) => Promise<void>
}

/**
 * `DashboardScreen` es la vista principal una vez iniciada la sesión.
 * - Muestra métricas, lista de equipos y formularios para crear/asignar.
 * - Recibe callbacks (`onAssignUser`, `onCreateEquipment`, ...) que
 *   delegan las operaciones al backend.
 */
export function DashboardScreen({
  account,
  accounts,
  database,
  onAssignUser,
  onCreateEquipment,
  onUpdateEquipment,
  onCreateUser,
  onUpdateAssignedUser,
  onLogout,
  onUpdateAccountCredentials,
}: DashboardScreenProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'hardened' | 'assigned'>('all')
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [editingAssignedUser, setEditingAssignedUser] = useState<AssignedUser | null>(null)
  const isAdmin = account.role === 'admin'

  const metrics = useMemo(
    () => getHardeningMetrics(database.equipments),
    [database.equipments],
  )

  const visibleEquipments = useMemo(
    () => filterEquipments(database.equipments, query, status),
    [database.equipments, query, status],
  )

  const assignableEquipments = useMemo(() => {
    if (isAdmin) {
      return database.equipments
    }

    return database.equipments.filter(
      (equipment) => equipment.assignedUsers.length === 0,
    )
  }, [database.equipments, isAdmin])

  const startEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment)
    setEditingAssignedUser(null)
  }

  const startEditAssignedUser = (assignedUser: AssignedUser) => {
    setEditingAssignedUser(assignedUser)
    setEditingEquipment(null)
  }

  const cancelEdit = () => {
    setEditingEquipment(null)
    setEditingAssignedUser(null)
  }

  const exportDatabase = () => {
    downloadFile(
      JSON.stringify(database, null, 2),
      'application/json',
      'credismart-hardening-db.json',
    )
  }

  const exportExcel = () => {
    const file = createHardeningExcelExport(database)
    downloadFile(file.content, file.mimeType, file.filename)
  }

  const downloadFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">CrediSmart</span>
          <h1>Hardening</h1>
        </div>

        <div className="session-box">
          <span>{account.username}</span>
          <strong>{isAdmin ? 'Administrador' : 'Usuario'}</strong>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <section className="metrics-grid">
        <MetricCard label="Equipos" value={metrics.total} tone="ink" />
        <MetricCard label="Asignados" value={metrics.assigned} tone="green" />
        <MetricCard label="Disponibles" value={metrics.available} tone="blue" />
        <MetricCard
          label="Con llave"
          value={metrics.withBitlockerKey}
          tone="amber"
        />
      </section>

      <section className="workspace">
        <div className="workspace-main">
          <section className="toolbar panel">
            <label>
              Buscar
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Equipo, serial, AnyDesk, usuario"
              />
            </label>

            <label>
              Estado
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as 'all' | 'hardened' | 'assigned')
                }
              >
                <option value="all">Todos</option>
                <option value="hardened">Hardening</option>
                <option value="assigned">Asignados</option>
              </select>
            </label>

            {isAdmin && (
              <div className="toolbar-actions">
                <button type="button" onClick={exportExcel}>
                  Exportar Excel
                </button>
                <button type="button" className="ghost-button" onClick={exportDatabase}>
                  JSON
                </button>
              </div>
            )}
          </section>

          <EquipmentTable
            equipments={visibleEquipments}
            role={account.role}
            onEditEquipment={startEditEquipment}
            onEditAssignedUser={startEditAssignedUser}
          />
        </div>

        <aside className="workspace-side">
          {editingEquipment && isAdmin && (
            <EditEquipmentForm
              equipment={editingEquipment}
              onSubmit={async (data) => {
                await onUpdateEquipment(editingEquipment.id, data)
                cancelEdit()
              }}
              onCancel={cancelEdit}
            />
          )}

          {editingAssignedUser && (
            <EditAssignedUserForm
              assignedUser={editingAssignedUser}
              onSubmit={async (data) => {
                await onUpdateAssignedUser(editingAssignedUser.id, data)
                cancelEdit()
              }}
              onCancel={cancelEdit}
            />
          )}

          {isAdmin && !editingEquipment && (
            <EquipmentForm
              onSubmit={onCreateEquipment}
            />
          )}

          <UserAssignmentForm
            equipments={assignableEquipments}
            onSubmit={async (formData) => {
              const selectedEquipment = database.equipments.find(
                (equipment) => equipment.id === formData.equipmentId,
              )

              if (
                !isAdmin &&
                (!selectedEquipment || selectedEquipment.assignedUsers.length > 0)
              ) {
                return
              }

              await onAssignUser(formData)
            }}
          />

          {isAdmin && !editingEquipment && (
            <AccountManagementPanel
              accounts={accounts}
              currentAccountId={account.id}
              onCreateUser={onCreateUser}
              onUpdateAccountCredentials={onUpdateAccountCredentials}
            />
          )}
        </aside>
      </section>
    </main>
  )
}
