import './landingViewStyles.css'
import ThemeToggle from '../components/ThemeToggle'

const APP_NAME = 'CATALYST'

const STEPS = [
  {
    title: 'Elige un proyecto',
    text: 'Las empresas publican vacantes con las habilidades que piden. Tú aplicas con tu perfil.',
  },
  {
    title: 'La IA compara tus habilidades',
    text: 'Te dice si eres apto para el proyecto y qué habilidades te faltan.',
  },
  {
    title: 'Estudia lo que te falta',
    text: 'Si aún no eres apto, se genera un curso a tu medida para que llegues.',
  },
  {
    title: 'La empresa ve tu avance',
    text: 'Al terminar, la empresa puede comprobar que te preparaste para su proyecto.',
  },
]

export default function LandingView({ onEnterApp, theme, onToggleTheme }) {
  return (
    <div className="lv-page">
      <header className="lv-nav">
        <span className="lv-brand">{APP_NAME}</span>
        <div className="lv-nav-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} compact />
          <button type="button" onClick={onEnterApp} className="lv-btn lv-btn-ghost">
            Iniciar sesión
          </button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="lv-hero">
          <div className="lv-hero-text">
            <h1 className="lv-title">
              No lo digas. Demuéstralo. 
            </h1>
            <p className="lv-lead">
              Aplica a proyectos reales de empresas. La IA compara tus habilidades
              con lo que piden y, si todavía no llegas, te arma un curso para que
              llegues. La empresa puede ver que te preparaste.
            </p>
            <div className="lv-actions">
              <button type="button" onClick={onEnterApp} className="lv-btn lv-btn-primary">
                Crear cuenta o iniciar sesión
              </button>
              <a href="#como-funciona" className="lv-link">
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* Demo: una vacante, una habilidad que falta y cómo se resuelve */}
          <div className="lv-demo" role="img"
            aria-label="Ejemplo: en una vacante de desarrollo web junior, el estudiante cumple con React y Git, le falta SQL, completa un curso y la empresa ve su preparación.">
            <div className="lv-demo-head">
              <div>
                <p className="lv-demo-company">Empresa de ejemplo</p>
                <p className="lv-demo-role">Desarrollador web junior</p>
              </div>
              <span className="lv-demo-tag">Ejemplo</span>
            </div>

            <ul className="lv-skills" aria-hidden="true">
              <li className="lv-skill lv-skill-ok">
                <span className="lv-skill-name">React</span>
                <span className="lv-skill-state">Cumples</span>
              </li>
              <li className="lv-skill lv-skill-ok">
                <span className="lv-skill-name">Git</span>
                <span className="lv-skill-state">Cumples</span>
              </li>
              <li className="lv-skill lv-skill-gap">
                <span className="lv-skill-name">SQL</span>
                <span className="lv-skill-state lv-stack">
                  <span className="lv-state-gap">Te falta</span>
                  <span className="lv-state-done">Curso completado</span>
                </span>
              </li>
            </ul>

            <div className="lv-course" aria-hidden="true">
              <p className="lv-course-title">Curso generado: SQL desde cero</p>
              <div className="lv-bar">
                <span className="lv-bar-fill" />
              </div>
            </div>

            <p className="lv-demo-foot" aria-hidden="true">
              La empresa ve que completaste tu preparación.
            </p>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="lv-section lv-section-alt">
          <div className="lv-wrap">
            <h2 className="lv-h2">Así funciona</h2>
            <ol className="lv-steps">
              {STEPS.map((step, i) => (
                <li key={step.title} className="lv-step">
                  <span className="lv-step-num" aria-hidden="true">{i + 1}</span>
                  <h3 className="lv-h3">{step.title}</h3>
                  <p className="lv-text">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* PARA QUIÉN */}
        <section className="lv-section">
          <div className="lv-wrap lv-audiences">
            <div className="lv-audience">
              <h2 className="lv-h2">Si eres estudiante</h2>
              <p className="lv-text">
                Deja de adivinar si cumples con una vacante. Sabes qué te falta
                y tienes un plan para conseguirlo.
              </p>
              <ul className="lv-list">
                <li>Aplica a proyectos de empresas reales.</li>
                <li>Recibe un resultado claro según tus habilidades.</li>
                <li>Estudia solo lo que necesitas, con cursos generados para ti.</li>
                <li>Guarda tus habilidades y tus planes de estudio.</li>
              </ul>
            </div>

            <div className="lv-audience">
              <h2 className="lv-h2">Si eres empresa</h2>
              <p className="lv-text">
                Recibe candidatos que se preparan para tu proyecto, no solo
                currículums.
              </p>
              <ul className="lv-list">
                <li>Publica vacantes con las habilidades que necesitas.</li>
                <li>Mira quién cumple y quién está en preparación.</li>
                <li>Comprueba que el estudiante completó su curso.</li>
                <li>Encuentra talento antes de que termine la carrera.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section className="lv-final">
          <div className="lv-wrap lv-final-inner">
            <h2 className="lv-final-title">
              Empieza hoy: elige un proyecto y mira qué te falta.
            </h2>
            <button type="button" onClick={onEnterApp} className="lv-btn lv-btn-accent">
              Crear cuenta o iniciar sesión
            </button>
          </div>
        </section>
      </main>

      <footer className="lv-footer">
        <span>{APP_NAME}</span>
        <span>Hackatec 2026 · Tijuana</span>
      </footer>
    </div>
  )
}