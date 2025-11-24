import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200, // Suppress warnings for large chunks until we implement code-splitting
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (safe for dev - allows local network + ngrok)
    port: 5174, // Internal management app port
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io'], // Allow ngrok hosts for testing (dev only)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Note: In production build, these server settings don't apply
  // You'll serve static files via a web server (Nginx, Vercel, etc.)
});
