import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相對路徑：可部署在網域根目錄或 GitHub Pages 子路徑（/soak-demo/）皆正常
  base: './',
  plugins: [react()],
  server: { port: 5173, open: true },
})
