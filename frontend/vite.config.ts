import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend habla con el backend vía /api. En desarrollo se hace proxy a
// localhost:4000 (configurable con VITE_API_TARGET en un archivo .env);
// en producción (Docker) nginx hace el proxy al servicio backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const target = env.VITE_API_TARGET || 'http://localhost:4000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target, changeOrigin: true },
      },
    },
  };
});
