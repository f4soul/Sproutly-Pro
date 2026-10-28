import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'virtual:svg-icons-register';
import { applyThemeToDom, getInitialTheme } from './lib/theme';
import { initPwaUpdate } from './lib/pwaUpdate';

// Synchronously apply initial theme before React renders
applyThemeToDom(getInitialTheme());

// Initialize Service Worker update listening at app startup
initPwaUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
