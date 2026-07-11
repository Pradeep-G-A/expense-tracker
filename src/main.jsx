import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Dismiss loading splash screen once React mounts
const splash = document.getElementById('splash-screen');
if (splash) {
  splash.classList.add('splash-screen--fade-out');
  setTimeout(() => splash.remove(), 400);
}
