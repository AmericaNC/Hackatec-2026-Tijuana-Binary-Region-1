import './loginViewStyle.css'
import { carrerasDisponibles } from '../constants/carreras'

// Cambia aquí el nombre de tu aplicación (el mismo que en la landing y el login)
const APP_NAME = 'Demands / Offers'

export default function RegisterProfileView({
  correo, setCorreo, nombre, setNombre, matricula, setMatricula,
  carrera, setCarrera, academia, setAcademia, activo, setActivo,
  tipoCuenta, razonSocialRfc, setRazonSocialRfc, direccion, setDireccion,
  descripcionEmpresa, setDescripcionEmpresa,
  loading, validando, error, statusMsg, fotoPreview, correoValidado,
  handleVerificarCorreo, handleFileInput, handleRegistrarAlumno
}) {
  const mensajes = (
    <>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      {statusMsg && (
        <p className="login-status" role="status">
          {statusMsg}
        </p>
      )}
    </>
  )

  // ---------- Registro de empresa ----------
  if (tipoCuenta === 'empresa') {
    return (
      <div className="login-page">
        <div className="login-top">
          <span className="login-brand">{APP_NAME}</span>
        </div>

        <div className="login-card login-card-wide">
          <h2>Registro de empresa</h2>
          <p className="login-intro">
            Cuéntanos sobre tu empresa para publicar proyectos y conectar con estudiantes.
          </p>

          {mensajes}

          <form onSubmit={handleRegistrarAlumno} className="login-form login-form-register">
            <div className="login-field">
              <label className="login-label" htmlFor="empresa-nombre">Nombre</label>
              <input
                id="empresa-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="empresa-razon">Razón social o RFC</label>
              <input
                id="empresa-razon"
                type="text"
                value={razonSocialRfc}
                onChange={(e) => setRazonSocialRfc(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="empresa-direccion">Dirección de la empresa</label>
              <textarea
                id="empresa-direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                required
                className="login-input login-textarea"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="empresa-descripcion">Descripción de la empresa (opcional)</label>
              <textarea
                id="empresa-descripcion"
                value={descripcionEmpresa}
                onChange={(e) => setDescripcionEmpresa(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Cuéntanos sobre tu empresa, su misión y los proyectos que desarrolla."
                className="login-input login-textarea"
              />
            </div>

            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Guardando...' : 'Registrar empresa'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ---------- Registro de alumno ----------
  return (
    <div className="login-page">
      <div className="login-top">
        <span className="login-brand">{APP_NAME}</span>
      </div>

      <div className="login-card login-card-wide">
        <h2>Registro institucional</h2>
        <p className="login-intro">
          Usa tu correo institucional para comprobar que eres alumno y completa tu perfil.
        </p>

        {mensajes}

        <form onSubmit={handleRegistrarAlumno} className="login-form login-form-register">
          <div className="login-field">
            <label className="login-label" htmlFor="alumno-correo">Correo electrónico</label>
            <input
              id="alumno-correo"
              type="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="ejemplo@tectijuana.edu.mx"
              required
              className="login-input"
            />
          </div>

          <button
            type="button"
            onClick={handleVerificarCorreo}
            disabled={validando}
            className="login-btn-verify"
          >
            {validando ? 'Comprobando dominio...' : 'Validar correo institucional'}
          </button>

          <div
            className={`login-badge ${correoValidado ? 'badge-success' : 'badge-error'}`}
            role="status"
          >
            {correoValidado ? 'Dominio institucional autorizado' : 'Requiere correo institucional'}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="alumno-matricula">Matrícula / No. de control</label>
            <input
              id="alumno-matricula"
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              required
              placeholder="Ej. 22211648"
              className="login-input"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="alumno-nombre">Nombre completo</label>
            <input
              id="alumno-nombre"
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Juan Pérez González"
              className="login-input"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="alumno-carrera">Carrera</label>
            <select
              id="alumno-carrera"
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              required
              className="login-input"
            >
              {carrerasDisponibles.map((opcionCarrera) => (
                <option key={opcionCarrera} value={opcionCarrera}>{opcionCarrera}</option>
              ))}
            </select>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="alumno-academia">Academia / Departamento</label>
            <input
              id="alumno-academia"
              type="text"
              value={academia}
              onChange={(e) => setAcademia(e.target.value)}
              placeholder="Ej. Sistemas y Computación"
              required
              className="login-input"
            />
          </div>

          <div className="login-check-row">
            <span className="login-label">Estatus del alumno</span>
            <label className="login-check" htmlFor="alumno-activo">
              <input
                id="alumno-activo"
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              {activo ? 'Activo (permitir acceso)' : 'Inactivo'}
            </label>
          </div>

          <div className="login-file-box">
            <label className="login-label" htmlFor="alumno-foto">Foto de perfil (opcional)</label>
            <input
              id="alumno-foto"
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="login-file-input"
            />
            {fotoPreview && (
              <div className="login-avatar-wrap">
                <img src={fotoPreview} alt="Vista previa de tu foto de perfil" className="login-avatar" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !correoValidado}
            className="login-button"
          >
            {loading ? 'Guardando...' : 'Completar registro'}
          </button>
        </form>
      </div>
    </div>
  )
}