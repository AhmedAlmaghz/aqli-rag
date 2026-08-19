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

// Polyfill Response.prototype.json to handle empty or invalid server responses gracefully
const originalJson = Response.prototype.json;
Response.prototype.json = function() {
  if (this.status === 204 || this.status === 205) {
    return Promise.resolve({});
  }
  return originalJson.apply(this, arguments as any).catch(async (err) => {
    console.warn("⚠️ Handled non-JSON response from server safely:", err?.message);
    // If response succeeded (status 200-299), return empty object without error flags
    if (this.ok) {
      return {};
    }

    // For error status codes (e.g. 502, 503, 404 HTML pages), return structured error object
    return {
      error: `خطأ في الاتصال بالخادم (رمز الاستجابة: ${this.status})`,
      errorEn: `Server connection error (HTTP ${this.status})`,
      status: this.status,
      isNetworkError: true,
    };
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

