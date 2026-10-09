import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests de Security Rules: corren contra el emulador de Firestore (npm run test:rules).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
