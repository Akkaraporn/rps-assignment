import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');

  return {
    envDir: '../..',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${env.GATEWAY_PORT ?? 3000}`,
          ws: true,
        },
      },
    },
  };
});