import './AiContentNotice.css'

export default function AiContentNotice() {
  return (
    <aside className="ai-content-notice" role="note" aria-label="Aviso sobre contenido generado por inteligencia artificial">
      <strong>Contenido generado por IA.</strong>{' '}
      Puede contener errores o información incompleta. Revísalo y adáptalo a tus necesidades; no sustituye la orientación de docentes o especialistas.
    </aside>
  )
}
