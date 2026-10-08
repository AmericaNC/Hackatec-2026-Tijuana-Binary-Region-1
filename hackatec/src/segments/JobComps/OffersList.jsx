import './../jobBoardStyles.css';

export default function OffersList({ jobs = [], selectedJob, onSelectJob, searchQuery, setSearchQuery }) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es-MX');
  const filteredJobs = jobs.filter((job) => {
    const searchableText = [
      job.nombre_empleo,
      job.puesto_trabajo,
      job.descripcion,
      job.prestaciones,
      job.areas_oportunidad,
      ...(job.carreras_dirigidas || []),
    ].filter(Boolean).join(' ').toLocaleLowerCase('es-MX');
    return searchableText.includes(normalizedQuery);
  });

  return (
    <section className="offers-section">
      <div className="offers-search">
        <label className="offers-search-label" htmlFor="offers-search-input">Buscar vacantes</label>
        <input
          id="offers-search-input"
          type="search"
          className="offer-search-input"
          placeholder="Puesto, empresa o carrera"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
      <div className="offers-list-container">
        <h3 className="offers-header-title">Offers</h3>
        {filteredJobs.length === 0 ? (
          <p className="offers-empty">{jobs.length ? 'No hay vacantes que coincidan con la búsqueda.' : 'No hay ofertas disponibles.'}</p>
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
    </section>
  );
}