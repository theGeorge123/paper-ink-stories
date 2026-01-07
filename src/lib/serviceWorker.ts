/**
 * Register the service worker for offline-friendly caching in production.
 */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD || typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
};
