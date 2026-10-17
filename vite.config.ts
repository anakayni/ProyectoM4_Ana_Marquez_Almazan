/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // Los tests de reglas necesitan el emulador: se corren con `npm run test:rules`.
    exclude: ['tests/rules/**', 'node_modules/**'],
    // tokens.css se procesa para que tests/unit/tokens.test.ts pueda leer la paleta (el resto del CSS se ignora).
    css: { include: [/tokens\.css/], modules: { classNameStrategy: 'non-scoped' } },
  },
});
