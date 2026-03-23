import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from './index'
import { useUIStore } from '../../store/uiStore'

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const { theme, toggleTheme } = useUIStore()
    const nextMode = theme === 'light' ? 'dark' : 'light'

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${nextMode} mode`}
            className={cn(
                'theme-toggle',
                size === 'sm' && 'theme-toggle-sm',
                size === 'lg' && 'theme-toggle-lg'
            )}
        >
            <span className="theme-toggle__dot" aria-hidden="true">
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </span>
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
    )
}
