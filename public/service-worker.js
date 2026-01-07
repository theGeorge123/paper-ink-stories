const CACHE_NAME = 'paper-ink-static-v1';
const RUNTIME_CACHE = 'paper-ink-runtime-v1';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const excludedPaths = ['/demo-hero', '/demo-reader', '/demo-questions'];
  if (excludedPaths.includes(requestUrl.pathname)) return;

  const destination = event.request.destination;
  const shouldCache = ['document', 'script', 'style', 'image', 'font'].includes(destination);

  if (!shouldCache) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return caches.open(RUNTIME_CACHE).then((cache) =>
        fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }),
      );
    }),
  );
});
