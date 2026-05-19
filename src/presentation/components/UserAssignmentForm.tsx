import { FormEvent, useState } from 'react'
import type {
  AssignedUserFormData,
  Equipment,
} from '../../domain/hardening'

interface UserAssignmentFormProps {
  equipments: Equipment[]
  onSubmit: (formData: AssignedUserFormData) => void
}

const createInitialFormData = (
  equipments: Equipment[],
): AssignedUserFormData => ({
  equipmentId: equipments[0]?.id ?? '',
  name: '',
  gmail: '',
  outlook: '',
  area: '',
  notes: '',
})

export function UserAssignmentForm({
  equipments,
  onSubmit,
}: UserAssignmentFormProps) {
  const [formData, setFormData] = useState(() =>
    createInitialFormData(equipments),
  )

  const selectedEquipmentId = equipments.some(
    (equipment) => equipment.id === formData.equipmentId,
  )
    ? formData.equipmentId
    : equipments[0]?.id ?? ''

  const updateField = (field: keyof AssignedUserFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedEquipmentId) {
      return
    }

    onSubmit({ ...formData, equipmentId: selectedEquipmentId })
    setFormData(createInitialFormData(equipments))
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <span className="eyebrow">Asignaciones</span>
        <h2>Usuario del equipo</h2>
      </div>

      <label>
        Equipo
        <select
          required
          disabled={!equipments.length}
          value={selectedEquipmentId}
          onChange={(event) => updateField('equipmentId', event.target.value)}
        >
          {!equipments.length && (
            <option value="">No hay equipos disponibles</option>
          )}
          {equipments.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.name} · {equipment.serial}
            </option>
          ))}
        </select>
      </label>

      <label>
        Usuario
        <input
          required
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Gmail
          <input
            type="email"
            value={formData.gmail}
            onChange={(event) => updateField('gmail', event.target.value)}
          />
        </label>

        <label>
          Outlook
          <input
            type="email"
            value={formData.outlook}
            onChange={(event) => updateField('outlook', event.target.value)}
          />
        </label>
      </div>

      <label>
        Area
        <input
          value={formData.area}
          onChange={(event) => updateField('area', event.target.value)}
        />
      </label>

      <label>
        Notas
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(event) => updateField('notes', event.target.value)}
        />
      </label>

      <button type="submit" disabled={!equipments.length}>
        Asignar usuario
      </button>
    </form>
  )
}
