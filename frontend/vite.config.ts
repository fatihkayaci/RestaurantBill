import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // @microsoft/signalr'ın ESM derlemesindeki /*#__PURE__*/ yorumları Rollup'ın
        // yorumlayamadığı bir konumda; zararsız, üçüncü taraf paketten kaynaklanan gürültü.
        if (warning.code === 'INVALID_ANNOTATION') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@microsoft/signalr')) return 'vendor-signalr';
          if (id.includes('radix-ui') || id.includes('lucide-react')) return 'vendor-ui';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          return 'vendor';
        },
      },
    },
  },
})
