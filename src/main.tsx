import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { YMaps } from '@pbe/react-yandex-maps';

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
