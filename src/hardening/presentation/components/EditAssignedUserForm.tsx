import { FormEvent, useState } from 'react'
import type { AssignedUser, AssignedUserFormData } from '../../domain/hardening'

interface EditAssignedUserFormProps {
  assignedUser: AssignedUser
  onSubmit: (formData: Omit<AssignedUserFormData, 'equipmentId'>) => Promise<void>
  onCancel: () => void
}

export function EditAssignedUserForm({
  assignedUser,
  onSubmit,
  onCancel,
}: EditAssignedUserFormProps) {
  const [formData, setFormData] = useState<Omit<AssignedUserFormData, 'equipmentId'>>({
    name: assignedUser.name,
    gmail: assignedUser.gmail,
    outlook: assignedUser.outlook,
    area: assignedUser.area,
    notes: assignedUser.notes,
  })

  const updateField = (field: keyof Omit<AssignedUserFormData, 'equipmentId'>, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <span className="eyebrow">Editar usuario</span>
        <h2>{assignedUser.name}</h2>
      </div>

      <label>
        Nombre
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

      <div className="form-actions">
        <button type="button" className="ghost-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit">Guardar cambios</button>
      </div>
    </form>
  )
}
