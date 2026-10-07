import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import SupabaseLogin from './pages/login'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Verificar si hay sesión iniciada al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escuchar eventos de inicio / cierre de sesión en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando aplicación...</p>
  }

  return (
    <div>
      {!session ? (
        <SupabaseLogin />
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'sans-serif' }}>
          <h1>¡Bienvenido a la Plataforma!</h1>
          <p>Has ingresado con: <strong>{session.user.email}</strong></p>

          <button
            onClick={handleLogout}
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '1rem',
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default App