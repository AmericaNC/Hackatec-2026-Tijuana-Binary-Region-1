import { carrerasDisponibles } from '../constants/carreras'

export default function EmployerJobsPage({
  esEmpresa,
  formulario,
  actualizarCampo,
  alternarCarrera,
  publicarEmpleo,
  error,
  statusMsg,
  saving,
  loading,
  empleos,
  eliminarEmpleo,
}) {
  return (
    <>
      {esEmpresa && (
        <form className="employment-form" onSubmit={publicarEmpleo}>
          <label className="employment-field">
            <span>Nombre del empleo</span>
            <input value={formulario.nombreEmpleo} onChange={(event) => actualizarCampo('nombreEmpleo', event.target.value)} required maxLength={120} />
          </label>
          <label className="employment-field">
            <span>Puesto de trabajo</span>
            <input value={formulario.puestoTrabajo} onChange={(event) => actualizarCampo('puestoTrabajo', event.target.value)} required maxLength={120} />
          </label>
          <label className="employment-field employment-field-wide">
            <span>Descripción del empleo</span>
            <textarea value={formulario.descripcion} onChange={(event) => actualizarCampo('descripcion', event.target.value)} required rows={4} />
          </label>
          <label className="employment-field">
            <span>Prestaciones</span>
            <textarea value={formulario.prestaciones} onChange={(event) => actualizarCampo('prestaciones', event.target.value)} required rows={3} />
          </label>
          <label className="employment-field">
            <span>Áreas de oportunidad</span>
            <textarea value={formulario.areasOportunidad} onChange={(event) => actualizarCampo('areasOportunidad', event.target.value)} required rows={3} />
          </label>

          <fieldset className="employment-careers employment-field-wide">
            <legend>Carreras a las que va dirigida</legend>
            <div className="employment-career-options">
              {carrerasDisponibles.map((career) => (
                <label key={career} className="employment-career-option">
                  <input
                    type="checkbox"
                    checked={formulario.carrerasDirigidas.includes(career)}
                    onChange={() => alternarCarrera(career)}
                  />
                  <span>{career}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && <p className="employment-message employment-error employment-field-wide">{error}</p>}
          {statusMsg && <p className="employment-message employment-success employment-field-wide">{statusMsg}</p>}
          <button className="employment-submit employment-field-wide" type="submit" disabled={saving}>
            {saving ? 'Publicando...' : 'Publicar vacante'}
          </button>
        </form>
      )}

      {!esEmpresa && error && <p className="employment-message employment-error">{error}</p>}
      {loading ? <p className="employment-empty">Cargando vacantes...</p> : empleos.length === 0 ? (
        <p className="employment-empty">{esEmpresa ? 'Aún no has publicado vacantes.' : 'No hay vacantes para tu carrera por el momento.'}</p>
      ) : (
        <div className="employment-list">
          {empleos.map((empleo) => (
            <article className="employment-item" key={empleo.id}>
              <div className="employment-item-header">
                <div>
                  <p className="employment-company">{esEmpresa ? 'Tu empresa' : empleo.empresas?.nombre || 'Empresa'}</p>
                  <h3>{empleo.nombre_empleo}</h3>
                  <p className="employment-position">{empleo.puesto_trabajo}</p>
                </div>
                {esEmpresa && (
                  <button className="employment-delete" type="button" onClick={() => eliminarEmpleo(empleo.id)} aria-label={`Eliminar ${empleo.nombre_empleo}`} title="Eliminar vacante">
                    Eliminar
                  </button>
                )}
              </div>
              <p className="employment-description">{empleo.descripcion}</p>
              <div className="employment-details">
                <div><strong>Prestaciones</strong><p>{empleo.prestaciones}</p></div>
                <div><strong>Áreas de oportunidad</strong><p>{empleo.areas_oportunidad}</p></div>
              </div>
              <div className="employment-tags">
                {(empleo.carreras_dirigidas || []).map((careerName) => <span key={careerName}>{careerName}</span>)}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}