import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function GradeEntryForm({ carreraId, matricula, materias }) {
  const [periodo, setPeriodo] = useState('');
  const [calificaciones, setCalificaciones] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess('');

    const periodoNormalizado = periodo.trim();
    if (!periodoNormalizado) {
      setError('Ingresa el periodo escolar para estas calificaciones.');
      return;
    }

    const calificacionesIngresadas = materias
      .filter(({ clave }) => calificaciones[clave] !== undefined && calificaciones[clave] !== '')
      .map(({ clave }) => ({ clave, calificacion: Number(calificaciones[clave]) }));

    if (calificacionesIngresadas.length === 0) {
      setError('Ingresa al menos una calificación antes de guardar.');
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`No se pudo verificar tu sesión: ${authError.message}`);
      if (!user) throw new Error('Inicia sesión para guardar calificaciones.');

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

      const { error: calificacionesError } = await supabase
        .from('calificaciones')
        .upsert(registros, { onConflict: 'alumno_id,materia_id,periodo' });

      if (calificacionesError) {
        throw new Error(`No se pudieron guardar las calificaciones: ${calificacionesError.message}`);
      }

      setSuccess(`Se guardaron ${registros.length} calificaciones para el periodo ${periodoNormalizado}.`);
    } catch (submitError) {
      console.error('Error al guardar calificaciones:', submitError);
      setError(submitError.message || 'Ocurrió un error al guardar las calificaciones.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h4 style={styles.title}>Registrar calificaciones</h4>
      <p style={styles.description}>
        El periodo aplica a todas las calificaciones que ingreses. Las materias sin calificación no se guardarán.
      </p>

      <label style={styles.periodLabel} htmlFor="grade-period">
        Periodo
        <input
          id="grade-period"
          type="text"
          value={periodo}
          onChange={(event) => {
            setPeriodo(event.target.value);
            setError(null);
            setSuccess('');
          }}
          placeholder="Ej. 2026-1"
          maxLength={50}
          required
          style={styles.periodInput}
        />
      </label>

      <div style={styles.grades}>
        {materias.map(({ clave, nombre }) => (
          <label key={clave} style={styles.gradeRow} htmlFor={`grade-${clave}`}>
            <span>
              <strong>{nombre}</strong>
              <small style={styles.subjectKey}>{clave}</small>
            </span>
            <input
              id={`grade-${clave}`}
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={calificaciones[clave] ?? ''}
              onChange={(event) => {
                setCalificaciones((current) => ({ ...current, [clave]: event.target.value }));
                setError(null);
                setSuccess('');
              }}
              aria-label={`Calificación de ${nombre}`}
              style={styles.gradeInput}
            />
          </label>
        ))}
      </div>

      {error && <p role="alert" style={styles.error}>{error}</p>}
      {success && <p role="status" style={styles.success}>{success}</p>}

      <button type="submit" disabled={saving || !carreraId || !matricula} style={styles.submit}>
        {saving ? 'Guardando...' : 'Guardar calificaciones'}
      </button>
    </form>
  );
}

const styles = {
  form: {
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #e0e0e0',
  },
  title: {
    margin: '0 0 0.5rem 0',
  },
  description: {
    color: '#666666',
    fontSize: '0.875rem',
  },
  periodLabel: {
    display: 'grid',
    gap: '0.4rem',
    maxWidth: '280px',
    margin: '1rem 0',
    fontWeight: '600',
  },
  periodInput: {
    padding: '0.6rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    font: 'inherit',
    fontWeight: '400',
  },
  grades: {
    display: 'grid',
    gap: '0.5rem',
  },
  gradeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
  },
  subjectKey: {
    display: 'block',
    marginTop: '0.2rem',
    color: '#777777',
  },
  gradeInput: {
    width: '100px',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    font: 'inherit',
  },
  error: {
    color: '#b00020',
  },
  success: {
    color: '#176b35',
  },
  submit: {
    marginTop: '1rem',
    padding: '0.65rem 1rem',
    border: 0,
    borderRadius: '6px',
    backgroundColor: '#0066cc',
    color: '#ffffff',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
