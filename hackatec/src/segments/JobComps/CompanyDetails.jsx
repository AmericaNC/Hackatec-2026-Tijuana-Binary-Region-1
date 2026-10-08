import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
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

        // Support callers that already provide the public company record.
        if (typeof company === 'object') {
          if (!cancelled) {
            setCompanyData(company);
          }
          return;
        }

        const { data, error: companyError } = await supabase
          .from('empresas_publicas')
          .select('id, nombre, direccion, created_at')
          .eq('id', company)
          .maybeSingle();

        if (companyError) {
          throw new Error(`No se pudo obtener la empresa: ${companyError.message}`);
        }

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
          {error}
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
        <div className="company-box-large">
          <strong>Empresa</strong>
          <p>{companyData.nombre}</p>
        </div>
        <div className="company-box-small">
          <strong>Ubicación</strong>
          <p>{companyData.direccion || 'No especificada'}</p>
        </div>
        <div className="company-box-small">
          <strong>Publicación</strong>
          <p>
            {companyData.created_at
              ? new Date(companyData.created_at).toLocaleDateString()
              : 'Fecha no disponible'}
          </p>
        </div>
      </div>
    </section>
  );
}