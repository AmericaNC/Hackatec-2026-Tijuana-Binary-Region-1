import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Header from './Header'; // Adjust import path if Header is in another folder (e.g., '../segments/Header')
import OffersList from './JobComps/OffersList';
import JobDetails from './JobComps/JobDetails';
import CompanyDetails from './JobComps/CompanyDetails';
import './jobBoardStyles.css';

export default function DynamicJobBoard({
  perfil,
  showSkillExtractor,
  showSavedSkills,
  showStudyPlans,
  onToggleExtractor,
  onToggleSavedSkills,
  onToggleStudyPlans,
  onLogout,
  currentArea = "Demands / Offers"
}) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedJobs, setBookmarkedJobs] = useState(new Set());
  const [bookmarkedCompanies, setBookmarkedCompanies] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      if (!perfil?.carrera) {
        setJobs([]);
        setSelectedJob(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('empleos')
          .select(`
            id, 
            empresa_id,
            nombre_empleo, 
            puesto_trabajo, 
            descripcion, 
            prestaciones, 
            areas_oportunidad, 
            carreras_dirigidas, 
            created_at
          `)
          .contains('carreras_dirigidas', [perfil.carrera]);

        if (error) {
          console.error('Error al cargar ofertas:', error);
        } else if (data) {
          setJobs(data);
          setSelectedJob(data[0] || null);
        }
      } catch (err) {
        console.error('Error inesperado al conectar con Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [perfil?.id, perfil?.carrera]);

  const toggleBookmark = (type, id) => {
    if (type === 'job') {
      const newBookmarks = new Set(bookmarkedJobs);
      newBookmarks.has(id) ? newBookmarks.delete(id) : newBookmarks.add(id);
      setBookmarkedJobs(newBookmarks);
    } else {
      const newBookmarks = new Set(bookmarkedCompanies);
      newBookmarks.has(id) ? newBookmarks.delete(id) : newBookmarks.add(id);
      setBookmarkedCompanies(newBookmarks);
    }
  };

  const companyId = selectedJob?.empresa_id;

  return (
    <div className="board-container">
      {/* Replaced raw inline header with Header component */}
      <Header
        title={currentArea}
        perfil={perfil}
        showSkillExtractor={showSkillExtractor}
        showSavedSkills={showSavedSkills}
        showStudyPlans={showStudyPlans}
        onToggleExtractor={onToggleExtractor}
        onToggleSavedSkills={onToggleSavedSkills}
        onToggleStudyPlans={onToggleStudyPlans}
        onLogout={onLogout}
      />

      {loading ? (
        <div className="board-loading">Cargando ofertas de trabajo...</div>
      ) : (
        <main className="board-main">
          <OffersList 
            jobs={jobs} 
            selectedJob={selectedJob}
            onSelectJob={setSelectedJob} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery}
          />

          <JobDetails 
            job={selectedJob} 
            isBookmarked={selectedJob ? bookmarkedJobs.has(selectedJob.id) : false} 
            onToggleBookmark={toggleBookmark}
          />

          <CompanyDetails 
            company={companyId}
            isBookmarked={companyId ? bookmarkedCompanies.has(companyId) : false}
            onToggleBookmark={toggleBookmark}
          />
        </main>
      )}
    </div>
  );
}