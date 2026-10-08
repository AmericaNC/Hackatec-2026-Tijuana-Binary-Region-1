import { Moon, Sun } from 'lucide-react'
import './ThemeToggle.css'

export default function ThemeToggle({ theme, onToggle, compact = false }) {
  const nextTheme = theme === 'dark' ? 'claro' : 'oscuro'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? ' theme-toggle-compact' : ''}`}
      onClick={onToggle}
      aria-label={`Cambiar a modo ${nextTheme}`}
      title={`Cambiar a modo ${nextTheme}`}
    >
      <Icon aria-hidden="true" size={18} />
      {!compact && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  )
}
