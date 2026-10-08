import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Header from './segments/Header';
import DynamicJobBoard from './segments/DynamicJobBoard';
import EmploymentBoard from './components/EmploymentBoard';
import DocumentUploader from './pages/skills-extract';
import SavedSkillsPage from './components/SavedSkillsPage';
import MyClassroom from './segments/MyClassroom';
import StudyTaskExam from './segments/StudyTaskExam';
import ActivityLog from './components/ActivityLog';

// Importación de componentes de Autenticación
import LandingView from './pages/landingView'; // O la ruta donde guardaste LandingView
import LoginAuth from './pages/loginAuth';
import RegisterAuth from './pages/registerAuth'; // Si tienes vista de registro

export default function App() {
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estado para controlar la vista antes de iniciar sesión: 'landing' | 'login' | 'register'
  const [authView, setAuthView] = useState('landing');

  // Estados de navegación dentro de la app logueada
  const [showSkillExtractor, setShowSkillExtractor] = useState(false);
  const [showSavedSkills, setShowSavedSkills] = useState(false);
  const [showStudyPlans, setShowStudyPlans] = useState(false);
  const [examTaskId, setExamTaskId] = useState(() => new URLSearchParams(window.location.search).get('examen'));

  useEffect(() => {
    const syncExamRoute = (event) => {
      const nextTaskId = new URLSearchParams(window.location.search).get('examen');
      setExamTaskId(nextTaskId);
      if (!nextTaskId && event.state?.studyPlans) setShowStudyPlans(true);
    };

    window.addEventListener('popstate', syncExamRoute);
    return () => window.removeEventListener('popstate', syncExamRoute);
  }, []);

  async function fetchPerfil(userId, authUser) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) console.error('Error al cargar perfil:', error);

      let empresa = null;
      if (
        data?.tipo_cuenta === 'empresa'
        || authUser?.user_metadata?.tipo_cuenta === 'empresa'
        || (!data?.tipo_cuenta && !authUser?.user_metadata?.tipo_cuenta)
      ) {
        const { data: companyData, error: companyError } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('id', userId)
          .maybeSingle();

        if (companyError) console.error('Error al verificar cuenta de empresa:', companyError);
        else empresa = companyData;
      }

      const tipoCuenta = data?.tipo_cuenta
        || authUser?.user_metadata?.tipo_cuenta
        || (empresa ? 'empresa' : 'estudiante');

      setPerfil({
        ...data,
        tipo_cuenta: tipoCuenta,
        nombre: data?.nombre || empresa?.nombre || authUser?.user_metadata?.nombre || '',
      });
    } catch (err) {
      console.error('Error inesperado cargando perfil:', err);
    } finally {
      setLoading(false);
    }
  }

  // 1. Escuchar la sesión de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchPerfil(session.user.id, session.user);
      } else {
        setPerfil(null);
        setAuthView('landing'); // Regresar a landing si cierra sesión
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleToggleExtractor = () => {
    setShowSkillExtractor((curr) => !curr);
    setShowSavedSkills(false);
    setShowStudyPlans(false);
  };

  const handleToggleSavedSkills = () => {
    setShowSavedSkills((curr) => !curr);
    setShowSkillExtractor(false);
    setShowStudyPlans(false);
  };

  const handleToggleStudyPlans = () => {
    if (examTaskId) {
      const url = new URL(window.location.href);
      url.searchParams.delete('examen');
      window.history.replaceState({ studyPlans: true }, '', url);
      setExamTaskId(null);
      setShowStudyPlans(true);
      return;
    }
    setShowStudyPlans((curr) => !curr);
    setShowSkillExtractor(false);
    setShowSavedSkills(false);
  };

  const handleOpenExam = (taskId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('examen', taskId);
    window.history.replaceState({ studyPlans: true }, '', window.location.href);
    window.history.pushState({ exam: true }, '', url);
    setShowSkillExtractor(false);
    setShowSavedSkills(false);
    setShowStudyPlans(true);
    setExamTaskId(String(taskId));
  };

  const handleReturnToPlans = () => {
    if (window.history.state?.exam) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('examen');
    window.history.replaceState({ studyPlans: true }, '', url);
    setExamTaskId(null);
    setShowStudyPlans(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
    setAuthView('landing');
    setShowSkillExtractor(false);
    setShowSavedSkills(false);
    setShowStudyPlans(false);
  };

  const getHeaderTitle = () => {
    if (examTaskId) return 'Evaluación de tarea';
    if (showSkillExtractor) return 'Extraer Competencias';
    if (showSavedSkills) return 'Mis Skills Guardadas';
    if (showStudyPlans) return 'Mis planes de estudio';
    if (perfil?.tipo_cuenta === 'empresa') return 'Panel de Empresa';
    return 'Demands / Offers';
  };

  // 2. Cargando sesión inicial
  if (loading) {
    return <div className="board-loading">Cargando aplicación...</div>;
  }

  // 3. SI NO HAY SESIÓN ACTIVA -> Navegación no autenticada (Landing / Login / Register)
  if (!session) {
    if (authView === 'landing') {
      return <LandingView onEnterApp={() => setAuthView('login')} />;
    }

    if (authView === 'login') {
      return (
        <LoginAuth
          onGoToRegister={() => setAuthView('register')}
          onGoBack={() => setAuthView('landing')} // Opcional por si quieres botón de volver
        />
      );
    }

    if (authView === 'register') {
      return (
        <RegisterAuth
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  // 4. SI HAY SESIÓN ACTIVA -> Tableros de la aplicación
  return (
    <div className="app-container">
      {(showSkillExtractor || showSavedSkills || showStudyPlans || examTaskId || perfil?.tipo_cuenta === 'empresa') && (
        <Header
          title={getHeaderTitle()}
          perfil={perfil}
          showSkillExtractor={showSkillExtractor}
          showSavedSkills={showSavedSkills}
          showStudyPlans={showStudyPlans || Boolean(examTaskId)}
          onToggleExtractor={handleToggleExtractor}
          onToggleSavedSkills={handleToggleSavedSkills}
          onToggleStudyPlans={handleToggleStudyPlans}
          onLogout={handleLogout}
        />
      )}

      {perfil?.tipo_cuenta === 'empresa' ? (
        <EmploymentBoard user={session.user} tipoCuenta="empresa" />
      ) : examTaskId ? (
        <StudyTaskExam
          key={examTaskId}
          session={session}
          taskId={examTaskId}
          onBack={handleReturnToPlans}
        />
      ) : showSkillExtractor ? (
        <DocumentUploader carrera={perfil?.carrera} matricula={perfil?.matricula} />
      ) : showSavedSkills ? (
        <SavedSkillsPage carrera={perfil?.carrera} />
      ) : showStudyPlans ? (
        <MyClassroom session={session} onOpenExam={handleOpenExam} />
      ) : (
        <DynamicJobBoard
          perfil={perfil}
          session={session}
          showSkillExtractor={showSkillExtractor}
          showSavedSkills={showSavedSkills}
          showStudyPlans={showStudyPlans}
          onToggleExtractor={handleToggleExtractor}
          onToggleSavedSkills={handleToggleSavedSkills}
          onToggleStudyPlans={handleToggleStudyPlans}
          onLogout={handleLogout}
          currentArea={getHeaderTitle()}
        />
      )}
      {perfil?.tipo_cuenta !== 'empresa' && !showStudyPlans && !examTaskId && (
        <ActivityLog userId={session.user.id} />
      )}
    </div>
  );
}