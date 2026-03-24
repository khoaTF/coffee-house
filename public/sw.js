const CACHE_NAME = 'serenity-v1';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
