import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://anclora-linguo-cam.onrender.com',
        changeOrigin: true,
      },
      '/health': {
        target: 'https://anclora-linguo-cam.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://anclora-linguo-cam.onrender.com',
        changeOrigin: true,
        ws: true,
      },
      '/peerjs': {
        target: 'https://anclora-linguo-cam-1.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
