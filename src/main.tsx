import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'virtual:svg-icons-register';
import { applyThemeToDom, getInitialTheme } from './lib/theme';

// Synchronously apply initial theme before React renders
applyThemeToDom(getInitialTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
