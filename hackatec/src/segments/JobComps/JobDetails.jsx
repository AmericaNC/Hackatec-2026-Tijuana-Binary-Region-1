import React from 'react';
import './../jobBoardStyles.css';

export default function JobDetails({ job, isBookmarked, onToggleBookmark }) {
  if (!job) {
    return (
      <section className="job-details-empty">
        <div>Selecciona una oferta para ver los detalles</div>
      </section>
    );
  }

  return (
    <section className="job-details-section">
      <div className="details-header">
        <h1 className="details-title" style={{ fontSize: '24px' }}>{job.nombre_empleo}</h1>
        <div className="details-meta">
          <span className="details-date">
            {new Date(job.created_at).toLocaleDateString()}
          </span>
          <button 
            className={`bookmark-btn ${isBookmarked ? 'active' : 'inactive'}`}
            onClick={() => onToggleBookmark('job', job.id)}
          >
            🔖
          </button>
        </div>
      </div>

      <div className="details-body">
        <div className="details-content">
          {job.descripcion}
          <br/><br/>
          <strong>Localidad:</strong> {job.localidad || 'No especificada'}
        </div>
        <div className="details-images-column">
          <div className="details-image-placeholder">Img 1</div>
          <div className="details-image-placeholder">Img 2</div>
        </div>
      </div>

      <div className="details-actions">
        <button className="apply-btn">
          ✉️ Apply
        </button>
      </div>
    </section>
  );
}