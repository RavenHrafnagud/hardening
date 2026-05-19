import type {
  AssignedUserFormData,
  EquipmentFormData,
  HardeningDatabase,
} from '../domain/hardening'
import type { AuthSession } from '../../identity-access/domain/accessControl'

const API_BASE_URL = '/api'

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string }
      | null
    throw new Error(body?.message ?? 'No se pudo completar la solicitud.')
  }

  return response.json() as Promise<T>
}

export class ApiHardeningRepository {
  login(username: string, password: string) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  load(token: string) {
    return request<HardeningDatabase>('/hardening', {}, token)
  }

  createEquipment(token: string, formData: EquipmentFormData) {
    return request<HardeningDatabase>(
      '/equipments',
      {
        method: 'POST',
        body: JSON.stringify(formData),
      },
      token,
    )
  }

  assignUser(token: string, formData: AssignedUserFormData) {
    return request<HardeningDatabase>(
      '/assignments',
      {
        method: 'POST',
        body: JSON.stringify(formData),
      },
      token,
    )
  }
}
