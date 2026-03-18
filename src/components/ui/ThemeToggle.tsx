import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const { theme, toggleTheme } = useUIStore()

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: size === 'sm' ? '5px 11px' : '7px 14px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                transition: 'all var(--transition)',
                fontFamily: 'var(--font-sans)',
            }}
        >
            {theme === 'light'
                ? <><Moon size={13} /> Dark</>
                : <><Sun size={13} /> Light</>}
        </button>
    )
}
