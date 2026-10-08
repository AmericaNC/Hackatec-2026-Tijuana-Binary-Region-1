import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import AiContentNotice from '../../components/AiContentNotice';
import './../jobBoardStyles.css';

export default function JobDetails({
  job,
  isBookmarked,
  onToggleBookmark,
  session,
  onOpenStudyPlans,
}) {
  const [assessment, setAssessment] = useState(null);
  const [assessmentError, setAssessmentError] = useState('');
  const [assessmentWarning, setAssessmentWarning] = useState('');
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState('loading');
  const [applicationError, setApplicationError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadApplicationStatus() {
      if (!job || !session?.user?.id) {
        setApplicationStatus('signed-out');
        return;
      }

      setApplicationStatus('loading');
      setApplicationError('');
      try {
        const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
        if (!activeSession?.access_token) throw new Error('Inicia sesión para consultar tu postulación.');

        const params = new URLSearchParams({ empleoId: job.id });
        const response = await fetch(`/api/job-applications?${params}`, {
          headers: { Authorization: `Bearer ${activeSession.access_token}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo consultar tu postulación.');
        if (isCurrent) setApplicationStatus(result.aplicada ? 'applied' : 'not-applied');
      } catch (error) {
        if (isCurrent) {
          console.error('Error al consultar la postulación:', error);
          setApplicationError(error.message || 'No se pudo consultar tu postulación.');
          setApplicationStatus('error');
        }
      }
    }

    loadApplicationStatus();
    return () => { isCurrent = false; };
  }, [job, session?.user?.id]);

  const applyToJob = async () => {
    setApplying(true);
    setApplicationError('');

    try {
      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!activeSession?.access_token) throw new Error('Inicia sesión para aplicar a esta vacante.');

      const response = await fetch('/api/job-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({ empleoId: job.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'No se pudo registrar tu postulación.');
      setApplicationStatus('applied');
    } catch (error) {
      console.error('Error al aplicar a la vacante:', error);
      setApplicationError(error.message || 'No se pudo registrar tu postulación.');
    } finally {
      setApplying(false);
    }
  };

  const requestAssessment = async (action) => {
    setAssessmentLoading(action === 'evaluate');
    setSavingPlan(action === 'create-plan');
    setAssessmentError('');
    setAssessmentWarning('');

    try {
      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!activeSession?.access_token) throw new Error('Inicia sesión para evaluar tus skills.');

      const response = await fetch('/api/job-skill-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({ action, empleoId: job.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');

      if (action === 'evaluate') {
        setAssessment(result.evaluacion);
        setPlanSaved(Boolean(result.planExistente));
        setAssessmentWarning(result.advertencia || '');
      } else {
        setPlanSaved(true);
      }
    } catch (error) {
      console.error('Error al evaluar skills de la vacante:', error);
      setAssessmentError(error.message || 'No se pudo completar la solicitud.');
    } finally {
      setAssessmentLoading(false);
      setSavingPlan(false);
    }
  };

  if (!job) {
    return (
      <section className="job-details-empty">
        <div>Selecciona una oferta para ver los detalles</div>
      </section>
    );
  }

  return (
    <section className="job-details-section">
      <div className="details-header">
        <h1 className="details-title" style={{ fontSize: '24px' }}>{job.nombre_empleo}</h1>
        <div className="details-meta">
          <span className="details-date">
            {new Date(job.created_at).toLocaleDateString()}
          </span>
          <button 
            className={`bookmark-btn ${isBookmarked ? 'active' : 'inactive'}`}
            onClick={() => onToggleBookmark('job', job.id)}
          >
            🔖
          </button>
        </div>
      </div>

      <div className="details-body">
        {job.puesto_trabajo && (
          <p className="details-position">{job.puesto_trabajo}</p>
        )}

        {job.descripcion && (
          <section className="details-information">
            <h2>Descripción del empleo</h2>
            <p className="details-content">{job.descripcion}</p>
          </section>
        )}

        {job.prestaciones && (
          <section className="details-information">
            <h2>Prestaciones</h2>
            <p className="details-content">{job.prestaciones}</p>
          </section>
        )}

        {job.areas_oportunidad && (
          <section className="details-information">
            <h2>Áreas de oportunidad</h2>
            <p className="details-content">{job.areas_oportunidad}</p>
          </section>
        )}

        {Array.isArray(job.carreras_dirigidas) && job.carreras_dirigidas.length > 0 && (
          <section className="details-information">
            <h2>Carreras dirigidas</h2>
            <ul className="details-career-list">
              {job.carreras_dirigidas.map((carrera) => (
                <li key={carrera}>{carrera}</li>
              ))}
            </ul>
          </section>
        )}
        </div>

      <div className="details-actions">
        <button
          className="apply-btn"
          type="button"
          onClick={applyToJob}
          disabled={applying || applicationStatus === 'loading' || applicationStatus === 'applied' || !session?.user?.id}
        >
          {applying
            ? 'Enviando postulación...'
            : applicationStatus === 'applied'
              ? '✓ Ya aplicaste'
              : !session?.user?.id
                ? 'Inicia sesión para aplicar'
                : '✉️ Apply'}
        </button>
      </div>
      {applicationError && <p className="job-application-error" role="alert">{applicationError}</p>}

      <section className="job-skill-assessment" aria-labelledby="job-skill-assessment-title">
        <div className="job-skill-assessment-heading">
          <div>
            <p className="job-skill-assessment-eyebrow">AI Catalyst</p>
            <h2 id="job-skill-assessment-title">Evalúa tu compatibilidad</h2>
          </div>
          <span className="job-skill-assessment-icon" aria-hidden="true">✦</span>
        </div>
        <p className="job-skill-assessment-intro">
          Compara tus skills registradas con las responsabilidades y áreas de oportunidad de esta vacante.
        </p>
        <button
          type="button"
          className="job-skill-assessment-button"
          onClick={() => requestAssessment('evaluate')}
          disabled={assessmentLoading || savingPlan || !session?.user?.id}
        >
          {assessmentLoading ? 'Evaluando tus skills...' : 'Evaluar mis skills con IA'}
        </button>

        {assessmentError && <p className="job-skill-assessment-error" role="alert">{assessmentError}</p>}
        {assessmentLoading && <p className="job-skill-assessment-status" role="status">Analizando tu perfil y la vacante...</p>}
        {assessmentWarning && <p className="job-skill-assessment-warning" role="status">{assessmentWarning}</p>}

        {assessment && (
          <div className="job-skill-assessment-result">
            <div className="job-skill-score">
              <strong>{assessment.compatibilidad}%</strong>
              <span>compatibilidad estimada</span>
            </div>
            <p className="job-skill-summary">{assessment.resumen}</p>

            {assessment.fortalezas?.length > 0 && (
              <div className="job-skill-result-group">
                <h3>Skills que ya aportas</h3>
                <ul>
                  {assessment.fortalezas.map((item, index) => (
                    <li key={`${item.skill}-${index}`}>
                      <strong>{item.skill}</strong>
                      {item.evidencia && <span>{item.evidencia}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.brechas?.length > 0 && (
              <div className="job-skill-result-group">
                <h3>Oportunidades de desarrollo</h3>
                <ul>
                  {assessment.brechas.map((item, index) => (
                    <li key={`${item.requisito}-${index}`}>
                      <strong>{item.requisito}</strong>
                      <span>{item.recomendacion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assessment.recomendaciones?.length > 0 && (
              <div className="job-skill-result-group">
                <h3>Recomendaciones</h3>
                <ul>
                  {assessment.recomendaciones.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              </div>
            )}

            {planSaved ? (
              <div className="job-skill-plan-saved">
                <p>El plan de mejora para esta vacante ya está guardado en Mis planes.</p>
                <button type="button" onClick={onOpenStudyPlans}>Ver mis planes</button>
              </div>
            ) : (
              <button
                type="button"
                className="job-skill-assessment-button job-skill-plan-button"
                onClick={() => requestAssessment('create-plan')}
                disabled={assessmentLoading || savingPlan}
              >
                {savingPlan ? 'Generando y guardando plan...' : 'Generar y agregar plan de mejora'}
              </button>
            )}
            {savingPlan && <p className="job-skill-assessment-status" role="status">Creando una ruta personalizada para esta vacante...</p>}
            <AiContentNotice />
          </div>
        )}
      </section>
    </section>
  );
}