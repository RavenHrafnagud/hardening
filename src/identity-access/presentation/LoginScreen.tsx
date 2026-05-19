import { FormEvent, useState } from 'react'
interface LoginScreenProps {
  error: string
  onLogin: (username: string, password: string) => Promise<void>
}

export function LoginScreen({ error, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await onLogin(username, password)
      setLocalError('')
    } catch (loginError) {
      setLocalError(
        loginError instanceof Error
          ? loginError.message
          : 'Credenciales invalidas',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-mark">CS</div>
        <div className="login-heading">
          <span className="eyebrow">CrediSmart</span>
          <h1>Hardening</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            Contraseña
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {(localError || error) && (
            <p className="form-error">{localError || error}</p>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
