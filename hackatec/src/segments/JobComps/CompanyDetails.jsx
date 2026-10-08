import React, { useEffect, useState } from 'react';
import './../jobBoardStyles.css';

export default function CompanyDetails({
  company,
  isBookmarked,
  onToggleBookmark
}) {
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      if (!company) {
        setCompanyData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // If `company` is already the complete object,
        // there is nothing to fetch.
        if (typeof company === 'object') {
          if (!cancelled) {
            setCompanyData(company);
          }
          return;
        }

        // Otherwise, fetch the company using its ID.
        const response = await fetch(`/api/companies/${company}`);

        if (!response.ok) {
          throw new Error('No se pudo obtener la empresa.');
        }

        const data = await response.json();

        if (!cancelled) {
          setCompanyData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setCompanyData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCompany();

    return () => {
      cancelled = true;
    };
  }, [company]);

  if (loading) {
    return (
      <section className="company-details-empty">
        <p className="company-description">
          Cargando información de la empresa...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="company-details-empty">
        <p className="company-description">
          Error al cargar la empresa: {error}
        </p>
      </section>
    );
  }

  if (!companyData) {
    return (
      <section className="company-details-empty">
        <p className="company-description">
          No se encontró información de la empresa.
        </p>
      </section>
    );
  }

  return (
    <section className="company-details-section">
      <div className="details-header">
        <h2
          className="details-title"
          style={{ fontSize: '20px' }}
        >
          {companyData.nombre}
        </h2>

        <button
          className={`bookmark-btn ${
            isBookmarked ? 'active' : 'inactive'
          }`}
          onClick={() =>
            onToggleBookmark('company', companyData.id)
          }
        >
          🔖
        </button>
      </div>

      <div className="company-grid">
        <div className="company-box-large"></div>
        <div className="company-box-small"></div>
        <div className="company-box-small"></div>
      </div>

      <p className="company-description">
        {companyData.direccion || 'Sin descripción disponible.'}
      </p>
    </section>
  );
}