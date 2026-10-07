import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SupabaseLogin({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (isSignUp) {
        // REGISTRO DE NUEVO USUARIO
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        // Si la confirmación de email está activa en Supabase
        if (data?.user && data?.session === null) {
          setSuccessMsg('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.')
        } else {
          setSuccessMsg('¡Cuenta creada e inicio de sesión automático!')
          if (onLoginSuccess) onLoginSuccess(data.user)
        }
      } else {
        // INICIO DE SESIÓN
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (onLoginSuccess) onLoginSuccess(data.user)
      }
    } catch (error) {
      setErrorMsg(error.message || 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
        {successMsg && <div style={styles.successBox}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>{isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}</span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            style={styles.toggleBtn}
          >
            {isSignUp ? 'Inicia Sesión' : 'Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Estilos inline limpios (puedes reemplazarlos por CSS o Tailwind si prefieres)
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '2rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: '#0f172a',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    textAlign: 'left',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#334155',
  },
  input: {
    padding: '0.625rem 0.875rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    outline: 'none',
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '1.5rem',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#64748b',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontWeight: '600',
    cursor: 'pointer',
    marginLeft: '0.4rem',
    textDecoration: 'underline',
  },
  errorBox: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  successBox: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
}