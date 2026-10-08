import { useEffect, useRef, useState } from 'react';
import { BookOpen, Briefcase, IdCard, Lightbulb, LogOut, UserRound } from 'lucide-react';

export default function Header({
  title = "Demands / Offers",
  perfil,
  showSkillExtractor,
  showSavedSkills,
  showStudyPlans,
  onToggleExtractor,
  onToggleSavedSkills,
  onToggleStudyPlans,
  onOpenProfile,
  onLogout
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!showProfileMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setShowProfileMenu(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowProfileMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu]);

  const accountType = perfil?.tipo_cuenta === 'empresa' ? 'Empresa o empleador' : 'Estudiante';

  return (
    <header className="board-header">
      <div className="board-header-title">{title}</div>

      <div className="board-header-icons">
        {/* Botones de navegación solo para usuarios no-empresa */}
        {perfil?.tipo_cuenta !== 'empresa' && (
          <>
            <button
              className={`icon-btn ${showSavedSkills ? 'active' : ''}`}
              title={showSavedSkills ? "Volver al panel de empleos" : "Mis skills"}
              aria-label={showSavedSkills ? "Volver al panel de empleos" : "Mis skills"}
              onClick={onToggleSavedSkills}
            >
              <Briefcase aria-hidden="true" size={18} strokeWidth={2} />
            </button>

            <button
              className={`icon-btn ${showStudyPlans ? 'active' : ''}`}
              title={showStudyPlans ? "Volver al panel" : "Mis planes de estudio"}
              aria-label="Mis planes de estudio"
              onClick={onToggleStudyPlans}
            >
              <BookOpen aria-hidden="true" size={18} strokeWidth={2} />
            </button>

            <button
              className={`icon-btn ${showSkillExtractor ? 'active' : ''}`}
              title={showSkillExtractor ? "Volver al panel" : "Temarios y calificaciones"}
              aria-label="Temarios y calificaciones"
              onClick={onToggleExtractor}
            >
              <Lightbulb aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          </>
        )}

        <div className="header-profile-menu" ref={profileMenuRef}>
          <button
            className="icon-btn header-profile-avatar"
            title="Perfil"
            aria-label="Perfil de usuario"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            aria-controls="profile-dropdown-menu"
            onClick={() => setShowProfileMenu((prev) => !prev)}
          >
            {perfil?.foto_url || perfil?.avatar_url ? (
              <img src={perfil.foto_url || perfil.avatar_url} alt="Profile" className="avatar-img" />
            ) : (
              <span className="avatar-placeholder"><UserRound aria-hidden="true" size={19} /></span>
            )}
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown" id="profile-dropdown-menu" role="menu" aria-label="Menú de perfil">
              <div className="profile-dropdown-info">
                <span className="profile-name">{perfil?.nombre || perfil?.email || 'Mi Perfil'}</span>
                <span className="profile-role">{accountType}</span>
              </div>
              <button
                className="dropdown-profile-btn"
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenProfile?.();
                }}
              >
                <IdCard aria-hidden="true" size={17} />
                <span>Ver perfil</span>
              </button>
              <hr className="dropdown-divider" />
              <button className="dropdown-logout-btn" type="button" role="menuitem" onClick={onLogout}>
                <LogOut aria-hidden="true" size={17} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}