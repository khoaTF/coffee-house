const CACHE_NAME = 'serenity-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/index.css',
  '/css/logo.css',
  '/js/supabase-config.js',
  '/js/i18n.js',
  '/js/customer.js',
  '/images/bunny_logo.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first strategy for dynamic updating, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
