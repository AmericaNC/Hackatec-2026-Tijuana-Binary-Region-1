import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import GradeEntryForm from '../components/GradeEntryForm';
import './skills-extract.css';

export default function DocumentUploader({ carrera, matricula, onExtractSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
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

  const invokeProcesarPDF = async (file) => {
    const pdfBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF.'));
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/extract-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64, mimeType: 'application/pdf' }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error al procesar el archivo.');
    }

    return result;
  };

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (
      (selectedFile.type && selectedFile.type !== 'application/pdf')
      || !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Por favor, selecciona un archivo PDF válido.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > 3 * 1024 * 1024) {
      setError('El PDF debe tener un tamaño máximo de 3 MB.');
      event.target.value = '';
      return;
    }

    setFileName(selectedFile.name);
    setLoading(true);
    setError(null);
    setResultado(null);

    try {
      const responseData = await invokeProcesarPDF(selectedFile);
      setResultado(responseData.data);
      if (onExtractSuccess) onExtractSuccess(responseData.data);
    } catch (err) {
      console.error('Error durante la extracción:', err);
      setError(err.message || 'Error al procesar el archivo.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const descargarJSON = () => {
    const blob = new Blob([JSON.stringify(resultado, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resultado.asignatura.clave || 'competencias'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="skills-extract-page">
    <div className="skills-extract-card">
      <header className="skills-extract-heading">
        <p className="skills-extract-eyebrow">Herramienta académica</p>
        <h1>Extraer competencias de un temario</h1>
        <p>Sube un PDF para extraer la carrera, asignatura y competencias.</p>
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

      <label className={`skills-dropzone${loading ? ' is-loading' : ''}`}>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={loading}
          className="skills-file-input"
        />

        <span className="skills-upload-icon" aria-hidden="true">{loading ? '🤖' : '📄'}</span>
        <span className="skills-upload-text">
          {loading
            ? 'Procesando documento con Inteligencia Artificial...'
            : fileName
            ? `Archivo seleccionado: ${fileName}`
            : 'Haz clic aquí para seleccionar un PDF'}
        </span>
        {!loading && !fileName && (
          <span className="skills-upload-hint">PDF de hasta 3 MB</span>
        )}
      </label>

      {error && <div className="skills-message skills-message-error" role="alert">{error}</div>}

      {resultado && (
        <section className="skills-extraction-result">
          <header className="skills-section-heading">
            <div>
              <p className="skills-extract-eyebrow">Documento procesado</p>
              <h2>Competencias extraídas</h2>
            </div>
            <button type="button" onClick={descargarJSON} className="skills-button skills-button-secondary">
            Descargar {resultado.asignatura.clave || 'competencias'}.json
            </button>
          </header>
          <pre className="skills-json-preview">{JSON.stringify(resultado, null, 2)}</pre>
        </section>
      )}
    </div>
    </main>
  );
}