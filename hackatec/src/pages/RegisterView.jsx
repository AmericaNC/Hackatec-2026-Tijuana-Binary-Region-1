import React from 'react'
import './loginViewStyle.css'

export default function RegisterView({
  email, setEmail, password, setPassword, tipoCuenta, setTipoCuenta,
  loading, error, handleRegister, onGoToLogin
}) {
  return (
    <div className="login-card">
      <h2>Crear Cuenta</h2>
      {error && <p className="login-error">{error}</p>}

      <form onSubmit={handleRegister} className="login-form">
        <label className="login-label" htmlFor="tipo-cuenta">Tipo de cuenta:</label>
        <select
          id="tipo-cuenta"
          value={tipoCuenta}
          onChange={(e) => setTipoCuenta(e.target.value)}
          className="login-input"
        >
          <option value="estudiante">Estudiante universitario</option>
          <option value="empresa">Empresa o empleador</option>
        </select>

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