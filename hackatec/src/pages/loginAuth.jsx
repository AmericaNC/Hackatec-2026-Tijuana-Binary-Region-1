import { useState } from 'react'
import { supabase } from '../supabaseClient'
import LoginView from './loginView'

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

  // Renderizamos el componente visual pasándole el estado y las funciones necesarias
  return (
    <LoginView
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      loading={loading}
      error={error}
      handleLogin={handleLogin}
      onGoToRegister={onGoToRegister}
    />
  )
}