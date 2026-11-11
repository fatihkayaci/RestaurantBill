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
          // React, router, UI kitleri ve geri kalan paketler tek parçada: ayrı parçalara
          // bölünce vendor ↔ vendor-react döngüsü oluşuyor ve React yüklenmeden
          // createContext çağrılıp sayfa beyaz kalıyordu.
          if (id.includes('@microsoft/signalr')) return 'vendor-signalr';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          return 'vendor';
        },
      },
    },
  },
})
