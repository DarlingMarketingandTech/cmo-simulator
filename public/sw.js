const STATIC_CACHE = 'cmo-sim-static-v2';
const APP_SHELL = ['/manifest.webmanifest', '/app-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE) return caches.delete(key);
          return Promise.resolve(false);
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const fresh = event.request.mode === 'navigate' || url.pathname.startsWith('/_next/') || url.pathname.startsWith('/sim');
  if (!fresh) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
