import type { Account } from '../domain/hardening'

export const accounts: Account[] = [
  {
    id: 'acct-admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Administrador',
  },
  {
    id: 'acct-standard',
    username: 'standard',
    password: 'standard123',
    role: 'standard',
    displayName: 'Usuario',
  },
]

export function authenticate(username: string, password: string): Account | null {
  const normalizedUser = username.trim().toLowerCase()

  return (
    accounts.find(
      (account) =>
        account.username === normalizedUser && account.password === password,
    ) ?? null
  )
}
