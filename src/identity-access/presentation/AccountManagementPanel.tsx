import { FormEvent, useState } from 'react'
import type {
  Account,
  CreateUserFormData,
  UpdateAccountCredentialsFormData,
} from '../domain/accessControl'

interface AccountManagementPanelProps {
  accounts: Account[]
  currentAccountId: string
  onCreateUser: (formData: CreateUserFormData) => Promise<void>
  onUpdateAccountCredentials: (
    formData: UpdateAccountCredentialsFormData,
  ) => Promise<void>
}

interface AccountRowProps {
  account: Account
  isCurrentAccount: boolean
  onUpdateAccountCredentials: (
    formData: UpdateAccountCredentialsFormData,
  ) => Promise<void>
}

function AccountRow({
  account,
  isCurrentAccount,
  onUpdateAccountCredentials,
}: AccountRowProps) {
  const [username, setUsername] = useState(account.username)
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await onUpdateAccountCredentials({
        accountId: account.id,
        username,
        password,
      })
      setPassword('')
      setFeedback('Credenciales actualizadas.')
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'No se pudieron actualizar las credenciales.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <article className="account-card">
      <div className="account-head">
        <div>
          <strong>{account.username}</strong>
          <p className="panel-note">
            {isCurrentAccount ? 'Sesion actual' : 'Cuenta administrada'}
          </p>
        </div>
        <span
          className={`role-pill ${
            account.role === 'admin' ? 'role-pill-admin' : 'role-pill-user'
          }`}
        >
          {account.role === 'admin' ? 'Administrador unico' : 'Usuario'}
        </span>
      </div>

      <form className="account-form" onSubmit={handleSubmit}>
        <label>
          Nombre de usuario
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          Nueva contraseña
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Dejar en blanco para conservar"
          />
        </label>

        {feedback && (
          <p
            className={
              feedback === 'Credenciales actualizadas.'
                ? 'form-success'
                : 'form-error'
            }
          >
            {feedback}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar credenciales'}
        </button>
      </form>
    </article>
  )
}

export function AccountManagementPanel({
  accounts,
  currentAccountId,
  onCreateUser,
  onUpdateAccountCredentials,
}: AccountManagementPanelProps) {
  const [createForm, setCreateForm] = useState<CreateUserFormData>({
    username: '',
    password: '',
  })
  const [createFeedback, setCreateFeedback] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)

    try {
      await onCreateUser(createForm)
      setCreateForm({ username: '', password: '' })
      setCreateFeedback('Usuario creado correctamente.')
    } catch (error) {
      setCreateFeedback(
        error instanceof Error
          ? error.message
          : 'No se pudo crear el usuario.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="panel form-panel account-management-panel">
      <div className="panel-heading">
        <span className="eyebrow">Accesos</span>
        <h2>Usuarios del sistema</h2>
      </div>

      <p className="panel-note">
        El administrador unico puede crear usuarios y cambiar usuario o contraseña
        de cualquier cuenta.
      </p>

      <form className="account-create-form" onSubmit={handleCreateUser}>
        <div className="inline-field-grid">
          <label>
            Nuevo usuario
            <input
              required
              autoComplete="off"
              value={createForm.username}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Contraseña inicial
            <input
              required
              type="password"
              autoComplete="new-password"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
          </label>
        </div>

        {createFeedback && (
          <p
            className={
              createFeedback === 'Usuario creado correctamente.'
                ? 'form-success'
                : 'form-error'
            }
          >
            {createFeedback}
          </p>
        )}

        <button type="submit" disabled={isCreating}>
          {isCreating ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>

      <div className="account-list">
        {accounts.map((account) => (
          <AccountRow
            key={`${account.id}:${account.username}`}
            account={account}
            isCurrentAccount={account.id === currentAccountId}
            onUpdateAccountCredentials={onUpdateAccountCredentials}
          />
        ))}
      </div>
    </section>
  )
}
