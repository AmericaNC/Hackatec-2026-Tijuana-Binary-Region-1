import './loginViewStyle.css'
import ThemeToggle from '../components/ThemeToggle'

// Cambia aquí el nombre de tu aplicación (el mismo que en la landing)
const APP_NAME = 'Demands / Offers'

export default function LoginView({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  handleLogin,
  onGoToRegister,
  onGoBack, // opcional: si lo pasas, aparece el botón "Volver al inicio"
  theme,
  onToggleTheme,
}) {
  return (
    <div className="login-page">
      <div className="login-top">
        <span className="login-brand">{APP_NAME}</span>
        <div className="login-top-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          {onGoBack && (
            <button type="button" onClick={onGoBack} className="login-link-btn">
              Volver al inicio
            </button>
          )}
        </div>
      </div>

      <div className="login-card">
        <h2>Iniciar sesión</h2>
        <p className="login-intro">
          Entra para ver tus proyectos, tus habilidades y tus planes de estudio.
        </p>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <label htmlFor="login-email" className="login-label">
            Correo electrónico
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />

          <label htmlFor="login-password" className="login-label">
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
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
    </div>
  )
}