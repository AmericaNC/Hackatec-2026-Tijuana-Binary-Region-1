import React from 'react'
import './loginViewStyle.css'

export default function RegisterView({
  email, setEmail, password, setPassword, loading, error, handleRegister, onGoToLogin
}) {
  return (
    <div className="login-card">
      <h2>Crear Cuenta</h2>
      {error && <p className="login-error">{error}</p>}

      <form onSubmit={handleRegister} className="login-form">
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
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          className="login-input"
        />

        <button type="submit" disabled={loading} className="login-button">
          {loading ? 'Registrando...' : 'Registrarse y Continuar'}
        </button>
      </form>

      <p className="login-footer">
        ¿Ya tienes cuenta?{' '}
        <button type="button" onClick={onGoToLogin} className="login-link-btn">
          Inicia sesión
        </button>
      </p>
    </div>
  )
}