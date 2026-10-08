import { useState } from 'react'
import { supabase } from '../supabaseClient'
import RegisterView from './RegisterView'

export default function RegisterAuth({ onAuthSuccess, onGoToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState('estudiante')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { tipo_cuenta: tipoCuenta } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      onAuthSuccess(data.user.id, tipoCuenta)
    }
    setLoading(false)
  }

  return (
    <RegisterView
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      tipoCuenta={tipoCuenta} setTipoCuenta={setTipoCuenta}
      loading={loading} error={error}
      handleRegister={handleRegister} onGoToLogin={onGoToLogin}
    />
  )
}