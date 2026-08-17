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

