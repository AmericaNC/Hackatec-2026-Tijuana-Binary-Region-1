import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import LoginAuth from './pages/loginAuth'
import RegisterAuth from './pages/registerAuth'
import RegisterProfile from './pages/registerProfile'
import DocumentUploader from './pages/skills-extract'
import SistemasDashboard from './segments/sistemasComputacionales'
import ElectronicaDashboard from './segments/electronica'
import EmploymentBoard from './components/EmploymentBoard'
import SavedSkillsPage from './components/SavedSkillsPage'
import LandingView from './pages/landingView.jsx' // <-- Importamos la nueva Landing

function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [registeredUid, setRegisteredUid] = useState(null)
  const [registeredAccountType, setRegisteredAccountType] = useState(null)
  
  // Estados de navegación
  const [showLanding, setShowLanding] = useState(true) // <-- Nuevo estado para la Landing
  const [isRegisterView, setIsRegisterView] = useState(false)
  const [showSkillExtractor, setShowSkillExtractor] = useState(false)
  const [showSavedSkills, setShowSavedSkills] = useState(false)
  
  const [loading, setLoading] = useState(true)

  async function cargarPerfil(uid) {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()

    if (!error && data) {
      setPerfil(data)
      setLoading(false)
      return
    }

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (!empresaError && empresa) setPerfil({ ...empresa, tipo_cuenta: 'empresa' })
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setRegisteredUid(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text-900)' }}>Cargando aplicación...</div>
  }

  // CASO 1: Transición INMEDIATA tras el registro -> Formulario de perfil
  if (registeredUid && !perfil) {
    return (
      <RegisterProfile
        userId={registeredUid}
        tipoCuenta={registeredAccountType || 'estudiante'}
        onProfileComplete={(datosPerfil) => {
          setPerfil(datosPerfil)
          setRegisteredUid(null)
          setRegisteredAccountType(null)
        }}
      />
    )
  }

  // CASO 2: Usuario autenticado pero sin registro en BD
  if (session?.user && !perfil) {
    return (
      <RegisterProfile
        userId={session.user.id}
        tipoCuenta={session.user.user_metadata?.tipo_cuenta || 'estudiante'}
        onProfileComplete={(datosPerfil) => {
          setPerfil(datosPerfil)
        }}
      />
    )
  }

  // CASO 3: Sin sesión activa (Flujo público)
  if (!session) {
    // 3.1: Mostrar Landing Page por defecto
    if (showLanding) {
      return <LandingView onEnterApp={() => setShowLanding(false)} />
    }

    // 3.2: Mostrar Login o Registro según corresponda
    return isRegisterView ? (
      <RegisterAuth
        onAuthSuccess={(uid, tipoCuenta) => {
          setRegisteredUid(uid)
          setRegisteredAccountType(tipoCuenta)
        }}
        onGoToLogin={() => setIsRegisterView(false)}
      />
    ) : (
      <LoginAuth
        onGoToRegister={() => setIsRegisterView(true)}
      />
    )
  }

  // CASO 4: Sesión iniciada y Perfil completo -> Discriminación por Carrera
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px' }}>
        {perfil?.tipo_cuenta !== 'empresa' && (
          <>
            <button
              className="login-button"
              style={{ padding: '8px 16px' }}
              onClick={() => {
                setShowSkillExtractor((current) => !current)
                setShowSavedSkills(false)
              }}
            >
              {showSkillExtractor ? 'Volver al panel' : 'Extraer competencias'}
            </button>
            <button
              className="login-button"
              style={{ padding: '8px 16px' }}
              onClick={() => {
                setShowSavedSkills((current) => !current)
                setShowSkillExtractor(false)
              }}
            >
              {showSavedSkills ? 'Volver al panel' : 'Mis skills'}
            </button>
          </>
        )}
        <button className="login-btn-verify" style={{ backgroundColor: '#dc2626' }} onClick={() => {
          supabase.auth.signOut()
          setShowLanding(true) // Regresar a la landing al cerrar sesión
        }}>Cerrar Sesión</button>
      </div>

      {perfil?.tipo_cuenta === 'empresa' ? (
        <EmploymentBoard user={session.user} tipoCuenta="empresa" />
      ) : showSkillExtractor ? (
        <DocumentUploader carrera={perfil?.carrera} matricula={perfil?.matricula} />
      ) : showSavedSkills ? (
        <SavedSkillsPage carrera={perfil?.carrera} />
      ) : (
        <>
          {perfil?.carrera === 'Ingeniería en Sistemas Computacionales' ? (
            <SistemasDashboard user={session.user} perfil={perfil} />
          ) : perfil?.carrera === 'Ingeniería Electrónica' ? (
            <ElectronicaDashboard user={session.user} perfil={perfil} />
          ) : (
            <div style={{ padding: '20px', color: 'var(--text-900)' }}>
              <h2>Panel General</h2>
              <p>Bienvenido, {perfil?.nombre}</p>
            </div>
          )}
          <EmploymentBoard user={session.user} tipoCuenta="estudiante" carrera={perfil?.carrera} />
        </>
      )}
    </div>
  )
}

export default App