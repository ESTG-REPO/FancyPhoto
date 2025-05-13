const VERSION = 'v3';
const STATIC_CACHE = `static-cache-${VERSION}`;
const IMAGE_CACHE = `image-cache-${VERSION}`;
const MAX_IMAGE_ENTRIES = 200; // Limit image cache size

const STATIC_ASSETS = [
  '/', // Add homepage or any critical routes
];

// Install event: pre-cache essential assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate event: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (![STATIC_CACHE, IMAGE_CACHE].includes(key)) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// Fetch event handler
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isImage = request.destination === 'image' || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(url.pathname);
  const isSameOrigin = url.origin === location.origin;

  // === IMAGE HANDLER ===
  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) {
          event.waitUntil(updateImageCache(cache, request));
          return cached;
        }

        try {
          const response = await fetch(request, { mode: 'cors' });

          if (response.ok || response.type === 'opaque') {
            cache.put(request, response.clone());
            limitCacheEntries(cache, MAX_IMAGE_ENTRIES);
            return response;
          }
        } catch (err) {
          console.warn('[SW] Image fetch failed:', request.url, err);
        }

        // Blank fallback for broken/missing images
        return new Response('', {
          status: 503,
          statusText: 'Unavailable',
          headers: {
            'Content-Type': 'image/png'
          }
        });
      })
    );
    return;
  }

  // === GENERAL HANDLER ===
  event.respondWith(
    fetch(request)
      .then(response => {
        if (isSameOrigin && response.ok && request.destination !== 'document') {
          caches.open(STATIC_CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// === Helper: Background update for image cache ===
async function updateImageCache(cache, request) {
  try {
    const response = await fetch(request, { mode: 'cors' });
    if (response.ok || response.type === 'opaque') {
      await cache.put(request, response.clone());
      limitCacheEntries(cache, MAX_IMAGE_ENTRIES);
    }
  } catch (_) {
    // Silent fail
  }
}

// === Helper: Limit image cache size (FIFO) ===
async function limitCacheEntries(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
    return limitCacheEntries(cache, max); // recursive FIFO cleanup
  }
}
