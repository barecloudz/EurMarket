import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/pages/admin/') || id.includes('/pages/supplier/')) {
            return 'admin';
          }
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
          if (id.includes('node_modules/')) return 'vendor';
        },
      },
    },
  },
})
