import React from 'react'
import './loginViewStyle.css'

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  handleLogin,
  onGoToRegister
}) {
  return (
    <div className="login-card">
      <h2>Iniciar Sesión</h2>
      {error && <p className="login-error">{error}</p>}

      <form onSubmit={handleLogin} className="login-form">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="login-input"
        />

        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>
      </form>

      <p className="login-footer">
        ¿No tienes cuenta?{' '}
        <button type="button" onClick={onGoToRegister} className="login-link-btn">
          Regístrate aquí
        </button>
      </p>
    </div>
  )
}