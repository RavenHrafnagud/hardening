import { useEffect, useMemo, useState } from 'react'
import type {
  AssignedUserFormData,
  EquipmentFormData,
  HardeningDatabase,
} from '../hardening/domain/hardening'
import type {
  Account,
  AuthSession,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../identity-access/domain/accessControl'
import { ApiHardeningRepository } from '../hardening/infrastructure/hardeningApiClient'
import { DashboardScreen } from '../hardening/presentation/DashboardScreen'
import { AccessControlApiClient } from '../identity-access/infrastructure/accessControlApiClient'
import { LoginScreen } from '../identity-access/presentation/LoginScreen'

/**
 * Componente raíz de la aplicación.
 * - Persiste la sesión en `sessionStorage`.
 * - Coordina la carga de datos usando `ApiHardeningRepository` y
 *   `AccessControlApiClient`.
 * - Expone handlers que delegan llamadas al backend.
 */
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
  const hardeningRepository = useMemo(() => new ApiHardeningRepository(), [])
  const accessControlRepository = useMemo(() => new AccessControlApiClient(), [])
  const [database, setDatabase] = useState<HardeningDatabase | null>(null)
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession(),
  )
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState('')
  const account = session?.account ?? null
  const token = session?.token ?? ''
  const isAdmin = account?.role === 'admin'

  const persistSession = (nextSession: AuthSession | null) => {
    if (!nextSession) {
      window.sessionStorage.removeItem(SESSION_KEY)
      return
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
  }

  useEffect(() => {
    if (!token) {
      return
    }

    let isMounted = true

    const loadData = async () => {
      const nextDatabase = await hardeningRepository.load(token)

      if (!isAdmin) {
        return { nextDatabase, nextAccounts: [] as Account[], currentAccount: null }
      }

      const accountDirectory = await accessControlRepository.listAccounts(token)
      return {
        nextDatabase,
        nextAccounts: accountDirectory.accounts,
        currentAccount: accountDirectory.currentAccount,
      }
    }

    loadData()
      .then(({ nextDatabase, nextAccounts, currentAccount }) => {
        if (!isMounted) {
          return
        }

        setDatabase(nextDatabase)
        setAccounts(nextAccounts)
        setError('')

        if (
          currentAccount &&
          session &&
          (
            currentAccount.id !== session.account.id ||
            currentAccount.username !== session.account.username ||
            currentAccount.role !== session.account.role ||
            currentAccount.displayName !== session.account.displayName
          )
        ) {
          const nextSession = { ...session, account: currentAccount }
          setSession(nextSession)
          persistSession(nextSession)
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setSession(null)
          setAccounts([])
          persistSession(null)
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
  }, [accessControlRepository, hardeningRepository, isAdmin, session, token])

  const handleLogin = async (username: string, password: string) => {
    const nextSession = await accessControlRepository.login(username, password)
    persistSession(nextSession)
    setDatabase(null)
    setAccounts([])
    setSession(nextSession)
  }

  const handleLogout = () => {
    setDatabase(null)
    setAccounts([])
    setSession(null)
    persistSession(null)
  }

  const handleCreateEquipment = async (formData: EquipmentFormData) => {
    if (!token) {
      return
    }

    setDatabase(await hardeningRepository.createEquipment(token, formData))
  }

  const handleUpdateEquipment = async (
    equipmentId: string,
    formData: EquipmentFormData,
  ) => {
    if (!token) {
      return
    }

    setDatabase(await hardeningRepository.updateEquipment(token, equipmentId, formData))
  }

  const handleAssignUser = async (formData: AssignedUserFormData) => {
    if (!token) {
      return
    }

    setDatabase(await hardeningRepository.assignUser(token, formData))
  }

  const handleUpdateAssignedUser = async (
    assignmentId: string,
    formData: Omit<AssignedUserFormData, 'equipmentId'>,
  ) => {
    if (!token) {
      return
    }

    setDatabase(
      await hardeningRepository.updateAssignedUser(token, assignmentId, formData),
    )
  }

  const handleCreateUser = async (formData: CreateUserFormData) => {
    if (!token) {
      return
    }

    const directory = await accessControlRepository.createUser(token, formData)
    setAccounts(directory.accounts)
  }

  const handleUpdateAccountCredentials = async (
    formData: UpdateAccountCredentialsFormData,
  ) => {
    if (!token || !session) {
      return
    }

    const directory = await accessControlRepository.updateAccountCredentials(
      token,
      formData,
    )
    const nextSession = {
      ...session,
      account: directory.currentAccount,
    }

    setAccounts(directory.accounts)
    setSession(nextSession)
    persistSession(nextSession)
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
      accounts={accounts}
      database={database}
      onAssignUser={handleAssignUser}
      onCreateEquipment={handleCreateEquipment}
      onUpdateEquipment={handleUpdateEquipment}
      onCreateUser={handleCreateUser}
      onUpdateAssignedUser={handleUpdateAssignedUser}
      onLogout={handleLogout}
      onUpdateAccountCredentials={handleUpdateAccountCredentials}
    />
  )
}

export default App
