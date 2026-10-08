import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import OffersList from './JobComps/OffersList';
import JobDetails from './JobComps/JobDetails';
import CompanyDetails from './JobComps/CompanyDetails';
import './jobBoardStyles.css';

export default function DynamicJobBoard({ perfil }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedJobs, setBookmarkedJobs] = useState(new Set());
  const [bookmarkedCompanies, setBookmarkedCompanies] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function fetchJobs() {
      setLoading(true);
      
      // Consulta ajustada a las tablas 'empleos' y 'empresas'
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
        `);

      if (error) {
        console.error('Error al cargar ofertas:', error);
      } else if (data) {
        setJobs(data);
        if (data.length > 0) {
          setSelectedJob(data[0]);
        }
      }
      setLoading(false);
    }

    if (perfil) {
      fetchJobs();
    }
  }, [perfil]);

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

  if (loading) {
    return <div className="board-loading">Cargando ofertas de trabajo...</div>;
  }

  const companyId = selectedJob?.empresa_id;

  return (
    <div className="board-container">
      <header className="board-header">
        <div className="board-header-title">Demands / Offers</div>
        <div className="board-header-icons">
          <span>📁</span> <span>📁</span> <span>✉️</span> <span>💼</span> <span>💡</span> <span>👤</span>
        </div>
      </header>

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
    </div>
  );
}