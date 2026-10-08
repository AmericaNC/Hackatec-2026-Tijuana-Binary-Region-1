import React from 'react';
import './../jobBoardStyles.css';

export default function OffersList({ jobs = [], selectedJob, onSelectJob, searchQuery, setSearchQuery }) {
  const filteredJobs = jobs.filter(job => {
    const titleMatch = (job.nombre_empleo).toLowerCase().includes(searchQuery.toLowerCase());
    const tagMatch = job.carreras_dirigidas?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return titleMatch || tagMatch;
  });

  return (
    <section className="offers-section">
      <div className="offers-list-container">
        <h3 className="offers-header-title">Offers</h3>
        {filteredJobs.length === 0 ? (
          <p className="offers-empty">No hay ofertas disponibles.</p>
        ) : (
          filteredJobs.map(job => (
            <div 
              key={job.id} 
              onClick={() => onSelectJob(job)}
              className={`offer-item ${selectedJob?.id === job.id ? 'selected' : ''}`}
            >
              <strong>{job.nombre_empleo}</strong>
              <div className="offer-tags">
                Tags: {job.carreras_dirigidas?.join(', ') || 'Sin tags'}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="offers-search-footer">
        <input 
          type="text" 
          className="offer-search-input"
          placeholder="Search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </section>
  );
}