import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Bell, BriefcaseBusiness, UsersRound, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { registrarActividad } from '../utils/activityLogs'
import EmployerJobsPage from './EmployerJobsPage'
import EmployerCandidatesPage from './EmployerCandidatesPage'
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
  const [postulaciones, setPostulaciones] = useState([])
  const [postulacionesLoading, setPostulacionesLoading] = useState(false)
  const [postulacionesError, setPostulacionesError] = useState('')
  const [nuevasPostulaciones, setNuevasPostulaciones] = useState([])
  const postulacionesVistas = useRef(null)
  const [filtroCandidato, setFiltroCandidato] = useState('')
  const [filtroVacante, setFiltroVacante] = useState('')
  const [busquedaCandidato, setBusquedaCandidato] = useState('')
  const [vistaEmpresa, setVistaEmpresa] = useState('vacantes')
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

  useEffect(() => {
    if (!esEmpresa || !user?.id) {
      setPostulaciones([])
      setPostulacionesLoading(false)
      postulacionesVistas.current = null
      return undefined
    }

    let isCurrent = true
    let requestInProgress = false

    async function cargarPostulaciones() {
      if (requestInProgress) return
      requestInProgress = true
      setPostulacionesLoading(true)
      setPostulacionesError('')

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`)
        if (!session?.access_token) throw new Error('Inicia sesión para consultar postulaciones.')

        const response = await fetch('/api/employer-applications', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las postulaciones.')

        if (isCurrent) {
          const incomingApplications = result.postulaciones || []
          const incomingIds = new Set(incomingApplications.map(({ id }) => id))
          if (postulacionesVistas.current) {
            const newApplications = incomingApplications.filter(({ id }) => !postulacionesVistas.current.has(id))
            if (newApplications.length) {
              setNuevasPostulaciones((current) => {
                const merged = new Map([...current, ...newApplications].map((application) => [application.id, application]))
                return [...merged.values()].slice(0, 5)
              })
            }
          }
          postulacionesVistas.current = incomingIds
          setPostulaciones(incomingApplications)
        }
      } catch (loadError) {
        if (isCurrent) setPostulacionesError(loadError.message || 'No se pudieron cargar las postulaciones.')
      } finally {
        if (isCurrent) setPostulacionesLoading(false)
        requestInProgress = false
      }
    }

    cargarPostulaciones()
    const intervalId = window.setInterval(cargarPostulaciones, 30000)
    return () => {
      isCurrent = false
      window.clearInterval(intervalId)
    }
  }, [user?.id, esEmpresa])

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
          <h2>{esEmpresa ? 'Panel de empleador' : 'Vacantes para tu carrera'}</h2>
        </div>
        {!esEmpresa && carrera && <span className="employment-career-tag">{carrera}</span>}
      </header>

      {esEmpresa && nuevasPostulaciones.length > 0 && (
        <aside className="employment-application-notice" role="status" aria-live="polite">
          <span className="employment-application-notice-icon"><Bell size={18} aria-hidden="true" /></span>
          <div className="employment-application-notice-copy">
            <strong>{nuevasPostulaciones.length === 1 ? 'Nueva postulación recibida' : `${nuevasPostulaciones.length} nuevas postulaciones`}</strong>
            <span>
              {nuevasPostulaciones.length === 1
                ? `${nuevasPostulaciones[0].alumnoNombre} aplicó a ${nuevasPostulaciones[0].empleoNombre}.`
                : `${nuevasPostulaciones[0].alumnoNombre} y más personas aplicaron a tus vacantes.`}
            </span>
          </div>
          <button
            className="employment-application-notice-action"
            type="button"
            onClick={() => setVistaEmpresa('talento')}
          >
            Ver <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            className="employment-application-notice-dismiss"
            type="button"
            aria-label="Cerrar aviso de postulaciones"
            onClick={() => setNuevasPostulaciones([])}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </aside>
      )}

      {esEmpresa && (
        <nav className="employment-tabs" aria-label="Secciones del panel de empleador">
          <button
            className={`employment-tab${vistaEmpresa === 'vacantes' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={vistaEmpresa === 'vacantes'}
            onClick={() => setVistaEmpresa('vacantes')}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            <span>Vacantes</span>
            <small>{empleos.length}</small>
          </button>
          <button
            className={`employment-tab${vistaEmpresa === 'talento' ? ' is-active' : ''}`}
            type="button"
            aria-pressed={vistaEmpresa === 'talento'}
            onClick={() => setVistaEmpresa('talento')}
          >
            <UsersRound size={17} aria-hidden="true" />
            <span>Talento</span>
            <small>{postulacionesLoading ? '...' : postulaciones.length}</small>
          </button>
        </nav>
      )}

      {(!esEmpresa || vistaEmpresa === 'vacantes') && (
        <EmployerJobsPage
          esEmpresa={esEmpresa}
          formulario={formulario}
          actualizarCampo={actualizarCampo}
          alternarCarrera={alternarCarrera}
          publicarEmpleo={publicarEmpleo}
          error={error}
          statusMsg={statusMsg}
          saving={saving}
          loading={loading}
          empleos={empleos}
          eliminarEmpleo={eliminarEmpleo}
        />
      )}

      {esEmpresa && vistaEmpresa === 'talento' && (
        <EmployerCandidatesPage
          candidatosFiltrados={candidatosFiltrados}
          candidatosLoading={candidatosLoading}
          candidatosError={candidatosError}
          postulaciones={postulaciones}
          postulacionesLoading={postulacionesLoading}
          postulacionesError={postulacionesError}
          filtroCandidato={filtroCandidato}
          setFiltroCandidato={setFiltroCandidato}
          filtroVacante={filtroVacante}
          setFiltroVacante={setFiltroVacante}
          busquedaCandidato={busquedaCandidato}
          setBusquedaCandidato={setBusquedaCandidato}
          empleos={empleos}
        />
      )}

    </section>
  )
}