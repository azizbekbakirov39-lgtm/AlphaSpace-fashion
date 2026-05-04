import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { YMaps } from '@pbe/react-yandex-maps';

// Suppress defaultProps warning from third-party libraries (e.g., @pbe/react-yandex-maps)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalConsoleError(...args);
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
    }).catch(registrationError => {
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <YMaps query={{ lang: 'ru_RU', apikey: '' }}>
      <App />
    </YMaps>
  </StrictMode>,
);
