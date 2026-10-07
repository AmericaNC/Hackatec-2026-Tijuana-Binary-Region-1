import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    if (isSignUp) {
      // REGISTRO DE USUARIO
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage('¡Registro exitoso! Revisa tu correo si tienes confirmación activada.')
      }
    } else {
      // INICIO DE SESIÓN
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        if (onLoginSuccess) onLoginSuccess(data.user)
      }
    }
    setLoading(false)
  }

  return (
    <div style={styles.card}>
      <h2>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleAuth} style={styles.form}>
        <input
          type="email"
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Cargando...' : isSignUp ? 'Registrarse' : 'Ingresar'}
        </button>
      </form>

      <p style={styles.toggleText}>
        {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setError(null)
            setMessage(null)
          }}
          style={styles.toggleBtn}
        >
          {isSignUp ? 'Inicia Sesión' : 'Regístrate aquí'}
        </button>
      </p>
    </div>
  )
}

const styles = {
  card: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '30px',
    border: '1px solid #ddd',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
    fontFamily: 'sans-serif'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc' },
  button: { padding: '12px', fontSize: '16px', borderRadius: '6px', border: 'none', backgroundColor: '#3ecf8e', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
  error: { backgroundColor: '#ffe6e6', color: '#d93025', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
  success: { backgroundColor: '#e6ffe6', color: '#137333', padding: '10px', borderRadius: '6px', marginBottom: '15px' },
  toggleText: { marginTop: '20px', fontSize: '14px' },
  toggleBtn: { background: 'none', border: 'none', color: '#0066cc', cursor: 'pointer', textDecoration: 'underline', marginLeft: '5px' }
}