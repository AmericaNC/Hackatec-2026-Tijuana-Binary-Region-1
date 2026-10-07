import { useState } from 'react';

export default function DocumentUploader({ onExtractSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

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