import { useState, useEffect } from 'react'

const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <button
      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
      style={{
        background: 'none',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px',
        padding: '0.4rem 0.6rem',
        cursor: 'pointer',
        fontSize: '1rem',
        color: 'inherit',
        lineHeight: 1
      }}
    >
      {theme === 'dark' ? '\u2600' : '\u263E'}
    </button>
  )
}

export default ThemeToggle
