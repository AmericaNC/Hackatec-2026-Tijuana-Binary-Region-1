import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ActivityLog from '../components/ActivityLog';
import './UserProfilePage.css';

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'U';
}

export default function UserProfilePage({ session, perfil, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isCompany = perfil?.tipo_cuenta === 'empresa';

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        if (!session?.user?.id) throw new Error('Inicia sesión para consultar tu perfil.');

        if (isCompany) {
          const { data, error: companyError } = await supabase
            .from('empresas')
            .select('nombre, razon_social_rfc, direccion, created_at')
            .eq('id', session.user.id)
            .maybeSingle();

          if (companyError) throw new Error(`No se pudo cargar el perfil de empresa: ${companyError.message}`);
          if (!data) throw new Error('No se encontró el registro de esta empresa.');
          if (isCurrent) setDetails(data);
        } else {
          const [profileResult, studentResult] = await Promise.all([
            supabase
              .from('perfiles')
              .select('nombre, matricula, carrera, foto_url, verificado, created_at')
              .eq('id', session.user.id)
              .maybeSingle(),
            supabase
              .from('alumnos')
              .select('academia, activo')
              .eq('uid', session.user.id)
              .maybeSingle(),
          ]);

          if (profileResult.error) {
            throw new Error(`No se pudo cargar el perfil académico: ${profileResult.error.message}`);
          }
          if (studentResult.error) {
            throw new Error(`No se pudo cargar el registro de estudiante: ${studentResult.error.message}`);
          }

          const studentProfile = {
            ...perfil,
            ...profileResult.data,
            ...studentResult.data,
          };
          if (!studentProfile.nombre || !studentProfile.carrera || !studentProfile.matricula) {
            throw new Error('El perfil académico está incompleto. Revisa tu registro.');
          }
          if (isCurrent) setDetails(studentProfile);
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || 'No se pudo cargar tu perfil.');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    loadProfile();
    return () => { isCurrent = false; };
  }, [isCompany, perfil, session?.user?.id]);

  const displayName = details?.nombre || perfil?.nombre || session?.user?.email || 'Mi perfil';
  const photoUrl = details?.foto_url || perfil?.foto_url || perfil?.avatar_url;

  return (
    <main className="user-profile-page">
      <div className="user-profile-toolbar">
        <button className="user-profile-back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver al panel
        </button>
      </div>

      <section className="user-profile-content" aria-labelledby="user-profile-title">
        <header className="user-profile-heading">
          {photoUrl ? (
            <img className="user-profile-avatar" src={photoUrl} alt={`Foto de ${displayName}`} />
          ) : (
            <div className="user-profile-avatar user-profile-initials" aria-hidden="true">
              {getInitials(displayName)}
            </div>
          )}
          <div>
            <p className="user-profile-eyebrow">Perfil de {isCompany ? 'empresa' : 'estudiante'}</p>
            <h1 id="user-profile-title">{displayName}</h1>
            <p className="user-profile-email">{session?.user?.email}</p>
          </div>
        </header>

        {loading && <p className="user-profile-message" role="status">Cargando información del perfil...</p>}
        {!loading && error && <p className="user-profile-error" role="alert">{error}</p>}

        {!loading && !error && details && (
          <dl className="user-profile-details">
            {isCompany ? (
              <>
                <div>
                  <dt>Razón social o RFC</dt>
                  <dd>{details.razon_social_rfc}</dd>
                </div>
                <div>
                  <dt>Dirección</dt>
                  <dd>{details.direccion}</dd>
                </div>
                <div>
                  <dt>Tipo de cuenta</dt>
                  <dd>Empresa o empleador</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt>Carrera</dt>
                  <dd>{details.carrera}</dd>
                </div>
                <div>
                  <dt>Matrícula</dt>
                  <dd>{details.matricula}</dd>
                </div>
                <div>
                  <dt>Academia o departamento</dt>
                  <dd>{details.academia || 'Sin información'}</dd>
                </div>
                <div>
                  <dt>Estado de estudiante</dt>
                  <dd>{details.activo === false ? 'Inactivo' : 'Activo'}</dd>
                </div>
                <div>
                  <dt>Verificación</dt>
                  <dd>{details.verificado ? 'Verificado' : 'Pendiente'}</dd>
                </div>
              </>
            )}
          </dl>
        )}
      </section>
      {!isCompany && <ActivityLog userId={session.user.id} />}
    </main>
  );
}