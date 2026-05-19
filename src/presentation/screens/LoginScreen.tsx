import { FormEvent, useState } from 'react'
import type { Account } from '../../domain/hardening'
import { authenticate } from '../../application/auth'

interface LoginScreenProps {
  onLogin: (account: Account) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const account = authenticate(username, password)

    if (!account) {
      setError('Credenciales invalidas')
      return
    }

    setError('')
    onLogin(account)
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

          {error && <p className="form-error">{error}</p>}

          <button type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  )
}
