const CACHE_NAME = 'thelord-aviator-oficial-v66-performance-fix';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './aviator-perspectiva.jpg',
  './style.css?v=20261103-pattern-neon-alert-1',
  './desktop.css?v=20261101-expo-glass',
  './format-core.js?v=20261103-format1',
  './color-core.js?v=20261103-color1',
  './game-core.js?v=20261103-game1',
  './app.js?v=20261103-performance-fix-1',
  './probability-core.js?v=20261103-performance-fix-1',
  './timing-core.js?v=20261026b',
  './date-core.js?v=20261103-date1',
  './timing.js?v=20261102-min2x'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (!response || !response.ok || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then(c => {
      if (c) return c;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return new Response('', {status: 504, statusText: 'Offline and asset not cached'});
    }))
  );
});
