import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'
import { BrowserMultiFormatReader } from '@zxing/library'
import { supabase } from '../supabaseClient' // Tu cliente de Supabase

export default function RegisterProfile({ userId, onProfileComplete }) {
  // --- 1. MANTÉN TUS ESTADOS ACTUALES ---
  const [nombre, setNombre] = useState('')
  const [matricula, setMatricula] = useState('')
  const [carrera, setCarrera] = useState('Ingeniería en Sistemas Computacionales')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // --- 2. AGREGA LOS NUEVOS ESTADOS PARA FOTO Y ESCANEO ---
  const [fotoPerfil, setFotoPerfil] = useState(null)          // File/Blob de la foto
  const [fotoPreview, setFotoPreview] = useState(null)        // URL para mostrar vista previa
  const [qrValidado, setQrValidado] = useState(false)         // Estado de validación del QR
  const [statusOCR, setStatusOCR] = useState('')              // Mensajes de avance (ej. "Leyendo credencial...")
  const [cameraActive, setCameraActive] = useState(false)     // Control de la cámara
  const videoRef = useRef(null)

  // ==========================================
  // A. MANEJO DE CÁMARA (Para foto de perfil / credencial)
  // ==========================================
  const startCamera = async () => {
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara.')
      console.error(err)
    }
  }

  const captureCameraPhoto = (tipo) => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      const file = new File([blob], `${tipo}_${Date.now()}.jpg`, { type: 'image/jpeg' })
      if (tipo === 'frente') {
        setFotoPerfil(file)
        setFotoPreview(URL.createObjectURL(file))
        procesarOCR(file)
      } else if (tipo === 'reverso') {
        procesarQR(file)
      }
    }, 'image/jpeg')

    // Detener la cámara tras capturar
    const stream = video.srcObject
    if (stream) stream.getTracks().forEach((track) => track.stop())
    setCameraActive(false)
  }

  // ==========================================
  // B. FUNCIÓN DE OCR (FRENTE DE LA CREDENCIAL)
  // ==========================================
  const procesarOCR = async (file) => {
    setStatusOCR('Analizando credencial con OCR...')
    setError(null)

    try {
      const result = await Tesseract.recognize(file, 'spa')
      const text = result.data.text

      // Extraer Número de Control (8 dígitos)
      const controlMatch = text.match(/Control:\s*(\d{8})/i) || text.match(/\b(\d{8})\b/)
      if (controlMatch) setMatricula(controlMatch[1])

      // Extraer Nombre Completo
      const nombreMatch = text.match(/Nombre:\s*([A-ZÁÉÍÓÚÑ\s]+)/i)
      if (nombreMatch) {
        setNombre(nombreMatch[1].trim().replace(/\n/g, ' '))
      }

      // Identificar Carrera automáticamente
      if (text.includes('SIST') || text.includes('ING.SIST.COMP.')) {
        setCarrera('Ingeniería en Sistemas Computacionales')
      } else if (text.includes('ELEC') || text.includes('ELECTRÓNICA')) {
        setCarrera('Ingeniería Electrónica')
      }

      setStatusOCR('¡Datos autocompletados desde la credencial!')
    } catch (err) {
      console.error(err)
      setError('No se pudieron leer los datos mediante OCR. Puedes llenarlos manualmente.')
    } finally {
      setStatusOCR('')
    }
  }

  // ==========================================
  // C. FUNCIÓN DE VALIDACIÓN DE QR (REVERSO)
  // ==========================================
  const procesarQR = async (file) => {
    setStatusOCR('Validando código QR del reverso...')
    setError(null)

    const reader = new BrowserMultiFormatReader()
    const imgUrl = URL.createObjectURL(file)

    try {
      const result = await reader.decodeFromImageUrl(imgUrl)
      const qrDataText = result.getText()

      // Comprobar si el contenido del QR contiene o coincide con la matrícula extraída
      if (matricula && !qrDataText.includes(matricula)) {
        setError(`⚠️ Precaución: El código QR no coincide con la matrícula (${matricula}).`)
        setQrValidado(false)
      } else {
        setQrValidado(true)
        setStatusOCR('✅ Credencial autenticada correctamente mediante QR.')
      }
    } catch (err) {
      console.error(err)
      setError('No se detectó un código QR válido en la imagen del reverso.')
      setQrValidado(false)
    } finally {
      setTimeout(() => setStatusOCR(''), 3000)
    }
  }

  // Carga manual desde explorador de archivos
  const handleFileInput = (e, tipo) => {
    const file = e.target.files[0]
    if (!file) return

    if (tipo === 'frente') {
      setFotoPerfil(file)
      setFotoPreview(URL.createObjectURL(file))
      procesarOCR(file)
    } else if (tipo === 'reverso') {
      procesarQR(file)
    }
  }

  // ==========================================
  // D. GUARDADO EN SUPABASE (TU GUARDADO ACTUALIZADO)
  // ==========================================
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let fotoUrl = null

      // 1. Subir la imagen capturada a Supabase Storage (si existe)
      if (fotoPerfil) {
        const fileExt = fotoPerfil.name.split('.').pop()
        const fileName = `${userId}_avatar.${fileExt}`
        const filePath = `avatars/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('perfiles-bucket')
          .upload(filePath, fotoPerfil, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('perfiles-bucket')
          .getPublicUrl(filePath)

        fotoUrl = urlData.publicUrl
      }

      // 2. Insertar los datos en tu tabla 'perfiles' de Supabase
      const { error: insertError } = await supabase
        .from('perfiles')
        .insert([
          {
            id: userId,
            nombre,
            matricula,
            carrera,
            foto_url: fotoUrl,            // Guarda la URL de la foto de perfil
            verificado: qrValidado         // Guarda si el QR fue verificado con éxito
          },
        ])

      if (insertError) throw insertError

      // Disparar la función de éxito que ya tenías
      onProfileComplete({ id: userId, nombre, matricula, carrera, foto_url: fotoUrl })
    } catch (err) {
      setError(err.message || 'Error al guardar los datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h2>Información de Registro</h2>
      {error && <p style={styles.error}>{error}</p>}
      {statusOCR && <p style={styles.status}>{statusOCR}</p>}

      {/* CÁMARA O VISTA PREVIA DE LA FOTO */}
      {cameraActive ? (
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '6px' }} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => captureCameraPhoto('frente')} style={styles.btnSec}>
              Tomar Frente (OCR)
            </button>
            <button type="button" onClick={() => captureCameraPhoto('reverso')} style={styles.btnSec}>
              Tomar Reverso (QR)
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startCamera} style={styles.btnCam}>
          📷 Abrir Cámara para Capturar Credencial
        </button>
      )}

      {/* MUESTRA LA VISTA PREVIA DE LA FOTO DE PERFIL CAPTURADA */}
      {fotoPreview && (
        <div style={{ textAlign: 'center', margin: '15px 0' }}>
          <img src={fotoPreview} alt="Foto de perfil" style={styles.avatarImg} />
          <p style={{ fontSize: '11px', color: '#64748b' }}>Foto de perfil extraída de la credencial</p>
        </div>
      )}

      {/* ENTRADA SECUNDARIA DE ARCHIVOS */}
      <div style={styles.fileBox}>
        <label style={styles.label}>O sube una foto del frente (OCR):</label>
        <input type="file" accept="image/*" onChange={(e) => handleFileInput(e, 'frente')} style={styles.input} />

        <label style={{ ...styles.label, marginTop: '10px' }}>O sube el reverso (QR):</label>
        <input type="file" accept="image/*" onChange={(e) => handleFileInput(e, 'reverso')} style={styles.input} />
      </div>

      {/* TU FORMULARIO ORIGINAL (AUTOLENADO CON OCR) */}
      <form onSubmit={handleSaveProfile} style={styles.form}>
        <label style={styles.label}>Nombre completo:</label>
        <input
          type="text"
          placeholder="Ej. Luis Alberto Roldan Castro"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          style={styles.input}
        />

        <label style={styles.label}>Matrícula / Número de Control:</label>
        <input
          type="text"
          placeholder="Ej. 22211648"
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          required
          style={styles.input}
        />

        <label style={styles.label}>Carrera:</label>
        <select
          value={carrera}
          onChange={(e) => setCarrera(e.target.value)}
          style={styles.input}
        >
          <option value="Ingeniería en Sistemas Computacionales">
            Ingeniería en Sistemas Computacionales
          </option>
          <option value="Ingeniería Electrónica">
            Ingeniería Electrónica
          </option>
        </select>

        <div style={styles.badge}>
          Comprobación QR: {qrValidado ? '✅ Autenticado' : '⏳ Pendiente de validación'}
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Guardando...' : 'Guardar Información'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  card: { maxWidth: '400px', margin: '30px auto', padding: '24px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'sans-serif' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: { padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' },
  label: { fontSize: '12px', fontWeight: 'bold' },
  button: { padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnCam: { width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnSec: { flex: 1, padding: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  fileBox: { padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '10px' },
  avatarImg: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' },
  badge: { padding: '6px', background: '#f1f5f9', fontSize: '12px', textAlign: 'center', borderRadius: '4px', fontWeight: 'bold' },
  error: { color: '#dc2626', fontSize: '13px' },
  status: { color: '#2563eb', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }
}