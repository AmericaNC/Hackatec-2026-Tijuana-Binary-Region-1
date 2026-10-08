import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { registrarActividad } from '../utils/activityLogs';
import './GradeEntryForm.css';

export default function GradeEntryForm({ carreraId, matricula, materias }) {
  const [periodo, setPeriodo] = useState('');
  const [calificaciones, setCalificaciones] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [studyPlan, setStudyPlan] = useState(null);
  const [gradeHistory, setGradeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const materiasClaves = new Set(materias.map(({ clave }) => clave));
  const calificacionesDelPeriodo = gradeHistory.filter((registro) => (
    registro.periodo === periodo.trim() && materiasClaves.has(registro.claveMateria)
  ));
  const savedGradeByKey = Object.fromEntries(calificacionesDelPeriodo.map((registro) => [
    registro.claveMateria,
    registro.calificacion === null ? '' : String(registro.calificacion),
  ]));
  const savedMateriaKeys = Object.keys(savedGradeByKey);
  const savedGradesPeriod = calificacionesDelPeriodo.length ? periodo.trim() : '';
  const hasUnsavedGrades = materias.some(({ clave }) => (
    !savedMateriaKeys.includes(clave)
    && calificaciones[clave] !== undefined
    && calificaciones[clave] !== ''
  ));

  useEffect(() => {
    let isCurrent = true;

    async function cargarHistorialCalificaciones() {
      setStudyPlan(null);
      setPlanError(null);
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`No se pudo verificar tu sesión: ${authError.message}`);
        if (!user) throw new Error('Inicia sesión para consultar tus calificaciones.');

        const registros = [];
        for (let from = 0; ; from += 1000) {
          const { data, error: registrosError } = await supabase
            .from('calificaciones')
            .select('materia_id, calificacion, periodo, updated_at')
            .eq('alumno_id', user.id)
            .order('periodo', { ascending: false })
            .range(from, from + 999);
          if (registrosError) {
            throw new Error(`No se pudieron consultar tus calificaciones: ${registrosError.message}`);
          }
          registros.push(...(data || []));
          if (!data || data.length < 1000) break;
        }

        const materiaIds = [...new Set(registros.map(({ materia_id }) => materia_id))];
        let materiasDb = [];
        if (materiaIds.length) {
          const { data, error: materiasError } = await supabase
            .from('materias')
            .select('id, clave, nombre')
            .in('id', materiaIds);
          if (materiasError) {
            throw new Error(`No se pudieron consultar las materias de tus calificaciones: ${materiasError.message}`);
          }
          materiasDb = data || [];
        }

        const materiaPorId = new Map(materiasDb.map((materia) => [materia.id, materia]));
        if (isCurrent) {
          setGradeHistory(registros.map((registro) => {
            const materia = materiaPorId.get(registro.materia_id);
            return {
              ...registro,
              claveMateria: materia?.clave || `ID ${registro.materia_id}`,
              nombreMateria: materia?.nombre || 'Materia no disponible',
            };
          }));
        }
      } catch (periodError) {
        if (isCurrent) {
          console.error('Error consultando historial de calificaciones:', periodError);
          setHistoryError(periodError.message || 'No se pudo consultar tu historial de calificaciones.');
        }
      } finally {
        if (isCurrent) setHistoryLoading(false);
      }
    }

    cargarHistorialCalificaciones();
    return () => { isCurrent = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess('');
    setStep('');
    setPlanError(null);
    setStudyPlan(null);

    if (!carreraId) {
      setError('No se pudo identificar la carrera. Cierra y vuelve a abrir esta sección para cargarla de nuevo.');
      return;
    }
    if (historyLoading) {
      setError('Espera a que termine la carga de tu historial de calificaciones.');
      return;
    }
    if (historyError) {
      setError('No se pudo validar el historial; no se guardó nada. Recarga la sección e inténtalo de nuevo.');
      return;
    }
    if (!matricula?.trim()) {
      setError('El perfil no tiene matrícula. Completa o actualiza tu perfil antes de guardar.');
      return;
    }
    if (!materias.length) {
      setError('No hay materias disponibles para registrar.');
      return;
    }

    const periodoNormalizado = periodo.trim();
    if (!periodoNormalizado) {
      setError('Ingresa el periodo escolar para estas calificaciones.');
      return;
    }

    const calificacionesIngresadas = materias
      .filter(({ clave }) => (
        !savedMateriaKeys.includes(clave)
        && calificaciones[clave] !== undefined
        && calificaciones[clave] !== ''
      ))
      .map(({ clave }) => ({ clave, calificacion: Number(calificaciones[clave]) }));

    if (calificacionesIngresadas.length === 0) {
      setError('No hay calificaciones nuevas para guardar. Las materias del periodo ya están registradas.');
      return;
    }

    if (calificacionesIngresadas.some(({ calificacion }) => (
      !Number.isFinite(calificacion) || calificacion < 0 || calificacion > 100
    ))) {
      setError('Las calificaciones deben estar entre 0 y 100.');
      return;
    }

    setSaving(true);
    try {
      setStep('Verificando sesión...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`No se pudo verificar tu sesión: ${authError.message}`);
      if (!user) throw new Error('Inicia sesión para guardar calificaciones.');

      setStep('Verificando que tu matrícula esté vinculada a tu usuario...');
      const { data: alumno, error: alumnoError } = await supabase
        .from('alumnos')
        .select('uid')
        .eq('uid', user.id)
        .eq('matricula', matricula)
        .maybeSingle();

      if (alumnoError) {
        throw new Error(`No se pudo verificar el registro del alumno: ${alumnoError.message}`);
      }
      if (!alumno) {
        throw new Error('Tu matrícula no está vinculada a tu usuario en la tabla alumnos.');
      }

      const materiasUnicas = [...new Map(materias.map((materia) => [materia.clave, materia])).values()];
      setStep('Guardando materias...');
      const { data: materiasGuardadas, error: materiasError } = await supabase
        .from('materias')
        .upsert(
          materiasUnicas.map(({ clave, nombre }) => ({
            carrera_id: carreraId,
            clave,
            nombre,
          })),
          { onConflict: 'carrera_id,clave' },
        )
        .select('id, clave');

      if (materiasError) {
        throw new Error(`No se pudieron guardar las materias: ${materiasError.message}`);
      }
      if (!materiasGuardadas || materiasGuardadas.length !== materiasUnicas.length) {
        throw new Error('No se pudieron confirmar todas las materias. Verifica las políticas de acceso de Supabase.');
      }

      const idsPorClave = new Map(materiasGuardadas.map(({ id, clave }) => [clave, id]));
      const registros = calificacionesIngresadas.map(({ clave, calificacion }) => {
        const materiaId = idsPorClave.get(clave);
        if (!materiaId) {
          throw new Error(`No se encontró el registro de la materia ${clave}.`);
        }

        return {
          alumno_id: alumno.uid,
          materia_id: materiaId,
          calificacion,
          periodo: periodoNormalizado,
          updated_at: new Date().toISOString(),
        };
      });

      setStep('Verificando que las materias no tengan una calificación previa en este periodo...');
      const { data: duplicados, error: duplicadosError } = await supabase
        .from('calificaciones')
        .select('materia_id')
        .eq('alumno_id', alumno.uid)
        .eq('periodo', periodoNormalizado)
        .in('materia_id', registros.map(({ materia_id }) => materia_id));
      if (duplicadosError) {
        throw new Error(`No se pudo validar si hay calificaciones previas: ${duplicadosError.message}`);
      }
      if (duplicados?.length) {
        const clavesDuplicadas = new Set(duplicados.map(({ materia_id }) => (
          [...idsPorClave.entries()].find(([, id]) => id === materia_id)?.[0]
        )));
        throw new Error(
          `Ya existe una calificación para ${[...clavesDuplicadas].filter(Boolean).join(', ')} en ${periodoNormalizado}.`,
        );
      }

      setStep('Guardando calificaciones...');
      const { error: calificacionesError } = await supabase
        .from('calificaciones')
        .insert(registros);

      if (calificacionesError) {
        if (calificacionesError.code === '23505') {
          throw new Error('Ya existe una calificación para una o más materias en este periodo. Se conservaron las notas existentes.');
        }
        throw new Error(`No se pudieron guardar las calificaciones: ${calificacionesError.message}`);
      }

      const materiaPorIdGuardado = new Map(materiasGuardadas.map((materia) => [materia.id, materia]));
      setGradeHistory((actuales) => [
        ...registros.map((registro) => {
          const materia = materiaPorIdGuardado.get(registro.materia_id);
          return {
            ...registro,
            claveMateria: materia?.clave || `ID ${registro.materia_id}`,
            nombreMateria: materia?.nombre || 'Materia no disponible',
          };
        }),
        ...actuales,
      ]);
      setSuccess(`Se guardaron ${registros.length} calificaciones para el periodo ${periodoNormalizado}.`);
      await registrarActividad({
        eventType: 'grades_saved',
        description: `Registró ${registros.length} calificación(es) del periodo ${periodoNormalizado}.`,
      });
      setStep('');
    } catch (submitError) {
      console.error('Error al guardar calificaciones:', submitError);
      const code = submitError.code ? ` (código: ${submitError.code})` : '';
      setError(`${submitError.message || 'Ocurrió un error al guardar las calificaciones.'}${code}`);
      setStep('');
    } finally {
      setSaving(false);
    }
  };

  const generarPlan = async () => {
    setGeneratingPlan(true);
    setPlanError(null);
    setStudyPlan(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!session?.access_token) throw new Error('Inicia sesión para generar tu plan de estudio.');

      const response = await fetch('/api/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ periodo: periodo.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo generar el plan de estudio.');
      }

      setStudyPlan(result.data);
      await registrarActividad({
        eventType: 'study_plan_generated',
        description: `Generó un plan de estudio para el periodo ${periodo.trim()}.`,
      });
    } catch (planGenerationError) {
      console.error('Error al generar el plan de estudio:', planGenerationError);
      setPlanError(planGenerationError.message || 'No se pudo generar el plan de estudio.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} noValidate className="grade-entry-form">
      <header className="grade-section-heading">
        <div>
          <p className="grade-eyebrow">Seguimiento académico</p>
          <h2>Registrar calificaciones</h2>
        </div>
      </header>
      <p className="grade-description">
        El periodo aplica a todas las calificaciones que ingreses. Las materias sin calificación no se guardarán.
      </p>

      <label className="grade-period-label" htmlFor="grade-period">
        Periodo
        <input
          id="grade-period"
          type="text"
          value={periodo}
          onChange={(event) => {
            setPeriodo(event.target.value);
            setCalificaciones({});
            setStudyPlan(null);
            setPlanError(null);
            setError(null);
            setSuccess('');
          }}
          placeholder="Ej. 2026-1"
          maxLength={50}
          className="grade-period-input"
        />
      </label>

      <div className="grade-subject-list">
        {materias.map(({ clave, nombre }) => (
          <label key={clave} className="grade-subject-card" htmlFor={`grade-${clave}`}>
            <span className="grade-subject-info">
              <strong>{nombre}</strong>
              <small className="grade-subject-key">{clave}</small>
            </span>
            <input
              id={`grade-${clave}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={savedMateriaKeys.includes(clave) ? savedGradeByKey[clave] : (calificaciones[clave] ?? '')}
              disabled={savedMateriaKeys.includes(clave) || historyLoading}
              onChange={(event) => {
                setCalificaciones((current) => ({ ...current, [clave]: event.target.value }));
                setStudyPlan(null);
                setPlanError(null);
                setError(null);
                setSuccess('');
              }}
              aria-label={`Calificación de ${nombre}`}
              className="grade-input"
            />
            {savedMateriaKeys.includes(clave) && (
              <small className="grade-saved-label">Ya registrada en este periodo</small>
            )}
          </label>
        ))}
      </div>

      {error && <p role="alert" className="grade-message grade-message-error">{error}</p>}
      {success && <p role="status" className="grade-message grade-message-success">{success}</p>}
      {step && <p role="status" className="grade-message grade-message-progress">{step}</p>}

      <div className="grade-actions">
        <button type="submit" disabled={saving || historyLoading} className="skills-button skills-button-primary">
          {saving ? 'Guardando...' : 'Guardar calificaciones'}
        </button>

        <button
          type="button"
          onClick={generarPlan}
          disabled={
            generatingPlan
            || historyLoading
            || hasUnsavedGrades
            || !periodo.trim()
            || savedGradesPeriod !== periodo.trim()
          }
          className="skills-button skills-button-secondary"
        >
          {generatingPlan ? 'Generando plan con Gemini...' : 'Generar plan de estudio'}
        </button>
      </div>
      {(savedGradesPeriod !== periodo.trim() || hasUnsavedGrades) && (
        <p className="grade-description">Guarda primero las calificaciones de este periodo para generar el plan.</p>
      )}
      {planError && <p role="alert" className="grade-message grade-message-error">{planError}</p>}
      {generatingPlan && <p role="status" className="grade-message grade-message-progress">Consultando tus notas y preparando el plan...</p>}
      {studyPlan && (
        <section className="grade-generated-plan">
          <h4>Tu plan de estudio · {studyPlan.periodo}</h4>
          <p>{studyPlan.plan.resumen}</p>
          <h5>Prioridades</h5>
          <ul>
            {studyPlan.plan.prioridades.map((item) => (
              <li key={`${item.materia}-${item.prioridad}`}>
                <strong>{item.materia}</strong> ({item.calificacion}) · {item.prioridad}
                <p>{item.recomendacion}</p>
              </li>
            ))}
          </ul>
          <h5>Plan de cuatro semanas</h5>
          <ol>
            {studyPlan.plan.planSemanal.map((week) => (
              <li key={week.semana}>
                <strong>Semana {week.semana}: {week.objetivo}</strong>
                <ul>
                  {week.actividades.map((activity) => <li key={activity}>{activity}</li>)}
                </ul>
              </li>
            ))}
          </ol>
          <h5>Recomendaciones generales</h5>
          <ul>
            {studyPlan.plan.recomendacionesGenerales.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
          <p className="grade-description">Plan guardado en tu cuenta · ID {studyPlan.id}</p>
        </section>
      )}
    </form>
    <section className="grade-history">
      <header className="grade-section-heading">
        <div>
          <p className="grade-eyebrow">Historial académico</p>
          <h2>Calificaciones registradas</h2>
        </div>
        {!historyLoading && !historyError && gradeHistory.length > 0 && (
          <span className="grade-count-badge">{gradeHistory.length} registros</span>
        )}
      </header>
      {historyLoading && <p role="status" className="grade-history-state">Cargando tu historial...</p>}
      {historyError && <p role="alert" className="grade-message grade-message-error">{historyError}</p>}
      {!historyLoading && !historyError && gradeHistory.length === 0 && (
        <p className="grade-history-state">Aún no tienes calificaciones registradas.</p>
      )}
      {!historyLoading && !historyError && gradeHistory.length > 0 && (
        [...new Set(gradeHistory.map(({ periodo: gradePeriod }) => gradePeriod))]
          .sort((left, right) => right.localeCompare(left))
          .map((gradePeriod) => (
            <section key={gradePeriod} className="grade-history-period">
              <header className="grade-period-heading">
                <h3>Periodo {gradePeriod}</h3>
                <span>
                  {gradeHistory.filter(({ periodo: rowPeriod }) => rowPeriod === gradePeriod).length} materias
                </span>
              </header>
              <div className="grade-history-table-wrapper">
                <table className="grade-history-table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th>Clave</th>
                      <th>Calificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeHistory
                      .filter(({ periodo: rowPeriod }) => rowPeriod === gradePeriod)
                      .map((registro) => (
                        <tr key={`${registro.materia_id}-${registro.periodo}`}>
                          <td data-label="Materia">{registro.nombreMateria}</td>
                          <td data-label="Clave"><span className="grade-subject-key">{registro.claveMateria}</span></td>
                          <td data-label="Calificación">
                            {registro.calificacion === null ? 'Sin calificación' : registro.calificacion}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
      )}
    </section>
    </>
  );
}
