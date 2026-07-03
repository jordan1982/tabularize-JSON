import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  // Sostituisci 'tabularize-JSON' con l'esatto nome del tuo repository su GitHub.
  // Nota: Deve corrispondere alla perfezione anche nelle maiuscole/minuscole.
  base: '/tabularize-JSON/',
})