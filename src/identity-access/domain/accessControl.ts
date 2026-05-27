export type UserRole = 'admin' | 'standard'

export interface Account {
  id: string
  username: string
  role: UserRole
  displayName: string
}

export interface AuthSession {
  account: Account
  token: string
}

export interface AccountDirectory {
  accounts: Account[]
  currentAccount: Account
}

export interface CreateUserFormData {
  username: string
  password: string
}

export interface UpdateAccountCredentialsFormData {
  accountId: string
  username: string
  password: string
}
