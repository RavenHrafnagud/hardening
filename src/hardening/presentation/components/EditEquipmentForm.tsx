import { FormEvent, useState } from 'react'
import type { Equipment, EquipmentFormData } from '../../domain/hardening'

interface EditEquipmentFormProps {
  equipment: Equipment
  onSubmit: (formData: EquipmentFormData) => Promise<void>
  onCancel: () => void
}

export function EditEquipmentForm({
  equipment,
  onSubmit,
  onCancel,
}: EditEquipmentFormProps) {
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: equipment.name,
    serial: equipment.serial,
    assetId: equipment.assetId,
    anydeskId: equipment.anydeskId,
    bitlockerKey: equipment.bitlockerKey,
  })

  const updateField = (field: keyof EquipmentFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <span className="eyebrow">Editar equipo</span>
        <h2>{equipment.name}</h2>
      </div>

      <label>
        Equipo
        <input
          required
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </label>

      <div className="form-grid">
        <label>
          Serial
          <input
            required
            value={formData.serial}
            onChange={(event) => updateField('serial', event.target.value)}
          />
        </label>

        <label>
          Id activo
          <input
            value={formData.assetId}
            onChange={(event) => updateField('assetId', event.target.value)}
          />
        </label>
      </div>

      <label>
        Id AnyDesk
        <input
          required
          value={formData.anydeskId}
          onChange={(event) => updateField('anydeskId', event.target.value)}
        />
      </label>

      <label>
        Llave BitLocker
        <textarea
          required
          rows={3}
          value={formData.bitlockerKey}
          onChange={(event) => updateField('bitlockerKey', event.target.value)}
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
