import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import GradeEntryForm from '../components/GradeEntryForm';
import './skills-extract.css';

export default function DocumentUploader({ carrera, matricula }) {
  const [temarios, setTemarios] = useState([]);
  const [carreraLoading, setCarreraLoading] = useState(true);
  const [carreraError, setCarreraError] = useState(null);
  const [claveCarrera, setClaveCarrera] = useState('');
  const [carreraId, setCarreraId] = useState(null);
  const materias = useMemo(() => temarios.map(({ claveMateria, contenido }) => ({
    clave: contenido.asignatura?.clave || claveMateria,
    nombre: contenido.asignatura?.nombre || claveMateria,
  })), [temarios]);

  useEffect(() => {
    let isCurrent = true;

    async function cargarTemariosCarrera() {
      setCarreraLoading(true);
      setCarreraError(null);
      setTemarios([]);
      setClaveCarrera('');
      setCarreraId(null);

      if (!carrera) {
        setCarreraError('No se encontró la carrera del perfil.');
        setCarreraLoading(false);
        return;
      }

      try {
        const { data: carreraData, error: carreraQueryError } = await supabase
          .from('carreras')
          .select('id, clave, nombre')
          .eq('nombre', carrera)
          .maybeSingle();

        if (carreraQueryError) {
          throw new Error(`No se pudo consultar la carrera: ${carreraQueryError.message}`);
        }
        if (!carreraData?.clave) {
          throw new Error(`No se encontró una clave para la carrera "${carrera}".`);
        }

        const params = new URLSearchParams({ clave: carreraData.clave });
        const response = await fetch(`/api/carrera?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los temarios de la carrera.');
        }

        if (isCurrent) {
          setClaveCarrera(data.claveCarrera);
          setCarreraId(carreraData.id);
          setTemarios(data.materias);
        }
      } catch (err) {
        if (isCurrent) {
          console.error('Error al cargar temarios de la carrera:', err);
          setCarreraError(err.message || 'Error al cargar los temarios de la carrera.');
        }
      } finally {
        if (isCurrent) setCarreraLoading(false);
      }
    }

    cargarTemariosCarrera();

    return () => {
      isCurrent = false;
    };
  }, [carrera]);

  return (
    <main className="skills-extract-page">
    <div className="skills-extract-card">
      <header className="skills-extract-heading">
        <p className="skills-extract-eyebrow">Herramienta académica</p>
        <h1>Temarios y calificaciones</h1>
        <p>Consulta las competencias de tu carrera y registra tus calificaciones para generar un plan de estudio.</p>
      </header>

      <section className="skills-career-section">
        <header className="skills-section-heading">
          <div>
            <p className="skills-extract-eyebrow">Tu carrera</p>
            <h2>Temarios disponibles</h2>
          </div>
          {!carreraLoading && !carreraError && (
            <span className="skills-count-badge">{temarios.length} materias</span>
          )}
        </header>
        {carreraLoading && <p className="skills-state" role="status">Cargando temarios...</p>}
        {carreraError && <div className="skills-message skills-message-error" role="alert">{carreraError}</div>}
        {!carreraLoading && !carreraError && (
          <>
            <div className="skills-career-summary">
              <strong>{carrera}</strong>
              <span>{claveCarrera}</span>
            </div>
            {temarios.length === 0 ? (
              <p className="skills-state">No hay temarios disponibles para esta carrera.</p>
            ) : (
              <div className="skills-course-list">
                {temarios.map(({ archivo, claveMateria, contenido }) => (
                  <article key={archivo} className="skills-course-card">
                    <header className="skills-course-heading">
                      <div>
                        <p className="skills-extract-eyebrow">Asignatura</p>
                        <h3>{contenido.asignatura?.nombre || claveMateria}</h3>
                      </div>
                      <span className="skills-subject-key">{contenido.asignatura?.clave || claveMateria}</span>
                    </header>
                    {contenido.competencias?.length > 0 ? (
                      <div className="skills-competency-list">
                        {contenido.competencias.map((competencia) => (
                          <article className="skills-competency-card" key={competencia.id}>
                            <span className="skills-competency-marker" aria-hidden="true">✓</span>
                            <div>
                            <strong>{competencia.nombre}</strong>
                            <p>{competencia.descripcion}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="skills-state">Este temario no contiene competencias.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
            {temarios.length > 0 && (
              <GradeEntryForm
                carreraId={carreraId}
                matricula={matricula}
                materias={materias}
              />
            )}
          </>
        )}
      </section>

    </div>
    </main>
  );
}