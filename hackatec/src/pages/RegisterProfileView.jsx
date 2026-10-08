import React from 'react'
import './loginViewStyle.css'

export default function RegisterProfileView({
  correo, setCorreo, nombre, setNombre, matricula, setMatricula,
  carrera, setCarrera, academia, setAcademia, activo, setActivo,
  loading, validando, error, statusMsg, fotoPreview, correoValidado,
  handleVerificarCorreo, handleFileInput, handleRegistrarAlumno
}) {
  return (
    <div className="login-card" style={{ maxWidth: '420px' }}>
      <h2>Registro Institucional</h2>
      {error && <p className="login-error" style={{ backgroundColor: '#fef2f2', padding: '8px' }}>{error}</p>}
      {statusMsg && <p className="login-status">{statusMsg}</p>}

      <form onSubmit={handleRegistrarAlumno} className="login-form">
        <div>
          <label className="login-label">Correo Electrónico:</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="ejemplo@tectijuana.edu.mx"
            required
            className="login-input"
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <button
          type="button"
          onClick={handleVerificarCorreo}
          disabled={validando}
          className="login-btn-verify"
        >
          {validando ? 'Comprobando Dominio...' : '🔍 Validar Correo Institucional'}
        </button>

        <div className={`login-badge ${correoValidado ? 'badge-success' : 'badge-error'}`}>
          {correoValidado ? '✅ Dominio Institucional Autorizado' : '🔒 Requiere Correo Institucional'}
        </div>

        <div>
          <label className="login-label">Matrícula / No. Control:</label>
          <input
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
            placeholder="Ej. 22211648"
            className="login-input"
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <div>
          <label className="login-label">Nombre Completo:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej. Juan Pérez González"
            className="login-input"
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <div>
          <label className="login-label">Carrera:</label>
          <select 
            value={carrera} 
            onChange={(e) => setCarrera(e.target.value)} 
            className="login-input"
            style={{ width: '100%', marginTop: '4px' }}
          >
            <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
            <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
            <option value="Ingeniería en Inteligencia Artificial">Ingeniería en Inteligencia Artificial</option>
            <option value="Ingeniería Industrial">Ingeniería Industrial</option>
            <option value="Ingeniería Mecatrónica">Ingeniería Mecatrónica</option>
          </select>
        </div>

        <div>
          <label className="login-label">Academia / Departamento:</label>
          <input
            type="text"
            value={academia}
            onChange={(e) => setAcademia(e.target.value)}
            placeholder="Ej. Sistemas y Computación"
            className="login-input"
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label className="login-label">Estatus del Alumno:</label>
          <label style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-900)' }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            {' '}{activo ? 'Activo (Permitir Acceso)' : 'Inactivo'}
          </label>
        </div>

        <div className="login-file-box">
          <label className="login-label">Foto de Perfil (Opcional):</label>
          <input type="file" accept="image/*" onChange={handleFileInput} className="login-input" style={{ width: '100%', marginTop: '4px', border: 'none' }} />
          {fotoPreview && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <img src={fotoPreview} alt="Preview" className="login-avatar" />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !correoValidado}
          className="login-button"
        >
          {loading ? 'Guardando en BD...' : 'Registrar en Tabla Alumnos'}
        </button>
      </form>
    </div>
  )
}