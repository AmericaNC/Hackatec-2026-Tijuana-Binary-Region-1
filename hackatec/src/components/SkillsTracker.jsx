import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { resumirProgresoSkills } from '../utils/skills.js'
import './SkillsTracker.css'

export default function SkillsTracker({ competenciasCurriculares, refreshKey }) {
  const [skills, setSkills] = useState([])
  const [userId, setUserId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [porcentaje, setPorcentaje] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function cargarSkills() {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        if (isCurrent) {
          setError('Inicia sesión para consultar tus skills.')
          setLoading(false)
        }
        return
      }

      const { data, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .eq('alumno_id', user.id)
        .order('nombre')
      if (!isCurrent) return
      setUserId(user.id)
      if (skillsError) setError(`No se pudieron cargar tus skills: ${skillsError.message}`)
      else setSkills(data || [])
      setLoading(false)
    }

    cargarSkills()
    return () => { isCurrent = false }
  }, [refreshKey])

  const progresoCurricular = resumirProgresoSkills(competenciasCurriculares, skills)
  const skillsPersonales = skills.filter((skill) => skill.origen === 'personal')

  const agregarSkill = async (event) => {
    event.preventDefault()
    if (!userId) return
    setSaving(true)
    setError('')
    setStatus('')

    const { data, error: insertError } = await supabase
      .from('skills')
      .insert({
        alumno_id: userId,
        skill_key: `personal:${crypto.randomUUID()}`,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        progreso_pct: Number(porcentaje),
        origen: 'personal',
      })
      .select('*')
      .single()

    if (insertError) setError(`No se pudo guardar la skill: ${insertError.message}`)
    else {
      setSkills((actual) => [...actual, data].sort((left, right) => left.nombre.localeCompare(right.nombre)))
      setNombre('')
      setDescripcion('')
      setPorcentaje('0')
      setStatus('Skill guardada. La IA la considerará al generar tu próximo plan.')
    }
    setSaving(false)
  }

  const actualizarSkill = async (skill) => {
    setError('')
    const { error: updateError } = await supabase
      .from('skills')
      .update({ progreso_pct: skill.progreso_pct, updated_at: new Date().toISOString() })
      .eq('id', skill.id)
      .eq('alumno_id', userId)

    if (updateError) setError(`No se pudo actualizar la skill: ${updateError.message}`)
    else setStatus('Autoevaluación actualizada.')
  }

  const eliminarSkill = async (skillId) => {
    const { error: deleteError } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId)
      .eq('alumno_id', userId)
    if (deleteError) setError(`No se pudo eliminar la skill: ${deleteError.message}`)
    else setSkills((actual) => actual.filter((skill) => skill.id !== skillId))
  }

  return (
    <section className="skills-tracker">
      <header className="skills-heading">
        <div>
          <p className="skills-eyebrow">Progreso curricular</p>
          <h4>Mis skills</h4>
        </div>
        <div className="skills-overall" aria-label={`Avance curricular estimado: ${progresoCurricular.porcentaje_general}%`}>
          <strong>{progresoCurricular.porcentaje_general}%</strong>
          <span>avance estimado</span>
        </div>
      </header>
      <p className="skills-note">
        Estimación basada en calificaciones registradas y las competencias de los temarios disponibles.
        El cálculo incluye {progresoCurricular.competencias_totales} competencias curriculares disponibles.
      </p>

      <form className="skills-form" onSubmit={agregarSkill}>
        <label>
          Skill personal
          <input value={nombre} onChange={(event) => setNombre(event.target.value)} required maxLength={120} placeholder="Ej. Análisis de datos" />
        </label>
        <label>
          Descripción o evidencia
          <input value={descripcion} onChange={(event) => setDescripcion(event.target.value)} maxLength={500} placeholder="Proyecto, práctica o conocimiento" />
        </label>
        <label>
          Autoevaluación (%)
          <input type="number" min="0" max="100" value={porcentaje} onChange={(event) => setPorcentaje(event.target.value)} required />
        </label>
        <button type="submit" disabled={saving || !nombre.trim()}>{saving ? 'Guardando...' : 'Agregar skill'}</button>
      </form>

      {error && <p className="skills-message skills-error" role="alert">{error}</p>}
      {status && <p className="skills-message skills-success" role="status">{status}</p>}
      {loading ? <p>Cargando skills...</p> : (
        <>
          <h5>Competencias del plan</h5>
          <div className="skills-list">
            {competenciasCurriculares.map((competencia) => {
              const skill = skills.find((item) => item.skill_key === competencia.skill_key)
              const value = skill?.progreso_pct || 0
              return (
                <article className="skills-row" key={competencia.skill_key}>
                  <div className="skills-row-title">
                    <strong>{competencia.nombre}</strong>
                    <span>{value}%</span>
                  </div>
                  <progress max="100" value={value} aria-label={`${competencia.nombre}: ${value}%`} />
                  <small>{competencia.materia_clave} · estimación académica</small>
                </article>
              )
            })}
          </div>

          {skillsPersonales.length > 0 && (
            <>
              <h5>Skills personales</h5>
              <div className="skills-list">
                {skillsPersonales.map((skill) => (
                  <article className="skills-row" key={skill.id}>
                    <div className="skills-row-title">
                      <strong>{skill.nombre}</strong>
                      <label className="skills-rating">
                        <span className="skills-visually-hidden">Porcentaje de {skill.nombre}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={skill.progreso_pct}
                          onChange={(event) => {
                            const value = Math.max(0, Math.min(100, Number(event.target.value)))
                            setSkills((actual) => actual.map((item) => item.id === skill.id ? { ...item, progreso_pct: value } : item))
                          }}
                        />
                        %
                      </label>
                    </div>
                    {skill.descripcion && <p>{skill.descripcion}</p>}
                    <div className="skills-row-actions">
                      <button type="button" onClick={() => actualizarSkill(skill)}>Guardar porcentaje</button>
                      <button type="button" onClick={() => eliminarSkill(skill.id)}>Eliminar</button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}