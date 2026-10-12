import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'components': path.resolve(import.meta.dirname, 'src/components'),
      'models': path.resolve(import.meta.dirname, 'src/models'),
      'modules': path.resolve(import.meta.dirname, 'src/modules'),
      'pages': path.resolve(import.meta.dirname, 'src/pages'),
      'styles': path.resolve(import.meta.dirname, 'src/styles'),
      'utils': path.resolve(import.meta.dirname, 'src/utils'),
    },
  },
  test: {
    environment: 'node',
    env: {
      TZ: 'Europe/Paris',
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/support/setup.ts'],
  },
});
