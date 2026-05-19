import { useMemo, useState } from 'react'
import type { Account, HardeningDatabase } from './domain/hardening'
import { LocalHardeningRepository } from './infrastructure/repositories/localHardeningRepository'
import { DashboardScreen } from './presentation/screens/DashboardScreen'
import { LoginScreen } from './presentation/screens/LoginScreen'

const SESSION_KEY = 'credismart-hardening-session'

function App() {
  const repository = useMemo(() => new LocalHardeningRepository(), [])
  const [database, setDatabase] = useState<HardeningDatabase>(() =>
    repository.load(),
  )
  const [account, setAccount] = useState<Account | null>(() => {
    const session = window.sessionStorage.getItem(SESSION_KEY)
    return session ? (JSON.parse(session) as Account) : null
  })

  const handleLogin = (nextAccount: Account) => {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextAccount))
    setAccount(nextAccount)
  }

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    setAccount(null)
  }

  const handleDatabaseChange = (nextDatabase: HardeningDatabase) => {
    repository.save(nextDatabase)
    setDatabase(nextDatabase)
  }

  if (!account) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <DashboardScreen
      account={account}
      database={database}
      onDatabaseChange={handleDatabaseChange}
      onLogout={handleLogout}
    />
  )
}

export default App
