import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './ActivityLog.css'

const formatearFecha = (fecha) => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(fecha))

export default function ActivityLog({ userId }) {
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargarEventos = useCallback(async () => {
    if (!userId) {
      setEventos([])
      setError('No se pudo identificar al usuario para consultar la actividad.')
      setCargando(false)
      return
    }

    try {
      const [
        { data: activityRows, error: activityError },
        { data: taskRows, error: tasksError },
      ] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('id, actor_name, affected_name, description, created_at')
          .order('created_at', { ascending: false })
          .limit(7),
        supabase
          .from('tareas')
          .select('id, titulo, materia, periodo, intentos_examen, ultimo_puntaje, updated_at, created_at')
          .eq('alumno_id', userId)
          .gt('intentos_examen', 0)
          .order('updated_at', { ascending: false })
          .limit(7),
      ])

      if (activityError || tasksError) {
        const messages = [
          activityError && `actividad: ${activityError.message}`,
          tasksError && `intentos de examen: ${tasksError.message}`,
        ].filter(Boolean)
        throw new Error(messages.join('; '))
      }

      setError('')
      const activityEvents = (activityRows || []).map((event) => ({
        ...event,
        type: 'activity',
      }))
      const examEvents = (taskRows || []).map((task) => ({
        id: `task-${task.id}`,
        type: 'exam-attempt',
        actor_name: 'Tú',
        affected_name: `${task.materia} · ${task.titulo}`,
        description: `Intento ${task.intentos_examen} de 2${task.ultimo_puntaje !== null
          ? ` · Último puntaje: ${task.ultimo_puntaje}%`
          : ''} · Periodo ${task.periodo}`,
        created_at: task.updated_at || task.created_at,
      }))
      setEventos(
        [...activityEvents, ...examEvents]
          .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
          .slice(0, 7),
      )
    } catch (loadError) {
      console.error('Error al cargar actividad e intentos de examen:', loadError)
      setError(`No se pudo cargar la actividad: ${loadError.message}`)
    } finally {
      setCargando(false)
    }
  }, [userId])

  const refrescarEventos = useCallback(() => {
    setCargando(true)
    cargarEventos()
  }, [cargarEventos])

  useEffect(() => {
    Promise.resolve().then(cargarEventos)
    window.addEventListener('activity-log-updated', refrescarEventos)
    return () => window.removeEventListener('activity-log-updated', refrescarEventos)
  }, [cargarEventos, refrescarEventos])

  return (
    <aside className="activity-log" aria-labelledby="activity-log-title">
      <header className="activity-log-heading">
        <div>
          <p className="activity-log-eyebrow">Registro reciente</p>
          <h2 id="activity-log-title">Actividad</h2>
        </div>
        <span className="activity-log-count">Máximo 7 eventos</span>
      </header>

      {cargando && <p className="activity-log-state">Cargando actividad...</p>}
      {!cargando && error && <p className="activity-log-error" role="alert">{error}</p>}
      {!cargando && !error && eventos.length === 0 && (
        <p className="activity-log-state">Todavía no hay actividad registrada.</p>
      )}
      {!cargando && !error && eventos.length > 0 && (
        <ol className="activity-log-list">
          {eventos.map((evento) => (
            <li className="activity-log-item" key={evento.id}>
              {evento.type === 'exam-attempt' && (
                <span className="activity-log-type">Intento de examen</span>
              )}
              <div className="activity-log-participants">
                <strong>{evento.actor_name}</strong>
                <span aria-hidden="true">→</span>
                <strong>{evento.affected_name}</strong>
              </div>
              <p>{evento.description}</p>
              <time dateTime={evento.created_at}>{formatearFecha(evento.created_at)}</time>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}