import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginAuth({ onGoToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h2>Iniciar Sesión</h2>
      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>
      </form>

      <p style={{ marginTop: '15px', fontSize: '14px', textAlign: 'center' }}>
        ¿No tienes cuenta?{' '}
        <button onClick={onGoToRegister} style={styles.linkBtn}>
          Regístrate aquí
        </button>
      </p>
    </div>
  )
}

const styles = {
  card: { maxWidth: '380px', margin: '40px auto', padding: '24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1' },
  button: { padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  error: { color: '#dc2626', fontSize: '13px' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }
}