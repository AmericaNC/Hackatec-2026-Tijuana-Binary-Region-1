import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import AiContentNotice from '../components/AiContentNotice';
import './MyClassroom.css';
import './StudyTaskExam.css';

export default function StudyTaskExam({ session, taskId, onBack }) {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function loadExam() {
      try {
        const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
        if (!activeSession?.access_token || activeSession.user.id !== session?.user?.id) {
          throw new Error('Inicia sesión para resolver este examen.');
        }

        const response = await fetch('/api/study-task-exam', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeSession.access_token}`,
          },
          body: JSON.stringify({ action: 'start', taskId }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo abrir el examen.');

        setExam(payload);
        setAnswers(Array(payload.preguntas.length).fill(null));
      } catch (loadError) {
        setError(loadError.message || 'No se pudo abrir el examen.');
      } finally {
        setLoading(false);
      }
    }

    loadExam();
  }, [session?.user?.id, taskId]);

  const submitExam = async (event) => {
    event.preventDefault();
    if (!exam || answers.some((answer) => answer === null)) return;

    setBusy(true);
    setError('');
    try {
      const { data: { session: activeSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`No se pudo verificar tu sesión: ${sessionError.message}`);
      if (!activeSession?.access_token) throw new Error('Inicia sesión para enviar el examen.');

      const response = await fetch('/api/study-task-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({ action: 'submit', examId: exam.examId, answers }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo enviar el examen.');
      setResult(payload);
    } catch (submitError) {
      setError(submitError.message || 'No se pudo enviar el examen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="classroom-container study-exam-page">
      <section className="classroom-panel study-exam-panel" aria-labelledby="study-exam-title">
        <button className="study-exam-back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver a mis planes
        </button>

        {loading ? (
          <p className="classroom-message" role="status">Preparando tu examen...</p>
        ) : error && !exam ? (
          <div className="study-exam-state">
            <p className="classroom-error" role="alert">{error}</p>
            <button className="edit-btn primary-btn classroom-exam-button" type="button" onClick={onBack}>
              Volver a mis planes
            </button>
          </div>
        ) : exam ? (
          <>
            <header className="study-exam-heading">
              <p className="classroom-eyebrow">Evaluación de aprendizaje</p>
              <h1 id="study-exam-title">{exam.task?.titulo || 'Examen de tarea'}</h1>
              <p>{exam.task?.materia} · Semana {exam.task?.semana} · Intento {exam.intento} de 2</p>
              {exam.task?.descripcion && <p className="study-exam-description">{exam.task.descripcion}</p>}
            </header>

            {result ? (
              <div className={`study-exam-outcome${result.acreditado ? ' is-passed' : ''}`} role="status">
                <strong>{result.acreditado ? 'Tarea acreditada' : 'Aún no acreditada'}</strong>
                <p>
                  {result.correctas} de 5 respuestas correctas · {result.puntaje}%.
                  {!result.acreditado && exam.intento < 2 && ' Puedes volver a intentarlo desde tus planes.'}
                </p>
                <AiContentNotice />
                <button className="edit-btn primary-btn classroom-exam-button" type="button" onClick={onBack}>
                  Volver a mis planes
                </button>
              </div>
            ) : (
              <form className="study-exam-form" onSubmit={submitExam}>
                {exam.preguntas.map((question, questionIndex) => (
                  <fieldset className="classroom-exam-question" key={`${exam.examId}-${questionIndex}`}>
                    <legend>{questionIndex + 1}. {question.pregunta}</legend>
                    {question.opciones.map((option, optionIndex) => (
                      <label key={`${questionIndex}-${optionIndex}`}>
                        <input
                          type="radio"
                          name={`exam-${exam.examId}-question-${questionIndex}`}
                          value={optionIndex}
                          checked={answers[questionIndex] === optionIndex}
                          disabled={busy}
                          onChange={() => setAnswers((current) => current.map((answer, index) => (
                            index === questionIndex ? optionIndex : answer
                          )))}
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                ))}

                {error && <p className="classroom-error" role="alert">{error}</p>}
                <button className="edit-btn primary-btn classroom-exam-button study-exam-submit" type="submit" disabled={busy || answers.some((answer) => answer === null)}>
                  {busy ? 'Calificando...' : 'Enviar respuestas'}
                </button>
                <AiContentNotice />
              </form>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}