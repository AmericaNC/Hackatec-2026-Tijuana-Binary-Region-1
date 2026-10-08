import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import RegisterProfileView from './RegisterProfileView' // Importamos la vista

// LISTA DE DOMINIOS INSTITUCIONALES RECONOCIDOS EN LA REGIÓN
const DOMINIOS_INSTITUCIONALES_REGIONALES = [
  'tectijuana.edu.mx',
  'ti.tectijuana.edu.mx',
  'tectijuana.mx',
  'uabc.edu.mx',
  'tijuana.tecnm.mx',
  'tecnm.mx'
]

// LISTA NEGRA DE DOMINIOS PERSONALES / NO INSTITUCIONALES
const DOMINIOS_PROHIBIDOS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
  'icloud.com'
]

export default function RegisterProfile({ userId, tipoCuenta = 'estudiante', onProfileComplete }) {
  // --- ESTADOS DE FORMULARIO ---
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [carrera, setCarrera] = useState('Ingeniería en Sistemas Computacionales')
  const [academia, setAcademia] = useState('Sistemas y Computación')
  const [activo, setActivo] = useState(true)
  const [razonSocialRfc, setRazonSocialRfc] = useState('')
  const [direccion, setDireccion] = useState('')

  // --- ESTADOS DE CONTROL Y UI ---
  const [loading, setLoading] = useState(false)
  const [validando, setValidando] = useState(false)
  const [error, setError] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')

  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)

  // Estado de aprobación de correo institucional
  const [correoValidado, setCorreoValidado] = useState(false)

  // ==========================================
  // OBTENER CORREO DE LA SESIÓN ACTUAL
  // ==========================================
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        setCorreo(user.email)
      }
    }
    obtenerUsuario()
  }, [])

  // ==========================================
  // VALIDACIÓN DE DOMINIO INSTITUCIONAL
  // ==========================================
  const validarDominioInstitucional = (email) => {
    if (!email || !email.includes('@')) {
      return { esValido: false, razon: 'Ingresa un correo electrónico válido.' }
    }

    const partes = email.trim().toLowerCase().split('@')
    const dominio = partes[1]

    if (DOMINIOS_PROHIBIDOS.includes(dominio)) {
      return { esValido: false, razon: `❌ El correo no puede ser personal (@${dominio}). Debe ser un correo institucional.` }
    }

    const perteneceAListaRegional = DOMINIOS_INSTITUCIONALES_REGIONALES.some(
      (d) => dominio === d || dominio.endsWith(`.${d}`)
    )

    const esEducativoMx = dominio.endsWith('.edu.mx') || dominio.endsWith('.tecnm.mx')

    if (perteneceAListaRegional || esEducativoMx) {
      return { esValido: true, razon: `✅ Correo institucional válido (@${dominio}).` }
    } else {
      return { esValido: false, razon: `❌ El dominio @${dominio} no pertenece a una institución educativa autorizada.` }
    }
  }

  const handleVerificarCorreo = () => {
    setValidando(true)
    setError(null)
    setStatusMsg('')

    const resultado = validarDominioInstitucional(correo)

    if (!resultado.esValido) {
      setError(resultado.razon)
      setCorreoValidado(false)
      setValidando(false)
      return
    }

    setCorreoValidado(true)
    setStatusMsg(resultado.razon)
    setValidando(false)
  }

  // ==========================================
  // MANEJO DE FOTO DE PERFIL
  // ==========================================
  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFotoPerfil(file)
      setFotoPreview(URL.createObjectURL(file))
    }
  }

  // ==========================================
  // REGISTRAR INFORMACIÓN EN LA BASE DE DATOS
  // ==========================================
  const handleRegistrarAlumno = async (e) => {
    e.preventDefault()

    if (tipoCuenta === 'empresa') {
      if (!nombre.trim() || !razonSocialRfc.trim() || !direccion.trim()) {
        setError('El nombre, la razón social o RFC y la dirección son obligatorios.')
        return
      }

      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const targetUserId = user ? user.id : userId
        if (!targetUserId) throw new Error('No se encontró el usuario de la sesión.')

        const empresaPayload = {
          id: targetUserId,
          nombre: nombre.trim(),
          razon_social_rfc: razonSocialRfc.trim(),
          direccion: direccion.trim()
        }
        const { error: errEmpresa } = await supabase
          .from('empresas')
          .upsert([empresaPayload], { onConflict: 'id' })
        if (errEmpresa) throw new Error(`Error al registrar la empresa: ${errEmpresa.message}`)

        setStatusMsg('Registro de empresa completado y guardado en la base de datos.')
        onProfileComplete?.({ ...empresaPayload, tipo_cuenta: 'empresa' })
      } catch (err) {
        console.error('Error durante el registro de empresa:', err)
        setError(err.message || 'Error al guardar la información de la empresa.')
      } finally {
        setLoading(false)
      }
      return
    }

    const checkDominio = validarDominioInstitucional(correo)
    if (!checkDominio.esValido) {
      setError(checkDominio.razon)
      setCorreoValidado(false)
      return
    }

    if (!matricula || matricula.trim() === '') {
      setError('❌ La matrícula / número de control es obligatorio.')
      return
    }

    if (!nombre || nombre.trim() === '') {
      setError('❌ El nombre completo es obligatorio.')
      return
    }

    if (!carrera?.trim()) {
      setError('Selecciona una carrera para completar el registro.')
      return
    }

    if (!academia?.trim()) {
      setError('La academia o departamento es obligatorio.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw new Error(`No se pudo verificar tu sesión: ${authError.message}`)
      const targetUserId = user ? user.id : userId
      if (!targetUserId || targetUserId !== user?.id) {
        throw new Error('La sesión no corresponde al usuario que intenta completar este perfil.')
      }

      // PASO 1: VERIFICAR CARRERA
      const { data: carreraData, error: carreraError } = await supabase
        .from('carreras')
        .select('nombre, permiso_acceso')
        .eq('nombre', carrera.trim())
        .maybeSingle()
      if (carreraError) throw new Error(`No se pudo verificar la carrera: ${carreraError.message}`)
      if (!carreraData) throw new Error('La carrera seleccionada no existe en el catálogo.')
      if (carreraData.permiso_acceso === false) {
        throw new Error(`⛔ Acceso denegado: la carrera "${carreraData.nombre}" no está habilitada para registro.`)
      }

      // PASO 2: SUBIR FOTO
      let fotoUrl = null
      if (fotoPerfil && targetUserId) {
        try {
          const fileExt = fotoPerfil.name ? fotoPerfil.name.split('.').pop() : 'jpg'
          const fileName = `${targetUserId}_avatar.${fileExt}`
          const filePath = `avatars/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('perfiles-bucket')
            .upload(filePath, fotoPerfil, { contentType: fotoPerfil.type || 'image/jpeg', upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('perfiles-bucket').getPublicUrl(filePath)
            fotoUrl = urlData.publicUrl
          }
        } catch (imgErr) {
          console.warn('⚠️ Error secundario al procesar foto:', imgErr)
        }
      }

      // PASO 3: ACTUALIZAR EL REGISTRO CREADO PARA EL UID AUTENTICADO.
      const { data: alumnoActualizado, error: errAlumno } = await supabase
        .from('alumnos')
        .update({
          matricula: matricula.trim(),
          nombre: nombre.trim(),
          carrera: carreraData.nombre,
          academia: academia.trim(),
          activo,
        })
        .eq('uid', targetUserId)
        .select('uid')
        .maybeSingle()

      if (errAlumno) throw new Error(`Error al guardar los datos del alumno: ${errAlumno.message}`)
      if (!alumnoActualizado) {
        throw new Error(
          'No existe un registro de alumno vinculado a esta cuenta. Completa el registro desde la pantalla de creación de cuenta o vuelve a iniciar sesión.',
        )
      }

      // PASO 4: PERFILES
      const profilePayload = {
        id: targetUserId,
        nombre: nombre.trim(),
        matricula: matricula.trim(),
        carrera: carreraData.nombre,
        foto_url: fotoUrl,
        verificado: true
      }
      const { error: errPerfil } = await supabase
        .from('perfiles')
        .upsert([profilePayload], { onConflict: 'id' })
      if (errPerfil) throw new Error(`Error al guardar el perfil: ${errPerfil.message}`)

      setStatusMsg('✅ ¡Registro completado e información guardada exitosamente en la base de datos!')

      if (onProfileComplete) {
        onProfileComplete({
          tipo_cuenta: 'estudiante',
          nombre: nombre.trim(),
          matricula: matricula.trim(),
          carrera: carreraData.nombre,
          correo: correo
        })
      }

    } catch (err) {
      console.error('Error durante el registro:', err)
      setError(err.message || 'Error al guardar la información en la base de datos.')
    } finally {
      setLoading(false)
    }
  }

  // Delegamos el render a la vista
  return (
    <RegisterProfileView
      correo={correo} setCorreo={(val) => { setCorreo(val); setCorreoValidado(false); }}
      nombre={nombre} setNombre={setNombre}
      matricula={matricula} setMatricula={setMatricula}
      carrera={carrera} setCarrera={setCarrera}
      academia={academia} setAcademia={setAcademia}
      activo={activo} setActivo={setActivo}
      tipoCuenta={tipoCuenta}
      razonSocialRfc={razonSocialRfc} setRazonSocialRfc={setRazonSocialRfc}
      direccion={direccion} setDireccion={setDireccion}
      loading={loading} validando={validando}
      error={error} statusMsg={statusMsg}
      fotoPreview={fotoPreview} correoValidado={correoValidado}
      handleVerificarCorreo={handleVerificarCorreo}
      handleFileInput={handleFileInput}
      handleRegistrarAlumno={handleRegistrarAlumno}
    />
  )
}