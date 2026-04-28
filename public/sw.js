// =============================================
// Nohope Coffee Service Worker v8
// Strategy: Smart caching + Offline fallback + Push Notifications
// =============================================
const CACHE_VERSION = 'v8';
const CACHE_NAME = `cafe-qr-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Critical assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/admin',
  '/offline',
  '/css/styles.css',
  '/css/index.css',
  '/css/logo.css',
  '/css/admin.css',
  '/css/gacha.css',
  '/js/supabase-config.js',
  '/js/i18n.js',
  '/js/customer.js',
  '/js/helpers.js',
  '/js/constants.js',
  '/images/bunny_logo.png',
  '/manifest.json'
];

// CDN domains to cache with Stale-While-Revalidate
const CACHEABLE_CDN = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// =============================================
// INSTALL: Pre-cache critical assets + offline page
// =============================================
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

// =============================================
// ACTIVATE: Clean old caches
// =============================================
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

// =============================================
// FETCH: Smart strategy selection + Offline fallback
// =============================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Never cache Supabase API calls or realtime
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  // CDN assets: Stale-While-Revalidate
  if (CACHEABLE_CDN.some(cdn => url.hostname.includes(cdn))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Images: Cache-First (rarely change)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // JS/CSS with version query: Cache-First
  if (url.search.includes('v=') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages and unversioned assets: Network-First with offline fallback
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Everything else: Network-First
  event.respondWith(networkFirst(request));
});

// =============================================
// PUSH NOTIFICATIONS (for future Zalo/Telegram integration)
// =============================================
self.addEventListener('push', event => {
  let data = { title: 'Nohope Coffee', body: 'Bạn có thông báo mới!', icon: '/images/bunny_logo.png' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/images/bunny_logo.png',
      badge: '/images/bunny_logo.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'nohope-notification',
      renotify: true,
      data: { url: data.url || '/' },
      actions: data.actions || [
        { action: 'open', title: 'Mở ứng dụng' },
        { action: 'dismiss', title: 'Bỏ qua' }
      ]
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const action = event.action;

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// =============================================
// CACHING STRATEGIES
// =============================================

// Network-First with Offline HTML fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Serve offline page for navigation requests
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response(
      '<html><body style="background:#0d1117;color:#d4a76a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><h1>☕ Đang offline...</h1></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

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
    return cached || new Response('', { status: 503 });
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

// =============================================
// BACKGROUND SYNC (for offline order queue — future)
// =============================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  try {
    // Open IndexedDB to get pending orders
    // This is a placeholder for future offline ordering
    console.log('[SW] Background sync: checking pending orders...');
    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE', status: 'success' });
    });
  } catch (e) {
    console.error('[SW] Sync failed:', e);
  }
}
