import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// base: './' -> caminhos relativos. Funciona em GitHub Pages (inclusive em
// subpasta /repo/), Vercel, Netlify, Cloudflare Pages ou abrindo o arquivo local.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist', sourcemap: false },
  // Respeita a porta indicada pelo ambiente (containers, previews); 5173 é só o padrão.
  server: { port: Number(process.env.PORT) || 5173 },
})
