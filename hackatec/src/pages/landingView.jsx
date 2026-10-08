import React from 'react'
import './loginViewStyle.css'

export default function LandingView({ onEnterApp }) {
  return (
    <div className="landing-container">
      <h1 className="landing-title">[Nombre de tu Aplicación]</h1>
      <p className="landing-subtitle">
        Una solución integral diseñada para gestionar competencias, 
        optimizar el perfil académico y conectar el talento con las 
        oportunidades del mañana. Descubre todo lo que puedes lograr.
      </p>
      
      {/* Reutilizamos la clase .login-button para mantener el mismo diseño del botón principal */}
      <button onClick={onEnterApp} className="login-button landing-cta">
        Iniciar Sesión / Registrarse
      </button>
    </div>
  )
}