import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import packageJson from './package.json' with { type: 'json' };

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          minify: { compress: { dropConsole: true, dropDebugger: true } },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      alias: {
        'components': '/src/components',
        'models': '/src/models',
        'modules': '/src/modules',
        'pages': '/src/pages',
        'styles': '/src/styles',
        'utils': '/src/utils'
      },
    },
    server: {
      proxy: {
        '/v1': {
          target: environment.API_URL ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
