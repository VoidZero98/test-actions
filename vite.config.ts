import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the app works on GitHub Pages project sites.
  base: './',
  plugins: [vue()],
})
