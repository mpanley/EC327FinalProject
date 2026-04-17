/* =============================================================================
   main.jsx
   React entry point. This is the first file that runs.

   It does two things:
     1. Imports the global CSS (index.css) so styles apply everywhere.
     2. Mounts the root <App /> component into the <div id="root"> that
        lives in your index.html (the Vite scaffold one, not our game HTML).

   You should not need to edit this file.
   ============================================================================= */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';   // global styles — always import before App
import App from './App.jsx';

// Find the <div id="root"> in index.html and render our App into it.
// StrictMode is a development helper that warns about common mistakes —
// it does NOT affect the production build.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
