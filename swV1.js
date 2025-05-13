const CACHE_NAME = 'gallery-cache-v1';
const IMAGE_CACHE = 'image-cache-v1';
const OFFLINE_URL = '/offline.html'; // Optional fallback

// List of resources to cache during installation
const STATIC_ASSETS = [
  OFFLINE_URL,
];

// Install event
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Handle image requests with a cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) {
          // Background update
          event.waitUntil(updateImageCache(cache, request));
          return cached;
        } else {
          try {
            const response = await fetch(request, { mode: 'cors' });
            if (response && response.ok) {
              cache.put(request, response.clone());
              return response;
            }
          } catch (err) {
            console.warn('Image fetch failed:', err);
          }
        }
        return fetchFallback();
      })
    );
    return;
  }

  // Fallback for navigation or HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Update image in cache in background
async function updateImageCache(cache, request) {
  try {
    const fresh = await fetch(request, { mode: 'cors' });
    if (fresh.ok) {
      await cache.put(request, fresh.clone());
    }
  } catch (err) {
    // Ignore errors for background updates
  }
}

// Fallback for failed image fetch
function fetchFallback() {
  return new Response('', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}
