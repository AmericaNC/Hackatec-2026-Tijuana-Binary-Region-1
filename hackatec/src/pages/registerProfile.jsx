import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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

    // 1. Bloquear correos personales
    if (DOMINIOS_PROHIBIDOS.includes(dominio)) {
      return {
        esValido: false,
        razon: `❌ El correo no puede ser personal (@${dominio}). Debe ser un correo institucional.`
      }
    }

    // 2. Comprobar contra la lista regional
    const perteneceAListaRegional = DOMINIOS_INSTITUCIONALES_REGIONALES.some(
      (d) => dominio === d || dominio.endsWith(`.${d}`)
    )

    // 3. O bien que cumpla la terminación institucional genérica (.edu.mx)
    const esEducativoMx = dominio.endsWith('.edu.mx') || dominio.endsWith('.tecnm.mx')

    if (perteneceAListaRegional || esEducativoMx) {
      return { esValido: true, razon: `✅ Correo institucional válido (@${dominio}).` }
    } else {
      return {
        esValido: false,
        razon: `❌ El dominio @${dominio} no pertenece a una institución educativa autorizada.`
      }
    }
  }

  // Action del botón de verificación de correo
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
  // REGISTRAR INFORMACIÓN EN LA BASE DE DATOS ('alumnos' y 'perfiles')
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

      // --------------------------------------------------
      // PASO 1: VERIFICAR LA CARRERA EN LA TABLA 'carreras'
      // --------------------------------------------------
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

      // --------------------------------------------------
      // PASO 2: SUBIR FOTO DE PERFIL (CON MANEJO INDEPENDIENTE DE ERRORES)
      // --------------------------------------------------
      let fotoUrl = null
      if (fotoPerfil && targetUserId) {
        try {
          const fileExt = fotoPerfil.name ? fotoPerfil.name.split('.').pop() : 'jpg'
          const fileName = `${targetUserId}_avatar.${fileExt}`
          const filePath = `avatars/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('perfiles-bucket')
            .upload(filePath, fotoPerfil, { contentType: fotoPerfil.type || 'image/jpeg', upsert: true })

          if (uploadError) {
            console.warn('⚠️ No se pudo subir la foto por permisos de Storage:', uploadError.message)
          } else {
            const { data: urlData } = supabase.storage
              .from('perfiles-bucket')
              .getPublicUrl(filePath)
            fotoUrl = urlData.publicUrl
          }
        } catch (imgErr) {
          console.warn('⚠️ Error secundario al procesar foto:', imgErr)
        }
      }

      // --------------------------------------------------
      // PASO 3: INSERTAR / ACTUALIZAR EN LA TABLA 'alumnos'
      // --------------------------------------------------
      const alumnoPayload = {
        matricula: matricula.trim(),
        nombre: nombre.trim(),
        carrera: carrera,
        academia: academia.trim(),
        activo: activo,
        uid: targetUserId || null
      }

      const { error: errAlumno } = await supabase
        .from('alumnos')
        .upsert([alumnoPayload], { onConflict: 'matricula' })

      if (errAlumno) throw new Error(`Error al registrar en tabla alumnos: ${errAlumno.message}`)

      // --------------------------------------------------
      // PASO 4: REGISTRAR EN LA TABLA 'perfiles'
      // --------------------------------------------------
      if (targetUserId) {
        const profilePayload = {
          id: targetUserId,
          nombre: nombre.trim(),
          matricula: matricula.trim(),
          carrera: carrera,
          foto_url: fotoUrl || null,
          verificado: true
        }

        const { error: errPerfil } = await supabase
          .from('perfiles')
          .upsert([profilePayload], { onConflict: 'id' })

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

  return (
    <div style={styles.card}>
      <h2>Registro Institucional de Alumno</h2>
      {error && <p style={styles.error}>{error}</p>}
      {statusMsg && <p style={styles.status}>{statusMsg}</p>}

      <form onSubmit={handleRegistrarAlumno} style={styles.form}>
        {/* CORREO ELECTRÓNICO */}
        <div>
          <label style={styles.label}>Correo Electrónico:</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => {
              setCorreo(e.target.value)
              setCorreoValidado(false)
            }}
            placeholder="ejemplo@tectijuana.edu.mx"
            required
            style={styles.input}
          />
        </div>

        {/* BOTÓN PARA VALIDAR DOMINIO */}
        <button
          type="button"
          onClick={handleVerificarCorreo}
          disabled={validando}
          style={styles.btnVerify}
        >
          {validando ? 'Comprobando Dominio...' : '🔍 Validar Correo Institucional'}
        </button>

        {/* ESTATUS DE VALIDACIÓN DEL CORREO */}
        <div
          style={{
            ...styles.badge,
            backgroundColor: correoValidado ? '#dcfce7' : '#fee2e2',
            color: correoValidado ? '#166534' : '#991b1b',
          }}
        >
          {correoValidado ? '✅ Dominio Institucional Autorizado' : '🔒 Requiere Correo Institucional (No Gmail)'}
        </div>

        {/* DATOS DE LA TABLA ALUMNOS */}
        <div>
          <label style={styles.label}>Matrícula / No. Control:</label>
          <input
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            required
            placeholder="Ej. 22211648"
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>Nombre Completo:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Ej. Juan Pérez González"
            style={styles.input}
          />
        </div>

        <div>
          <label style={styles.label}>Carrera:</label>
          <select 
            value={carrera} 
            onChange={(e) => setCarrera(e.target.value)} 
            style={styles.input}
          >
            <option value="Ingeniería en Sistemas Computacionales">Ingeniería en Sistemas Computacionales</option>
            <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
            <option value="Ingeniería en Inteligencia Artificial">Ingeniería en Inteligencia Artificial</option>
            <option value="Ingeniería Industrial">Ingeniería Industrial</option>
            <option value="Ingeniería Mechatrónica">Ingeniería Mecatrónica</option>
          </select>
        </div>

        <div>
          <label style={styles.label}>Academia / Departamento:</label>
          <input
            type="text"
            value={academia}
            onChange={(e) => setAcademia(e.target.value)}
            placeholder="Ej. Sistemas y Computación"
            style={styles.input}
          />
        </div>

        {/* ESTATUS DEL ALUMNO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={styles.label}>Estatus del Alumno:</label>
          <label style={{ fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            {' '}{activo ? 'Activo (Permitir Acceso)' : 'Inactivo'}
          </label>
        </div>

        {/* FOTO DE PERFIL */}
        <div style={styles.fileBox}>
          <label style={styles.label}>Foto de Perfil (Opcional):</label>
          <input type="file" accept="image/*" onChange={handleFileInput} style={styles.input} />
          {fotoPreview && (
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <img src={fotoPreview} alt="Preview" style={styles.avatarImg} />
            </div>
          )}
        </div>

        {/* BOTÓN REGISTRAR EN TABLA ALUMNOS Y BASE DE DATOS */}
        <button
          type="submit"
          disabled={loading || !correoValidado}
          style={{
            ...styles.button,
            backgroundColor: loading || !correoValidado ? '#94a3b8' : '#0284c7',
            cursor: loading || !correoValidado ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Guardando en Base de Datos...' : 'Registrar en Tabla Alumnos'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  card: { maxWidth: '420px', margin: '30px auto', padding: '24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'sans-serif', backgroundColor: '#ffffff' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box', marginTop: '4px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#1e293b' },
  button: { padding: '12px', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '15px' },
  btnVerify: { padding: '10px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
  fileBox: { padding: '10px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' },
  avatarImg: { width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0f766e' },
  badge: { padding: '10px', fontSize: '12px', textAlign: 'center', borderRadius: '4px', fontWeight: 'bold' },
  error: { color: '#dc2626', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#fef2f2', padding: '8px', borderRadius: '4px' },
  status: { color: '#0369a1', fontSize: '13px', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#f0f9ff', padding: '8px', borderRadius: '4px' }
}