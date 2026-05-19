import { useEffect, useMemo, useState } from 'react'
import type {
  AssignedUserFormData,
  EquipmentFormData,
  HardeningDatabase,
} from '../hardening/domain/hardening'
import type { AuthSession } from '../identity-access/domain/accessControl'
import { ApiHardeningRepository } from '../hardening/infrastructure/hardeningApiClient'
import { DashboardScreen } from '../hardening/presentation/DashboardScreen'
import { LoginScreen } from '../identity-access/presentation/LoginScreen'

const SESSION_KEY = 'credismart-hardening-session'

const readStoredSession = () => {
  const session = window.sessionStorage.getItem(SESSION_KEY)

  if (!session) {
    return null
  }

  try {
    return JSON.parse(session) as AuthSession
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function App() {
  const repository = useMemo(() => new ApiHardeningRepository(), [])
  const [database, setDatabase] = useState<HardeningDatabase | null>(null)
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession(),
  )
  const [error, setError] = useState('')
  const account = session?.account ?? null
  const token = session?.token ?? ''

  useEffect(() => {
    if (!token) {
      return
    }

    let isMounted = true

    repository
      .load(token)
      .then((nextDatabase) => {
        if (isMounted) {
          setDatabase(nextDatabase)
          setError('')
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          window.sessionStorage.removeItem(SESSION_KEY)
          setSession(null)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la base de datos.',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [repository, token])

  const handleLogin = async (username: string, password: string) => {
    const nextSession = await repository.login(username, password)
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setDatabase(null)
    setSession(nextSession)
  }

  const handleLogout = () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    setDatabase(null)
    setSession(null)
  }

  const handleCreateEquipment = async (formData: EquipmentFormData) => {
    if (!token) {
      return
    }

    setDatabase(await repository.createEquipment(token, formData))
  }

  const handleAssignUser = async (formData: AssignedUserFormData) => {
    if (!token) {
      return
    }

    setDatabase(await repository.assignUser(token, formData))
  }

  if (!account) {
    return <LoginScreen error={error} onLogin={handleLogin} />
  }

  if (!database) {
    return (
      <main className="loading-screen">
        <div className="panel">Cargando base de datos...</div>
      </main>
    )
  }

  return (
    <DashboardScreen
      account={account}
      database={database}
      onAssignUser={handleAssignUser}
      onCreateEquipment={handleCreateEquipment}
      onLogout={handleLogout}
    />
  )
}

export default App
