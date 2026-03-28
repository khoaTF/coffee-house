// Auto-versioned cache using build date — increment CACHE_VERSION when deploying
const CACHE_VERSION = 'v4';
const CACHE_NAME = `cafe-qr-${CACHE_VERSION}`;

const ASSETS = [
  '/',
  '/login',
  '/css/styles.css',
  '/css/index.css',
  '/css/logo.css',
  '/js/supabase-config.js',
  '/js/i18n.js',
  '/js/customer.js',
  '/images/bunny_logo.png'
];

// On install: cache all static assets and force activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// On activate: delete ALL old caches (any version not matching current)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy: always try network, fall back to cache
// This ensures users always get fresh JS/CSS after deploys
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension URLs
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

  // Skip Supabase API calls — never cache these
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
