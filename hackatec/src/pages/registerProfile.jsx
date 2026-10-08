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

// Helper para normalizar textos
const normalizarTexto = (texto) => {
  if (!texto) return ''
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export default function RegisterProfile({ userId, onProfileComplete }) {
  // --- ESTADOS DE FORMULARIO ---
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [carrera, setCarrera] = useState('Ingeniería en Sistemas Computacionales')
  const [academia, setAcademia] = useState('Sistemas y Computación')
  const [activo, setActivo] = useState(true)

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

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = user ? user.id : userId

      // PASO 1: VERIFICAR CARRERA
      const { data: listaCarreras } = await supabase.from('carreras').select('*')
      if (listaCarreras) {
        const normCarreraUI = normalizarTexto(carrera)
        const carreraEncontrada = listaCarreras.find((item) => {
          const normBD = normalizarTexto(item.nombre)
          return normBD.includes(normCarreraUI) || normCarreraUI.includes(normBD)
        })

        if (carreraEncontrada && carreraEncontrada.permiso_acceso === false) {
          throw new Error(`⛔ Acceso Denegado: La carrera "${carreraEncontrada.nombre}" no tiene permiso de acceso habilitado.`)
        }
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

      // PASO 3: ALUMNOS
      const alumnoPayload = {
        matricula: matricula.trim(),
        nombre: nombre.trim(),
        carrera: carrera,
        academia: academia.trim(),
        activo: activo,
        uid: targetUserId || null
      }

      const { error: errAlumno } = await supabase.from('alumnos').upsert([alumnoPayload], { onConflict: 'matricula' })
      if (errAlumno) throw new Error(`Error al registrar en tabla alumnos: ${errAlumno.message}`)

      // PASO 4: PERFILES
      if (targetUserId) {
        const profilePayload = {
          id: targetUserId,
          nombre: nombre.trim(),
          matricula: matricula.trim(),
          carrera: carrera,
          foto_url: fotoUrl || null,
          verificado: true
        }

        const { error: errPerfil } = await supabase.from('perfiles').upsert([profilePayload], { onConflict: 'id' })
        if (errPerfil) console.warn('Advertencia al guardar perfiles:', errPerfil.message)
      }

      setStatusMsg('✅ ¡Registro completado e información guardada exitosamente en la base de datos!')

      if (onProfileComplete) {
        onProfileComplete({
          nombre: nombre.trim(),
          matricula: matricula.trim(),
          carrera: carrera,
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
      loading={loading} validando={validando}
      error={error} statusMsg={statusMsg}
      fotoPreview={fotoPreview} correoValidado={correoValidado}
      handleVerificarCorreo={handleVerificarCorreo}
      handleFileInput={handleFileInput}
      handleRegistrarAlumno={handleRegistrarAlumno}
    />
  )
}