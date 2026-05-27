import type {
  AccountDirectory,
  AuthSession,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../domain/accessControl'
import { apiRequest } from '../../shared/infrastructure/httpClient'

export class AccessControlApiClient {
  login(username: string, password: string) {
    return apiRequest<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  listAccounts(token: string) {
    return apiRequest<AccountDirectory>('/accounts', {}, token)
  }

  createUser(token: string, formData: CreateUserFormData) {
    return apiRequest<AccountDirectory>(
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
    return apiRequest<AccountDirectory>(
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
