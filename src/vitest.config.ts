import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The tests cover plain modules, so they need Nuxt's path aliases but not a Nuxt runtime.
export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
