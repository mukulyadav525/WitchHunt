import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        exclude: ['lucide-react'],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom', 'zustand'],
                    'map-vendor': ['leaflet', 'react-leaflet'],
                    'chart-vendor': ['recharts'],
                    'supabase-vendor': ['@supabase/supabase-js'],
                    'ui-vendor': ['lucide-react', 'react-hot-toast', 'clsx', 'tailwind-merge']
                }
            }
        }
    }
})
