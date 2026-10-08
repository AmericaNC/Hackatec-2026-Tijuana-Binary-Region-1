import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import RegisterView from './RegisterView'

export default function RegisterAuth({ onAuthSuccess, onGoToLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState('estudiante')
  const [nombre, setNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [carrera, setCarrera] = useState('')
  const [academia, setAcademia] = useState('')
  const [carreras, setCarreras] = useState([])
  const [cargandoCarreras, setCargandoCarreras] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function cargarCarreras() {
      const { data, error: careersError } = await supabase
        .from('carreras')
        .select('nombre, permiso_acceso')
        .order('nombre', { ascending: true })

      if (!isCurrent) return
      if (careersError) {
        setError(`No se pudieron cargar las carreras: ${careersError.message}`)
      } else {
        const availableCareers = (data || [])
          .filter(({ permiso_acceso: permission }) => permission !== false)
          .map(({ nombre: careerName }) => careerName)
        setCarreras(availableCareers)
        setCarrera((current) => current || availableCareers[0] || '')
      }
      setCargandoCarreras(false)
    }

    cargarCarreras()
    return () => { isCurrent = false }
  }, [])

  const validarCorreoEstudiante = () => {
    const domain = email.trim().toLowerCase().split('@')[1] || ''
    const deniedDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com']
    const allowedDomains = [
      'tectijuana.edu.mx',
      'ti.tectijuana.edu.mx',
      'tectijuana.mx',
      'uabc.edu.mx',
      'tijuana.tecnm.mx',
      'tecnm.mx',
    ]
    const isInstitutional = allowedDomains.some((allowed) => (
      domain === allowed || domain.endsWith(`.${allowed}`)
    )) || domain.endsWith('.edu.mx') || domain.endsWith('.tecnm.mx')

    return domain && !deniedDomains.includes(domain) && isInstitutional
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStatus('')

    if (tipoCuenta === 'estudiante') {
      if (!validarCorreoEstudiante()) {
        setError('Para registrarte como estudiante utiliza un correo institucional autorizado.')
        setLoading(false)
        return
      }
      if (!nombre.trim() || !matricula.trim() || !academia.trim() || !carrera) {
        setError('Completa nombre, matrícula, carrera y academia para crear tu perfil estudiantil.')
        setLoading(false)
        return
      }
      if (!carreras.includes(carrera)) {
        setError('La carrera seleccionada no está habilitada para registro.')
        setLoading(false)
        return
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          tipo_cuenta: tipoCuenta,
          ...(tipoCuenta === 'estudiante' ? {
            nombre: nombre.trim(),
            matricula: matricula.trim(),
            carrera,
            academia: academia.trim(),
          } : {}),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      onAuthSuccess?.(data.user.id, tipoCuenta)
      setStatus(data.session
        ? 'Cuenta creada. Tu perfil académico ya está guardado.'
        : 'Cuenta creada. Confirma tu correo para iniciar sesión; tus datos académicos ya quedaron registrados.')
    }
    setLoading(false)
  }

  return (
    <RegisterView
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      tipoCuenta={tipoCuenta} setTipoCuenta={setTipoCuenta}
      nombre={nombre} setNombre={setNombre}
      matricula={matricula} setMatricula={setMatricula}
      carrera={carrera} setCarrera={setCarrera}
      academia={academia} setAcademia={setAcademia}
      carreras={carreras} cargandoCarreras={cargandoCarreras}
      loading={loading} error={error} status={status}
      handleRegister={handleRegister} onGoToLogin={onGoToLogin}
      theme={theme} onToggleTheme={onToggleTheme}
    />
  )
}