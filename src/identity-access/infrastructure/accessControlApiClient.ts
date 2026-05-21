import type {
  AccountDirectory,
  AuthSession,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../domain/accessControl'

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

export class AccessControlApiClient {
  login(username: string, password: string) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  listAccounts(token: string) {
    return request<AccountDirectory>('/accounts', {}, token)
  }

  createUser(token: string, formData: CreateUserFormData) {
    return request<AccountDirectory>(
      '/accounts',
      {
        method: 'POST',
        body: JSON.stringify(formData),
      },
      token,
    )
  }

  updateAccountCredentials(
    token: string,
    formData: UpdateAccountCredentialsFormData,
  ) {
    return request<AccountDirectory>(
      `/accounts/${formData.accountId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      },
      token,
    )
  }
}
