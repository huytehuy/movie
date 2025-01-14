import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
  host: true,
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 kB
  },
})
