import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function MyStudyPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingTaskFor, setCreatingTaskFor] = useState(null);
  const [taskError, setTaskError] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadPlans() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`No se pudo verificar tu sesión: ${authError.message}`);
        if (!user) throw new Error('Inicia sesión para consultar tus planes.');

        const planRows = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: plansError } = await supabase
            .from('planes_estudio')
            .select('id, alumno_id, periodo, plan, calificaciones, created_at, updated_at')
            .eq('alumno_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, from + 999);
          if (plansError) throw new Error(`No se pudieron consultar tus planes: ${plansError.message}`);
          planRows.push(...(data || []));
          if (!data || data.length < 1000) break;
        }

        let tasksByPlan = {};
        if (planRows.length) {
          const planIds = new Set(planRows.map(({ id }) => id));
          for (let from = 0; ; from += 1000) {
            const { data: tasks, error: tasksError } = await supabase
              .from('tareas')
              .select('id, plan_estudio_id, periodo, semana, titulo, descripcion, materia, prioridad, duracion_minutos, estado, created_at')
              .eq('alumno_id', user.id)
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
          setPlans(planRows.map((plan) => ({ ...plan, tareas: tasksByPlan[plan.id] || [] })));
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
  }, []);

  const createTasks = async (planId) => {
    setCreatingTaskFor(planId);
    setTaskError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!session?.access_token) throw new Error('Inicia sesión para crear tareas.');

      const response = await fetch('/api/study-plan-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudieron crear las tareas.');

      setPlans((current) => current.map((plan) => (
        plan.id === planId ? { ...plan, tareas: result.tareas || [] } : plan
      )));
    } catch (createError) {
      console.error('Error al crear tareas con IA:', createError);
      setTaskError(createError.message || 'No se pudieron crear las tareas.');
    } finally {
      setCreatingTaskFor(null);
    }
  };

  if (loading) return <p style={styles.message}>Cargando tus planes de estudio...</p>;

  return (
    <main style={styles.page}>
      <h2>Mis planes de estudio</h2>
      <p>Consulta tus planes por periodo y conviértelos en tareas concretas con ayuda de IA.</p>
      {error && <p role="alert" style={styles.error}>{error}</p>}
      {taskError && <p role="alert" style={styles.error}>{taskError}</p>}
      {!error && plans.length === 0 && (
        <section style={styles.empty}>
          <h3>Aún no tienes planes guardados</h3>
          <p>Registra tus calificaciones y genera un plan desde “Extraer competencias”.</p>
        </section>
      )}

      <div style={styles.planList}>
        {plans.map((plan) => {
          const weeklyPlan = Array.isArray(plan.plan?.planSemanal) ? plan.plan.planSemanal : [];
          const priorities = Array.isArray(plan.plan?.prioridades) ? plan.plan.prioridades : [];
          const recommendations = Array.isArray(plan.plan?.recomendacionesGenerales)
            ? plan.plan.recomendacionesGenerales
            : [];
          const tasksByWeek = plan.tareas.reduce((weeks, task) => {
            weeks[task.semana] ||= [];
            weeks[task.semana].push(task);
            return weeks;
          }, {});

          return (
            <article key={plan.id} style={styles.plan}>
              <header style={styles.planHeader}>
                <div>
                  <h3>Periodo {plan.periodo}</h3>
                  <small>Actualizado {new Date(plan.updated_at || plan.created_at).toLocaleDateString()}</small>
                </div>
                <button
                  type="button"
                  onClick={() => createTasks(plan.id)}
                  disabled={Boolean(creatingTaskFor) || plan.tareas.length > 0}
                  style={styles.button}
                >
                  {creatingTaskFor === plan.id
                    ? 'Creando tareas con IA...'
                    : plan.tareas.length > 0
                      ? 'Tareas creadas'
                      : 'Crear tareas por IA'}
                </button>
              </header>

              <p>{plan.plan?.resumen || 'Este plan no contiene un resumen.'}</p>
              <h4>Prioridades académicas</h4>
              {priorities.length ? (
                <ul>
                  {priorities.map((item, index) => (
                    <li key={`${item.materia}-${index}`}>
                      <strong>{item.materia}</strong> · {item.prioridad} · Calificación: {item.calificacion}
                      <p>{item.recomendacion}</p>
                    </li>
                  ))}
                </ul>
              ) : <p>No hay prioridades registradas.</p>}

              <h4>Plan semanal</h4>
              {weeklyPlan.length ? weeklyPlan.map((week) => (
                <section key={week.semana} style={styles.week}>
                  <h5>Semana {week.semana}: {week.objetivo}</h5>
                  <ul>{(week.actividades || []).map((activity, index) => <li key={`${index}-${activity}`}>{activity}</li>)}</ul>
                  {tasksByWeek[week.semana]?.length > 0 && (
                    <div style={styles.tasks}>
                      <h5>Tareas de la semana</h5>
                      {tasksByWeek[week.semana].map((task) => (
                        <article key={task.id} style={styles.task}>
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

              <h4>Recomendaciones generales</h4>
              {recommendations.length ? (
                <ul>{recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`}>{recommendation}</li>)}</ul>
              ) : <p>No hay recomendaciones registradas.</p>}
            </article>
          );
        })}
      </div>
    </main>
  );
}

const styles = {
  page: {
    maxWidth: '1000px',
    margin: '1.5rem auto',
    padding: '1.5rem',
    color: 'var(--text-900, #1a1a1a)',
  },
  message: { padding: '1.5rem', textAlign: 'center' },
  error: { color: '#b42318' },
  empty: { padding: '1.5rem', border: '1px solid #d8e5f2', borderRadius: '8px' },
  planList: { display: 'grid', gap: '1.25rem' },
  plan: { padding: '1.25rem', border: '1px solid #d8e5f2', borderRadius: '8px', background: '#ffffff' },
  planHeader: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  button: { padding: '0.65rem 1rem', border: 0, borderRadius: '6px', background: '#0066cc', color: '#ffffff', fontWeight: 600, cursor: 'pointer' },
  week: { marginTop: '1rem', padding: '0.75rem 1rem', borderLeft: '3px solid #0066cc', background: '#f8fafd' },
  tasks: { marginTop: '1rem' },
  task: { marginTop: '0.5rem', padding: '0.75rem', background: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '6px' },
};
