import { useMemo, useState } from 'react'
import type {
  AssignedUserFormData,
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
import { AccountManagementPanel } from '../../identity-access/presentation/AccountManagementPanel'
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
  onCreateUser: (formData: CreateUserFormData) => Promise<void>
  onLogout: () => void
  onUpdateAccountCredentials: (
    formData: UpdateAccountCredentialsFormData,
  ) => Promise<void>
}

export function DashboardScreen({
  account,
  accounts,
  database,
  onAssignUser,
  onCreateEquipment,
  onCreateUser,
  onLogout,
  onUpdateAccountCredentials,
}: DashboardScreenProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'hardened' | 'assigned'>('all')
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

  const exportDatabase = () => {
    const blob = new Blob([JSON.stringify(database, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'credismart-hardening-db.json'
    link.click()
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
              <button type="button" className="ghost-button" onClick={exportDatabase}>
                Exportar JSON
              </button>
            )}
          </section>

          <EquipmentTable equipments={visibleEquipments} role={account.role} />
        </div>

        <aside className="workspace-side">
          {isAdmin && (
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

          {isAdmin && (
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
