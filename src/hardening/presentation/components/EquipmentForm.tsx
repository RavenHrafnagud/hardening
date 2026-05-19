import { FormEvent, useState } from 'react'
import type { EquipmentFormData } from '../../domain/hardening'

interface EquipmentFormProps {
  onSubmit: (formData: EquipmentFormData) => void | Promise<void>
}

const initialFormData: EquipmentFormData = {
  name: '',
  serial: '',
  assetId: '',
  anydeskId: '',
  bitlockerKey: '',
}

export function EquipmentForm({ onSubmit }: EquipmentFormProps) {
  const [formData, setFormData] = useState(initialFormData)

  const updateField = (field: keyof EquipmentFormData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(formData)
    setFormData(initialFormData)
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <span className="eyebrow">Inventario</span>
        <h2>Nuevo equipo</h2>
      </div>

      <label>
        Equipo
        <input
          required
          value={formData.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="HOST-001"
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

      <button type="submit">Guardar equipo</button>
    </form>
  )
}
