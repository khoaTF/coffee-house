// Nohope Coffee Service Worker v6
// Strategy: Stale-While-Revalidate for static assets, Network-First for API
const CACHE_VERSION = 'v7';
const CACHE_NAME = `cafe-qr-${CACHE_VERSION}`;

// Critical assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/css/styles.css',
  '/css/index.css',
  '/css/logo.css',
  '/css/gacha.css',

  '/js/supabase-config.js',
  '/js/i18n.js',
  '/js/customer.js',
  '/images/bunny_logo.png'
];

// CDN domains to cache with Stale-While-Revalidate
const CACHEABLE_CDN = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// Install: pre-cache critical assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name.startsWith('cafe-qr-') && name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch handler with smart strategy selection
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Never cache Supabase API calls
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  // CDN assets: Stale-While-Revalidate (fast from cache, refresh in background)
  if (CACHEABLE_CDN.some(cdn => url.hostname.includes(cdn))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Images: Cache-First (rarely change)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // JS/CSS with version query: Cache-First (version busting handles updates)
  if (url.search.includes('v=') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (HTML, unversioned JS/CSS): Network-First
  event.respondWith(networkFirst(request));
});

// --- Caching Strategies ---

// Network-First: try network, fall back to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Cache-First: serve from cache, fall back to network
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('', { status: 408 });
  }
}

// Stale-While-Revalidate: serve cache immediately, refresh in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}
