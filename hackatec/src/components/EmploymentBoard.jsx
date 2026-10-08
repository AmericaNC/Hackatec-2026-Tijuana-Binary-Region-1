import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { carrerasDisponibles } from '../constants/carreras'
import { registrarActividad } from '../utils/activityLogs'
import './EmploymentBoard.css'

const emptyForm = {
  nombreEmpleo: '',
  puestoTrabajo: '',
  descripcion: '',
  prestaciones: '',
  areasOportunidad: '',
  carrerasDirigidas: []
}

export default function EmploymentBoard({ user, tipoCuenta, carrera }) {
  const [empleos, setEmpleos] = useState([])
  const [formulario, setFormulario] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [candidatos, setCandidatos] = useState([])
  const [candidatosLoading, setCandidatosLoading] = useState(false)
  const [candidatosError, setCandidatosError] = useState('')
  const [filtroCandidato, setFiltroCandidato] = useState('')
  const [filtroVacante, setFiltroVacante] = useState('')
  const [busquedaCandidato, setBusquedaCandidato] = useState('')
  const esEmpresa = tipoCuenta === 'empresa'

  useEffect(() => {
    let isCurrent = true

    async function cargarEmpleos() {
      setLoading(true)
      setError('')
      let query = supabase
        .from('empleos')
        .select('*, empresas(nombre)')
        .order('created_at', { ascending: false })

      if (esEmpresa) {
        query = query.eq('empresa_id', user.id)
      } else {
        if (!carrera) {
          setEmpleos([])
          setLoading(false)
          return
        }
        query = query.contains('carreras_dirigidas', [carrera])
      }

      const { data, error: queryError } = await query
      if (!isCurrent) return
      if (queryError) {
        setError(`No se pudieron cargar las vacantes: ${queryError.message}`)
      } else {
        setEmpleos(data || [])
      }
      setLoading(false)
    }

    if (user?.id) cargarEmpleos()
    return () => { isCurrent = false }
  }, [user?.id, esEmpresa, carrera, refresh])

  useEffect(() => {
    if (!esEmpresa || !user?.id) {
      setCandidatos([])
      setCandidatosLoading(false)
      return undefined
    }

    let isCurrent = true

    async function cargarCandidatos() {
      setCandidatosLoading(true)
      setCandidatosError('')
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`)
        if (!session?.access_token) throw new Error('Inicia sesión para consultar candidatos.')

        const params = new URLSearchParams()
        if (filtroCandidato) params.set('carrera', filtroCandidato)
        const response = await fetch(`/api/employer-candidates?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los candidatos.')

        if (isCurrent) setCandidatos(result.candidatos || [])
      } catch (loadError) {
        if (isCurrent) setCandidatosError(loadError.message || 'No se pudieron cargar los candidatos.')
      } finally {
        if (isCurrent) setCandidatosLoading(false)
      }
    }

    cargarCandidatos()
    return () => { isCurrent = false }
  }, [user?.id, esEmpresa, filtroCandidato, refresh])

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
  }

  const alternarCarrera = (carreraSeleccionada) => {
    setFormulario((actual) => {
      const seleccionadas = actual.carrerasDirigidas.includes(carreraSeleccionada)
        ? actual.carrerasDirigidas.filter((item) => item !== carreraSeleccionada)
        : [...actual.carrerasDirigidas, carreraSeleccionada]
      return { ...actual, carrerasDirigidas: seleccionadas }
    })
  }

  const publicarEmpleo = async (event) => {
    event.preventDefault()
    if (formulario.carrerasDirigidas.length === 0) {
      setError('Selecciona al menos una carrera para la vacante.')
      return
    }

    setSaving(true)
    setError('')
    setStatusMsg('')
    const { error: insertError } = await supabase.from('empleos').insert({
      empresa_id: user.id,
      nombre_empleo: formulario.nombreEmpleo.trim(),
      puesto_trabajo: formulario.puestoTrabajo.trim(),
      descripcion: formulario.descripcion.trim(),
      prestaciones: formulario.prestaciones.trim(),
      areas_oportunidad: formulario.areasOportunidad.trim(),
      carreras_dirigidas: formulario.carrerasDirigidas
    })

    if (insertError) {
      setError(`No se pudo publicar el empleo: ${insertError.message}`)
    } else {
      setFormulario(emptyForm)
      setStatusMsg('La vacante se publicó correctamente.')
      await registrarActividad({
        eventType: 'job_posted',
        affectedUserId: null,
        affectedName: `Estudiantes de ${formulario.carrerasDirigidas.join(', ')}`,
        audienceCareers: formulario.carrerasDirigidas,
        description: `Publicó la vacante "${formulario.nombreEmpleo.trim()}" para el puesto "${formulario.puestoTrabajo.trim()}".`,
      })
      setRefresh((actual) => actual + 1)
    }
    setSaving(false)
  }

  const eliminarEmpleo = async (empleoId) => {
    const empleoEliminado = empleos.find((empleo) => empleo.id === empleoId)
    const { error: deleteError } = await supabase
      .from('empleos')
      .delete()
      .eq('id', empleoId)
    if (deleteError) {
      setError(`No se pudo eliminar la vacante: ${deleteError.message}`)
    } else {
      setEmpleos((actual) => actual.filter((empleo) => empleo.id !== empleoId))
      setRefresh((actual) => actual + 1)
      if (empleoEliminado) {
        await registrarActividad({
          eventType: 'job_deleted',
          affectedUserId: null,
          affectedName: `Estudiantes de ${(empleoEliminado.carreras_dirigidas || []).join(', ')}`,
          audienceCareers: empleoEliminado.carreras_dirigidas || [],
          description: `Retiró la vacante "${empleoEliminado.nombre_empleo}".`,
        })
      }
    }
  }

  const candidatosFiltrados = candidatos.filter((estudiante) => {
    if (filtroVacante && !estudiante.vacantesAfin.some(({ id }) => String(id) === filtroVacante)) {
      return false
    }
    const term = busquedaCandidato.trim().toLocaleLowerCase('es-MX')
    if (!term) return true
    const searchableText = [
      estudiante.nombre,
      estudiante.carrera,
      ...estudiante.competencias.flatMap(({ nombre, descripcion }) => [nombre, descripcion]),
    ].join(' ').toLocaleLowerCase('es-MX')
    return searchableText.includes(term)
  })

  return (
    <section className="employment-board">
      <header className="employment-heading">
        <div>
          <p className="employment-eyebrow">Oportunidades profesionales</p>
          <h2>{esEmpresa ? 'Publicar un empleo' : 'Vacantes para tu carrera'}</h2>
        </div>
        {!esEmpresa && carrera && <span className="employment-career-tag">{carrera}</span>}
      </header>

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
              {carrerasDisponibles.map((opcionCarrera) => (
                <label key={opcionCarrera} className="employment-career-option">
                  <input
                    type="checkbox"
                    checked={formulario.carrerasDirigidas.includes(opcionCarrera)}
                    onChange={() => alternarCarrera(opcionCarrera)}
                  />
                  <span>{opcionCarrera}</span>
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
                {empleo.carreras_dirigidas.map((nombreCarrera) => <span key={nombreCarrera}>{nombreCarrera}</span>)}
              </div>
            </article>
          ))}
        </div>
      )}

      {esEmpresa && (
        <section className="employment-candidates" aria-labelledby="employment-candidates-title">
          <header className="employment-candidates-heading">
            <div>
              <p className="employment-eyebrow">Talento relacionado</p>
              <h2 id="employment-candidates-title">Estudiantes afines</h2>
            </div>
            {!candidatosLoading && <span>{candidatosFiltrados.length} perfiles</span>}
          </header>

          <div className="employment-candidate-filters">
            <label className="employment-field">
              <span>Carrera</span>
              <select value={filtroCandidato} onChange={(event) => setFiltroCandidato(event.target.value)}>
                <option value="">Carreras de mis vacantes</option>
                {carrerasDisponibles.map((opcionCarrera) => (
                  <option value={opcionCarrera} key={opcionCarrera}>{opcionCarrera}</option>
                ))}
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
              <input
                type="search"
                value={busquedaCandidato}
                onChange={(event) => setBusquedaCandidato(event.target.value)}
                placeholder="Nombre, carrera o competencia"
              />
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
                      <h3>{estudiante.nombre}</h3>
                      <p>{estudiante.carrera}</p>
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
                        <span key={vacante.id}>{vacante.nombre_empleo} · {vacante.puesto_trabajo}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}