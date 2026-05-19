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
