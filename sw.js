// Service Worker: v8-smart-gallery-helper
const VERSION = 'v8-smart-gallery';
const STATIC_CACHE = `static-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const MAX_IMAGE_ENTRIES = 300;

// Basic 1x1 transparent PNG fallback
const blankPixel = new Uint8Array(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQImWNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=")
  .split('').map(c => c.charCodeAt(0)));

const sleep = ms => new Promise(r => setTimeout(r, ms));

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      cache.addAll([
        '/',
      ])
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (![STATIC_CACHE, IMAGE_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isImage = request.destination === 'image' || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(smartImageHandler(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok && res.status === 200) {
          const cloned = res.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, cloned));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

async function smartImageHandler(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    refreshImageInBackground(cache, request);
    return cached;
  }

  const response = await fetchWithCorsFallback(request);
  if (response && response.ok && response.status === 200) {
    const cloned = response.clone();
    await cache.put(request, cloned);
    await limitCacheSize(cache, MAX_IMAGE_ENTRIES);
    preloadNearbyImages(request.url);
    return response;
  }

  return new Response(blankPixel, {
    headers: {
      "Content-Type": "image/png",
      "X-Fallback": "true"
    },
    status: 503,
    statusText: "Image unavailable"
  });
}

async function fetchWithCorsFallback(request) {
  const attempts = [
    new Request(request.url, { mode: 'cors', credentials: 'omit' }),
    new Request(request.url, { mode: 'no-cors', credentials: 'omit' })
  ];

  for (let attempt of attempts) {
    for (let i = 1; i <= 2; i++) {
      try {
        const res = await fetch(attempt);
        if (res.ok || res.type === 'opaque') return res;
      } catch (err) {
        await sleep(100 * i);
      }
    }
  }
  return null;
}

async function refreshImageInBackground(cache, request) {
  const fresh = await fetchWithCorsFallback(request);
  if (fresh && fresh.ok && fresh.status === 200) {
    const cloned = fresh.clone();
    await cache.put(request, cloned);
    await limitCacheSize(cache, MAX_IMAGE_ENTRIES);
  }
}

async function limitCacheSize(cache, max) {
  const keys = await cache.keys();
  while (keys.length > max) {
    await cache.delete(keys.shift());
  }
}

async function preloadNearbyImages(currentUrl) {
  const currentFile = currentUrl.split('/').pop();
  const match = currentFile.match(/IMG_(\d+)\.jpg/i);
  if (!match) return;

  const currentIdx = parseInt(match[1], 10);
  const preloadRange = [currentIdx - 2, currentIdx + 2];

  const baseUrl = currentUrl.replace(/IMG_\d+\.jpg/i, '');
  const preloadUrls = [];

  for (let i = preloadRange[0]; i <= preloadRange[1]; i++) {
    if (i === currentIdx || i < 1) continue;
    const padded = i.toString().padStart(4, '0');
    preloadUrls.push(`${baseUrl}IMG_${padded}.jpg`);
  }

  const cache = await caches.open(IMAGE_CACHE);

  for (let url of preloadUrls) {
    const alreadyCached = await cache.match(url);
    if (!alreadyCached) {
      const res = await fetchWithCorsFallback(new Request(url));
      if (res && res.ok && res.status === 200) {
        const cloned = res.clone();
        await cache.put(url, cloned);
      }
    }
  }
}
