import type {
  AssignedUserFormData,
  EquipmentFormData,
  HardeningDatabase,
} from '../domain/hardening'
import { apiRequest } from '../../shared/infrastructure/httpClient'

export class ApiHardeningRepository {
  load(token: string) {
    return apiRequest<HardeningDatabase>('/hardening', {}, token)
  }

  createEquipment(token: string, formData: EquipmentFormData) {
    return apiRequest<HardeningDatabase>(
      '/equipments',
      {
        method: 'POST',
        body: JSON.stringify(formData),
      },
      token,
    )
  }

  assignUser(token: string, formData: AssignedUserFormData) {
    return apiRequest<HardeningDatabase>(
      '/assignments',
      {
        method: 'POST',
        body: JSON.stringify(formData),
      },
      token,
    )
  }

  updateEquipment(
    token: string,
    equipmentId: string,
    formData: EquipmentFormData,
  ) {
    return apiRequest<HardeningDatabase>(
      `/equipments/${equipmentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(formData),
      },
      token,
    )
  }

  updateAssignedUser(
    token: string,
    assignmentId: string,
    formData: Omit<AssignedUserFormData, 'equipmentId'>,
  ) {
    return apiRequest<HardeningDatabase>(
      `/assignments/${assignmentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(formData),
      },
      token,
    )
  }
}
