// vite.config.js
// Tells Vite's dev server to forward any /api/... request to the Flask
// backend running on port 5000.  This avoids CORS issues in development.
//
// Run both servers:
//   Terminal 1:  cd backend  &&  python app.py       (Flask on :5000)
//   Terminal 2:  cd frontend &&  npm run dev          (Vite  on :5173)
//   Open:        http://localhost:5173

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
