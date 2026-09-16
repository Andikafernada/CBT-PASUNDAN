const CACHE_NAME = 'cbt-offline-v2';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical cache failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Network First with Cache Fallback for navigation, Stale-While-Revalidate for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache or intercept API or admin calls - Admin is dynamic & manages live state
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    return;
  }

  // Static files (_next/static, css, js, fonts) -> Cache First for non-admin
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(css|js|woff2?|png|jpg|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkRes) => {
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // HTML Navigation -> Network First, fall back to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/login');
        });
      })
    );
  }
});
