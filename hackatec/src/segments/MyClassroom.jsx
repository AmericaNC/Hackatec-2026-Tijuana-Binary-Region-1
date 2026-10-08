import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import ActivityLog from '../components/ActivityLog';
import AiContentNotice from '../components/AiContentNotice';
import './MyClassroom.css';

function getPlanWeeks(plan) {
  return Array.isArray(plan?.planSemanal) ? plan.planSemanal : [];
}

function getPlanTitle(plan) {
  if (plan.origen === 'laboral') {
    return `Vacante · ${plan.plan?.vacante?.puesto_trabajo || plan.plan?.vacante?.nombre_empleo || 'Plan de mejora'}`;
  }
  return `Periodo ${plan.periodo}`;
}

export default function MyClassroom({ session, onOpenExam }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [creatingTasks, setCreatingTasks] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      setLoading(true);
      setError('');

      try {
        if (!userId) throw new Error('Inicia sesión para consultar tus planes.');

        const planRows = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: plansError } = await supabase
            .from('planes_estudio')
            .select('id, alumno_id, periodo, origen, empleo_id, plan, calificaciones, created_at, updated_at')
            .eq('alumno_id', userId)
            .order('created_at', { ascending: false })
            .range(from, from + 999);

          if (plansError) throw new Error(`No se pudieron consultar tus planes: ${plansError.message}`);
          planRows.push(...(data || []));
          if (!data || data.length < 1000) break;
        }

        const planIds = new Set(planRows.map(({ id }) => id));
        const tasksByPlan = {};
        if (planIds.size) {
          for (let from = 0; ; from += 1000) {
            const { data: tasks, error: tasksError } = await supabase
              .from('tareas')
              .select('id, plan_estudio_id, periodo, semana, titulo, descripcion, materia, prioridad, duracion_minutos, estado, intentos_examen, ultimo_puntaje, created_at')
              .eq('alumno_id', userId)
              .order('semana', { ascending: true })
              .range(from, from + 999);

            if (tasksError) {
              throw new Error(`No se pudieron consultar las tareas guardadas: ${tasksError.message}`);
            }
            for (const task of tasks || []) {
              if (!planIds.has(task.plan_estudio_id)) continue;
              tasksByPlan[task.plan_estudio_id] ||= [];
              tasksByPlan[task.plan_estudio_id].push(task);
            }
            if (!tasks || tasks.length < 1000) break;
          }
        }

        if (isCurrent) {
          const loadedPlans = planRows.map((plan) => ({
            ...plan,
            tareas: tasksByPlan[plan.id] || [],
          }));
          setPlans(loadedPlans);
          setSelectedPlanId((currentId) => (
            loadedPlans.some(({ id }) => String(id) === currentId)
              ? currentId
              : String(loadedPlans[0]?.id || '')
          ));
        }
      } catch (loadError) {
        if (isCurrent) {
          console.error('Error al cargar planes de estudio:', loadError);
          setError(loadError.message || 'No se pudieron cargar tus planes de estudio.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadPlans();
    return () => { isCurrent = false; };
  }, [userId]);

  const selectedPlan = useMemo(
    () => plans.find(({ id }) => String(id) === selectedPlanId) || null,
    [plans, selectedPlanId],
  );

  const allTasks = plans.flatMap(({ tareas }) => tareas);
  const completedTasks = allTasks.filter(({ estado }) => estado === 'completada').length;
  const progress = allTasks.length ? Math.round((completedTasks / allTasks.length) * 100) : 0;

  const createTasks = async () => {
    if (!selectedPlan) return;
    setCreatingTasks(true);
    setTaskError('');

    try {
      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!activeSession?.access_token) throw new Error('Inicia sesión para crear tareas.');

      const response = await fetch('/api/study-plan-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudieron crear las tareas.');
      if (!Array.isArray(result.tareas) || result.tareas.length === 0) {
        throw new Error('El servicio no devolvió tareas para guardar.');
      }

      setPlans((current) => current.map((plan) => (
        plan.id === selectedPlan.id ? { ...plan, tareas: result.tareas } : plan
      )));
    } catch (createError) {
      console.error('Error al crear tareas con IA:', createError);
      setTaskError(createError.message || 'No se pudieron crear las tareas.');
    } finally {
      setCreatingTasks(false);
    }
  };

  const selectedTasks = selectedPlan?.tareas || [];

  if (loading) {
    return <main className="classroom-message" role="status">Cargando tus planes de estudio...</main>;
  }

  return (
    <main className="classroom-container">
      <aside className="classroom-col-left">
        <section className="classroom-panel progress-panel">
          <h2>Progreso de tareas</h2>
          <div
            className="progress-bar-wrapper"
            role="progressbar"
            aria-label="Tareas completadas"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progress}
          >
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="due-text">
            {completedTasks} de {allTasks.length} tareas completadas · {progress}%
          </p>
        </section>

        <section className="classroom-panel log-panel">
          <ActivityLog userId={userId} />
        </section>
      </aside>

      <section className="classroom-col-center" aria-labelledby="classroom-title">
        <div className="classroom-panel plans-panel">
          <header className="classroom-section-heading">
            <div>
              <p className="classroom-eyebrow">Tu ruta de aprendizaje</p>
              <h1 id="classroom-title">Mis planes de estudio</h1>
            </div>
            <span className="classroom-plan-count">{plans.length} {plans.length === 1 ? 'plan' : 'planes'}</span>
          </header>

          {error && <p className="classroom-error" role="alert">{error}</p>}
          {!error && plans.length === 0 && (
            <div className="classroom-empty">
              <h2>Aún no tienes planes guardados</h2>
              <p>Registra tus calificaciones y genera un plan desde “Temarios y calificaciones”.</p>
            </div>
          )}

          <div className="classroom-plan-list">
            {plans.map((plan) => {
              const weeks = getPlanWeeks(plan.plan);
              const priorities = Array.isArray(plan.plan?.prioridades) ? plan.plan.prioridades : [];
              const recommendations = Array.isArray(plan.plan?.recomendacionesGenerales)
                ? plan.plan.recomendacionesGenerales
                : [];
              const planTasks = plan.tareas || [];
              const planTasksByWeek = planTasks.reduce((weeksByNumber, task) => {
                weeksByNumber[task.semana] ||= [];
                weeksByNumber[task.semana].push(task);
                return weeksByNumber;
              }, {});
              const isSelected = String(plan.id) === selectedPlanId;

              return (
                <article
                  key={plan.id}
                  className={`classroom-plan-card${isSelected ? ' is-selected' : ''}`}
                  aria-labelledby={`plan-title-${plan.id}`}
                >
                  <button
                    type="button"
                    className="classroom-plan-select"
                    onClick={() => setSelectedPlanId(String(plan.id))}
                    aria-pressed={isSelected}
                  >
                    <span className="classroom-plan-heading">
                      <small className="classroom-plan-label">
                        {plan.origen === 'laboral' ? 'Plan de mejora profesional' : 'Plan académico'}
                      </small>
                      <strong id={`plan-title-${plan.id}`}>{getPlanTitle(plan)}</strong>
                    </span>
                    <span className="classroom-plan-meta">
                      <small className="classroom-plan-date">
                        Actualizado {new Date(plan.updated_at || plan.created_at).toLocaleDateString('es-MX')}
                      </small>
                      <span className="classroom-plan-task-count">
                        <strong>{planTasks.length}</strong>
                        {planTasks.length === 1 ? ' tarea' : ' tareas'}
                      </span>
                      <span className="classroom-plan-chevron" aria-hidden="true">›</span>
                    </span>
                  </button>
                  <p className="classroom-summary">{plan.plan?.resumen || 'Este plan no contiene un resumen.'}</p>

                  <details className="classroom-plan-details">
                    <summary>Ver plan completo</summary>
                    <h3>{plan.origen === 'laboral' ? 'Competencias por fortalecer' : 'Prioridades académicas'}</h3>
                    {priorities.length ? (
                      <div className="classroom-priority-list">
                        {priorities.map((item, index) => (
                          <article className="classroom-priority-card" key={`${item.materia}-${index}`}>
                            <div className="classroom-priority-heading">
                              <strong>{item.materia}</strong>
                              <span className={`classroom-priority-badge priority-${String(item.prioridad).toLowerCase()}`}>
                                {item.prioridad}
                              </span>
                            </div>
                            <p className="classroom-priority-grade">
                              {plan.origen === 'laboral' ? 'Progreso estimado' : 'Calificación'}: {item.calificacion}
                              {plan.origen === 'laboral' ? '%' : ''}
                            </p>
                            <p>{item.recomendacion}</p>
                          </article>
                        ))}
                      </div>
                    ) : <p>No hay prioridades registradas.</p>}

                    <h3>Plan semanal</h3>
                    {weeks.length ? weeks.map((week) => (
                      <section key={week.semana} className="classroom-week">
                        <h4>Semana {week.semana}: {week.objetivo}</h4>
                        <div className="classroom-activity-list">
                          {(week.actividades || []).map((activity, index) => (
                            <article className="classroom-activity-card" key={`${week.semana}-${index}`}>
                              <span className="classroom-activity-number">{String(index + 1).padStart(2, '0')}</span>
                              <p>{activity}</p>
                            </article>
                          ))}
                        </div>
                        {planTasksByWeek[week.semana]?.length > 0 && (
                          <div className="classroom-tasks">
                            <h5>Tareas creadas para esta semana</h5>
                            {planTasksByWeek[week.semana].map((task) => (
                              <article className="classroom-task" key={task.id}>
                                <strong>{task.titulo}</strong>
                                <p>{task.descripcion}</p>
                                <small>
                                  {task.materia} · Prioridad {task.prioridad} · {task.duracion_minutos} min · {task.estado}
                                </small>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>
                    )) : <p>No hay semanas incluidas en este plan.</p>}

                    <h3>Recomendaciones generales</h3>
                    {recommendations.length ? (
                      <div className="classroom-recommendation-list">
                        {recommendations.map((item, index) => (
                          <article className="classroom-recommendation-card" key={`${index}-${item}`}>
                            <span aria-hidden="true">✓</span>
                            <p>{item}</p>
                          </article>
                        ))}
                      </div>
                    ) : <p>No hay recomendaciones registradas.</p>}
                  </details>
                  <AiContentNotice />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="classroom-col-right">
        <section className="classroom-panel classroom-task-panel">
          <p className="classroom-eyebrow">Asistente académico</p>
          <h2>AI Catalyst</h2>
          <label className="classroom-select-label" htmlFor="selected-study-plan">
            Plan de estudio
            <select
              id="selected-study-plan"
              value={selectedPlanId}
              onChange={(event) => {
                setSelectedPlanId(event.target.value);
                setTaskError('');
              }}
              disabled={plans.length === 0 || creatingTasks}
            >
              {plans.length === 0 && <option value="">No hay planes disponibles</option>}
              {plans.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>{getPlanTitle(plan)}</option>
              ))}
            </select>
          </label>

          {selectedPlan && (
            <>
              <p className="classroom-selected-summary">
                {getPlanTitle(selectedPlan)} · {selectedTasks.length} {selectedTasks.length === 1 ? 'tarea guardada' : 'tareas guardadas'}
              </p>
              <button
                className="edit-btn primary-btn"
                type="button"
                onClick={createTasks}
                disabled={creatingTasks || selectedTasks.length > 0}
              >
                <span className="info-icon" aria-hidden="true">✦</span>
                {creatingTasks
                  ? 'Generando tareas...'
                  : selectedTasks.length
                    ? 'Tareas ya creadas'
                    : 'Crear tareas por IA'}
              </button>
            </>
          )}

          {taskError && <p className="classroom-error" role="alert">{taskError}</p>}
          {creatingTasks && <p className="classroom-status" role="status">Gemini está convirtiendo tu plan en tareas...</p>}
          <p className="classroom-hint">
            Las tareas se guardan en tu cuenta y se muestran dentro de las semanas del plan.
          </p>
        </section>

        <section className="classroom-panel classroom-task-panel">
          <h2>Tareas del plan seleccionado</h2>
          {!selectedPlan && <p>Selecciona un plan para consultar sus tareas.</p>}
          {selectedPlan && selectedTasks.length === 0 && <p>Aún no se han creado tareas para este plan.</p>}
          {selectedPlan && selectedTasks.length > 0 && (
            <ul className="classroom-task-list">
              {selectedTasks.map((task) => {
                const attempts = Number(task.intentos_examen) || 0;
                return (
                  <li key={task.id}>
                    <strong>{task.titulo}</strong>
                    <span>Semana {task.semana} · {task.materia} · {task.estado.replace('_', ' ')}</span>
                    <p className="classroom-task-description">{task.descripcion}</p>
                    <span>Intentos: {attempts}/2{task.ultimo_puntaje !== null && task.ultimo_puntaje !== undefined ? ` · Último puntaje: ${task.ultimo_puntaje}%` : ''}</span>
                    {task.estado !== 'completada' && (
                      <button
                        className="edit-btn primary-btn classroom-exam-button"
                        type="button"
                        onClick={() => onOpenExam?.(task.id)}
                        disabled={attempts >= 2}
                      >
                        {attempts >= 2 ? 'Intentos agotados' : attempts ? 'Continuar examen' : 'Resolver examen'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {selectedPlan && selectedTasks.length > 0 && <AiContentNotice />}
        </section>
      </aside>
    </main>
  );
}
