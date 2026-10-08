import './loginViewStyle.css'
import ThemeToggle from '../components/ThemeToggle'

export default function RegisterView({
  email, setEmail, password, setPassword, tipoCuenta, setTipoCuenta,
  nombre, setNombre, matricula, setMatricula, carrera, setCarrera,
  academia, setAcademia, carreras, cargandoCarreras,
  loading, error, status, handleRegister, onGoToLogin, theme, onToggleTheme
}) {
  return (
    <div className="login-card">
      <div className="register-card-heading">
        <h2>Crear Cuenta</h2>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
      </div>
      {error && <p className="login-error">{error}</p>}
      {status && <p className="login-status" role="status">{status}</p>}

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

        {tipoCuenta === 'estudiante' && (
          <>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Nombre completo"
              autoComplete="name"
              required
              className="login-input"
            />
            <input
              type="text"
              value={matricula}
              onChange={(event) => setMatricula(event.target.value)}
              placeholder="Matrícula / número de control"
              required
              className="login-input"
            />
            <select
              value={carrera}
              onChange={(event) => setCarrera(event.target.value)}
              required
              disabled={cargandoCarreras || carreras.length === 0}
              className="login-input"
              aria-label="Carrera"
            >
              <option value="">{cargandoCarreras ? 'Cargando carreras...' : 'Selecciona tu carrera'}</option>
              {carreras.map((career) => <option key={career} value={career}>{career}</option>)}
            </select>
            <input
              type="text"
              value={academia}
              onChange={(event) => setAcademia(event.target.value)}
              placeholder="Academia / departamento"
              required
              className="login-input"
            />
          </>
        )}

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