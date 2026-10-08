import { carrerasDisponibles } from '../constants/carreras'
import { BriefcaseBusiness, GraduationCap, Search, UsersRound } from 'lucide-react'

export default function EmployerCandidatesPage({
  candidatosFiltrados,
  candidatosLoading,
  candidatosError,
  filtroCandidato,
  setFiltroCandidato,
  filtroVacante,
  setFiltroVacante,
  busquedaCandidato,
  setBusquedaCandidato,
  empleos,
}) {
  return (
    <section className="employment-candidates" aria-labelledby="employment-candidates-title">
      <header className="employment-candidates-heading">
        <div>
          <p className="employment-eyebrow">Talento relacionado</p>
          <h2 id="employment-candidates-title">Estudiantes afines</h2>
        </div>
        {!candidatosLoading && (
          <span className="employment-results-count">
            <UsersRound size={15} aria-hidden="true" />
            {candidatosFiltrados.length} perfiles
          </span>
        )}
      </header>

      <div className="employment-candidate-filters">
        <label className="employment-field">
          <span>Carrera</span>
          <select value={filtroCandidato} onChange={(event) => setFiltroCandidato(event.target.value)}>
            <option value="">Carreras de mis vacantes</option>
            {carrerasDisponibles.map((career) => <option value={career} key={career}>{career}</option>)}
          </select>
        </label>
        <label className="employment-field">
          <span>Vacante</span>
          <select value={filtroVacante} onChange={(event) => setFiltroVacante(event.target.value)}>
            <option value="">Todas las vacantes</option>
            {empleos.map((empleo) => (
              <option value={String(empleo.id)} key={empleo.id}>{empleo.nombre_empleo}</option>
            ))}
          </select>
        </label>
        <label className="employment-field employment-candidate-search">
          <span>Buscar perfil o competencia</span>
            <span className="employment-search-control">
              <Search size={17} aria-hidden="true" />
              <input
                type="search"
                value={busquedaCandidato}
                onChange={(event) => setBusquedaCandidato(event.target.value)}
                placeholder="Nombre, carrera o competencia"
              />
            </span>
        </label>
      </div>

      {candidatosError && <p className="employment-message employment-error" role="alert">{candidatosError}</p>}
      {candidatosLoading ? (
        <p className="employment-empty" role="status">Buscando estudiantes afines...</p>
      ) : candidatosFiltrados.length === 0 ? (
        <p className="employment-empty">
          {candidatosError
            ? 'No se pudieron mostrar perfiles en este momento.'
            : filtroCandidato || empleos.length
              ? 'No hay estudiantes activos que coincidan con esos filtros.'
              : 'Selecciona una carrera para buscar perfiles o publica una vacante para ver coincidencias automáticamente.'}
        </p>
      ) : (
        <div className="employment-candidate-list">
          {candidatosFiltrados.map((estudiante) => (
            <article className="employment-candidate" key={estudiante.id}>
              <div className="employment-candidate-header">
                <div>
                  <span className="employment-candidate-avatar"><GraduationCap size={18} aria-hidden="true" /></span>
                  <div className="employment-candidate-identity">
                    <h3>{estudiante.nombre}</h3>
                    <p>{estudiante.carrera}</p>
                  </div>
                </div>
                <span>{estudiante.vacantesAfin.length ? 'Afin a vacante' : 'Búsqueda por carrera'}</span>
              </div>
              {estudiante.competencias.length > 0 ? (
                <div className="employment-candidate-skills">
                  <strong>Competencias curriculares</strong>
                  <ul>
                    {estudiante.competencias.slice(0, 4).map((competencia) => (
                      <li key={competencia.nombre}>
                        <span>{competencia.nombre}</span>
                        <small>Avance estimado: {competencia.progreso_pct}%</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="employment-candidate-no-skills">Aún no hay competencias curriculares registradas.</p>}
              {estudiante.vacantesAfin.length > 0 && (
                <div className="employment-candidate-matches">
                  {estudiante.vacantesAfin.map((vacante) => (
                    <div className="employment-candidate-match" key={vacante.id}>
                      <span className="employment-candidate-match-title">
                        <BriefcaseBusiness size={13} aria-hidden="true" />
                        {vacante.nombre_empleo} · {vacante.puesto_trabajo}
                      </span>
                      {vacante.enPreparacion && (
                        <span className="employment-candidate-preparing">
                          <GraduationCap size={13} aria-hidden="true" />
                          Preparándose para esta vacante
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}