const CACHE_NAME = 'thelord-aviator-oficial-v21-radar-auto';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './aviator-perspectiva.jpg',
  './style.css',
  './desktop.css',
  './app.js?v=20261027-range-estimates1',
  './timing-core.js?v=20261026b',
  './timing.js?v=20261026d'
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
