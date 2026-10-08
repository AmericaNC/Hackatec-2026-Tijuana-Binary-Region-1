import { useState } from 'react';

export default function Header({
  title = "Demands / Offers",
  perfil,
  showSkillExtractor,
  showSavedSkills,
  showStudyPlans,
  onToggleExtractor,
  onToggleSavedSkills,
  onToggleStudyPlans,
  onLogout
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="board-header">
      <div className="board-header-title">{title}</div>

      <div className="board-header-icons">
        {/* Botones de navegación solo para usuarios no-empresa */}
        {perfil?.tipo_cuenta !== 'empresa' && (
          <>
            {/* 💼 Mis Skills */}
            <button
              className={`icon-btn ${showSavedSkills ? 'active' : ''}`}
              title={showSavedSkills ? "Volver al panel" : "Mis skills"}
              aria-label="Mis skills"
              onClick={onToggleSavedSkills}
            >
              💼
            </button>

            <button
              className={`icon-btn ${showStudyPlans ? 'active' : ''}`}
              title={showStudyPlans ? "Volver al panel" : "Mis planes de estudio"}
              aria-label="Mis planes de estudio"
              onClick={onToggleStudyPlans}
            >
              📚
            </button>

            {/* 💡 Extraer Competencias */}
            <button
              className={`icon-btn ${showSkillExtractor ? 'active' : ''}`}
              title={showSkillExtractor ? "Volver al panel" : "Extraer competencias"}
              aria-label="Extraer competencias"
              onClick={onToggleExtractor}
            >
              💡
            </button>
          </>
        )}

        {/* 👤 Botón de Perfil con Menú Desplegable */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn header-profile-avatar"
            title="Perfil"
            aria-label="Perfil de usuario"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt="Profile" className="avatar-img" />
            ) : (
              <span className="avatar-placeholder">👤</span>
            )}
          </button>

          {/* Submenú de Perfil */}
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-info">
                <span className="profile-name">{perfil?.nombre || perfil?.email || 'Mi Perfil'}</span>
                <span className="profile-role">{perfil?.tipo_cuenta || 'Estudiante'}</span>
              </div>
              <hr className="dropdown-divider" />
              <button className="dropdown-logout-btn" onClick={onLogout}>
                🚪 Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}