import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import GradeEntryForm from '../components/GradeEntryForm';

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
          .select('clave, nombre')
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
    <div style={styles.card}>
      <h3 style={styles.title}>Extraer competencias de un temario</h3>
      <p style={styles.subtitle}>Sube un PDF para extraer la carrera, asignatura y competencias.</p>

      <section style={styles.careerSection}>
        <h4 style={styles.sectionTitle}>Temarios disponibles de tu carrera</h4>
        {carreraLoading && <p>Cargando temarios...</p>}
        {carreraError && <div style={styles.errorMessage}>⚠️ {carreraError}</div>}
        {!carreraLoading && !carreraError && (
          <>
            <p style={styles.hint}>
              {carrera} ({claveCarrera}) · {temarios.length} materias
            </p>
            {temarios.length === 0 ? (
              <p>No hay temarios disponibles para esta carrera.</p>
            ) : (
              <div style={styles.courseList}>
                {temarios.map(({ archivo, claveMateria, contenido }) => (
                  <article key={archivo} style={styles.courseCard}>
                    <h5 style={styles.courseTitle}>
                      {contenido.asignatura?.nombre || claveMateria}
                    </h5>
                    <p style={styles.hint}>{contenido.asignatura?.clave || claveMateria}</p>
                    {contenido.competencias?.length > 0 ? (
                      <ul style={styles.competencyList}>
                        {contenido.competencias.map((competencia) => (
                          <li key={competencia.id} style={styles.competency}>
                            <strong>{competencia.nombre}</strong>
                            <p>{competencia.descripcion}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Este temario no contiene competencias.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
            {temarios.length > 0 && (
              <GradeEntryForm
                carreraId={carreraId}
                matricula={matricula}
                materias={temarios.map(({ claveMateria, contenido }) => ({
                  clave: contenido.asignatura?.clave || claveMateria,
                  nombre: contenido.asignatura?.nombre || claveMateria,
                }))}
              />
            )}
          </>
        )}
      </section>

      <label style={{ ...styles.dropzone, opacity: loading ? 0.6 : 1 }}>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={loading}
          style={{ display: 'none' }}
        />

        <div style={styles.iconContainer}>{loading ? '🤖' : '📄'}</div>
        <span style={styles.uploadText}>
          {loading
            ? 'Procesando documento con Inteligencia Artificial...'
            : fileName
            ? `Archivo seleccionado: ${fileName}`
            : 'Haz clic aquí para seleccionar un PDF'}
        </span>
        {!loading && !fileName && (
          <span style={styles.hint}>PDF de hasta 3 MB</span>
        )}
      </label>

      {error && <div style={styles.errorMessage}>⚠️ {error}</div>}

      {resultado && (
        <section style={styles.result}>
          <h4>Competencias extraídas</h4>
          <button type="button" onClick={descargarJSON} style={styles.downloadButton}>
            Descargar {resultado.asignatura.clave || 'competencias'}.json
          </button>
          <pre style={styles.preview}>{JSON.stringify(resultado, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

const styles = {
  card: {
    maxWidth: '700px',
    margin: '1.5rem auto',
    padding: '1.5rem',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e0e0e0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.25rem',
    color: '#1a1a1a',
  },
  subtitle: {
    margin: '0 0 1.25rem 0',
    fontSize: '0.875rem',
    color: '#666666',
  },
  careerSection: {
    margin: '1.5rem 0',
    padding: '1rem',
    borderRadius: '8px',
    backgroundColor: '#f8fafd',
    border: '1px solid #e0e0e0',
  },
  sectionTitle: {
    margin: '0 0 0.5rem 0',
  },
  courseList: {
    display: 'grid',
    gap: '0.75rem',
  },
  courseCard: {
    padding: '1rem',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
  },
  courseTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
  },
  competencyList: {
    paddingLeft: '1.25rem',
  },
  competency: {
    marginTop: '0.75rem',
  },
  dropzone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    border: '2px dashed #0066cc',
    borderRadius: '8px',
    backgroundColor: '#f8fafd',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  iconContainer: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  uploadText: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#0066cc',
    textAlign: 'center',
  },
  hint: {
    marginTop: '0.4rem',
    fontSize: '0.75rem',
    color: '#888888',
  },
  errorMessage: {
    marginTop: '1rem',
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: '#fff0f0',
    color: '#d32f2f',
    fontSize: '0.85rem',
  },
  result: {
    marginTop: '1.5rem',
  },
  downloadButton: {
    padding: '0.6rem 1rem',
    border: 0,
    borderRadius: '6px',
    backgroundColor: '#218838',
    color: '#ffffff',
    cursor: 'pointer',
  },
  preview: {
    marginTop: '1rem',
    padding: '1rem',
    borderRadius: '6px',
    backgroundColor: '#f4f4f4',
    overflowX: 'auto',
    fontSize: '0.85rem',
  },
};