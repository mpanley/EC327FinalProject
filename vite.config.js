// vite.config.js
// Vite is the build tool that runs the React dev server.
//
// The key setting here is the proxy:
//   Any request the browser makes to /api/... is automatically forwarded
//   to http://localhost:5000/api/... (your Flask server).
//
// This means you can call fetch('/api/start') in React and it reaches Flask
// without any CORS errors — Vite acts as a middleman during development.
//
// HOW TO USE:
//   Terminal 1:  cd backend  &&  python app.py        (Flask on port 5000)
//   Terminal 2:  cd frontend &&  npm run dev          (Vite on port 5173)
//   Open:        http://localhost:5173

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Any request path starting with /api is forwarded to Flask
      '/api': {
        target:      'http://localhost:5000',  // your Flask server
        changeOrigin: true,                    // fixes the Host header
      },
    },
  },
});
