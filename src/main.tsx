import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { YMaps } from '@pbe/react-yandex-maps';

// Safe JSON Stringify patch to prevent third-party libraries from crashing the app with circular structures
const originalStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: string | number): string {
  try {
    return originalStringify(value, replacer, space);
  } catch (e: any) {
    if (e.message && e.message.toLowerCase().includes('circular structure')) {
      const cache = new WeakSet();
      return originalStringify(value, (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (cache.has(val)) {
            return '[Circular]';
          }
          cache.add(val);
        }
        if (typeof replacer === 'function') {
          return replacer(key, val);
        }
        return val;
      }, space);
    }
    throw e;
  }
};

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
    <YMaps query={{ lang: 'ru_RU', apikey: '40d1643f-98d9-46d3-9814-e2d199910109' }}>
      <App />
    </YMaps>
  </StrictMode>,
);
