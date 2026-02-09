import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handleGemini } from './server/geminiHandler';

export default defineConfig(() => ({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  plugins: [
    react(),
    {
      name: 'gemini-local-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/gemini')) {
            await handleGemini(req, res);
            return;
          }
          next();
        });
      }
    }
  ]
}));
