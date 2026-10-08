import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { obtenerSkillsCurriculares } from '../utils/skills.js';
import SkillsTracker from './SkillsTracker';
import './SavedSkillsPage.css';

export default function SavedSkillsPage({ carrera }) {
  const [competencias, setCompetencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function cargarCompetencias() {
      setLoading(true);
      setError(null);

      try {
        if (!carrera) throw new Error('El perfil no tiene una carrera asociada.');

        const { data: carreraData, error: carreraError } = await supabase
          .from('carreras')
          .select('clave')
          .eq('nombre', carrera)
          .maybeSingle();

        if (carreraError) throw new Error(`No se pudo consultar la carrera: ${carreraError.message}`);
        if (!carreraData?.clave) throw new Error(`No se encontró la clave de la carrera "${carrera}".`);

        const params = new URLSearchParams({ clave: carreraData.clave });
        const response = await fetch(`/api/carrera?${params.toString()}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'No se pudieron cargar las competencias curriculares.');
        }

        if (isCurrent) {
          setCompetencias(obtenerSkillsCurriculares(result.materias || []));
        }
      } catch (loadError) {
        if (isCurrent) {
          console.error('Error al cargar las skills curriculares:', loadError);
          setError(loadError.message || 'No se pudieron cargar las skills curriculares.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    cargarCompetencias();
    return () => { isCurrent = false; };
  }, [carrera]);

  if (loading) {
    return <p className="saved-skills-message">Cargando tus skills guardadas...</p>;
  }

  if (error) {
    return <p role="alert" className="saved-skills-error">{error}</p>;
  }

  return (
    <main className="saved-skills-page">
      <h2 className="saved-skills-title">Mis skills guardadas</h2>
      <p className="saved-skills-description">
        Consulta tu progreso curricular y administra las skills personales guardadas en tu cuenta.
      </p>
      <SkillsTracker competenciasCurriculares={competencias} />
    </main>
  );
}