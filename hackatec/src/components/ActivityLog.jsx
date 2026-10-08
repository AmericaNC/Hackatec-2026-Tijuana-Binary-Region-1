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
    if (!userId) return
    setCargando(true)
    const { data, error: queryError } = await supabase
      .from('activity_logs')
      .select('id, actor_name, affected_name, description, created_at')
      .order('created_at', { ascending: false })
      .limit(7)

    if (queryError) {
      setError(`No se pudo cargar la actividad: ${queryError.message}`)
    } else {
      setError('')
      setEventos(data || [])
    }
    setCargando(false)
  }, [userId])

  useEffect(() => {
    cargarEventos()
    window.addEventListener('activity-log-updated', cargarEventos)
    return () => window.removeEventListener('activity-log-updated', cargarEventos)
  }, [cargarEventos])

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