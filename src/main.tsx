import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'katex/dist/katex.min.css';

// Catch-all browser JSON parsing error prevention
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || '';
  if (msg.includes('is not valid JSON') || msg.includes('Unexpected token') || msg.includes('JSON.parse')) {
    console.warn('⚠️ Prevented unhandled JSON parsing exception:', event.reason);
    event.preventDefault();
  }
});

// Global fetch interceptor to automatically inject Authorization Bearer Token
try {
  const originalFetch = window.fetch;
  const customFetch = async function(this: any, input: RequestInfo | URL, init?: RequestInit) {
    const token = localStorage.getItem('aqli_auth_token_v1');
    if (token) {
      let isApiCall = false;
      if (typeof input === 'string') {
        isApiCall = input.startsWith('/api/') || input.includes('/api/');
      } else if (input instanceof URL) {
        isApiCall = input.pathname.startsWith('/api/');
      } else if (input && typeof input === 'object' && 'url' in input) {
        isApiCall = input.url.startsWith('/api/') || input.url.includes('/api/');
      }

      if (isApiCall) {
        if (input instanceof Request) {
          const headers = new Headers(input.headers);
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          input = new Request(input, { headers });
        } else {
          init = init || {};
          const headers = new Headers(init.headers || {});
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init.headers = headers;
        }
      }
    }
    return originalFetch.call(this || window, input, init);
  };

  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true
  });
} catch (e) {
  console.warn("⚠️ Could not override window.fetch directly due to sandbox limits. Standard API requests remain active:", e);
}

// Polyfill Response.prototype.json to handle invalid server responses gracefully
const originalJson = Response.prototype.json;
Response.prototype.json = function() {
  return originalJson.apply(this, arguments as any).catch(err => {
    console.error("⚠️ Intercepted invalid JSON response from server:", err);
    // Return a hybrid array/object fallback to prevent downstream map or object destructuring crashes
    const fallback: any = [];
    fallback.error = "فشلت قراءة استجابة الخادم كـ JSON. قد يكون هناك خلل مؤقت في الاتصال.";
    fallback.errorEn = "Failed to parse server response as JSON. There may be a temporary connection issue.";
    fallback.details = err.message;
    fallback.isValidationError = true;
    return fallback;
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

