// added Streams API, LRU Cache, Retry with backoff, and Prefetch on interaction

const VERSION = 'v9-smart-gallery';
const STATIC_CACHE = `static-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const MAX_IMAGE_ENTRIES = 300;

const blankPixel = new Uint8Array(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQImWNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
  )
    .split("")
    .map((c) => c.charCodeAt(0))
);

// Metadata cache for LRU and retry backoff info
const META_CACHE = `meta-${VERSION}`;
const MAX_RETRY = 3;
const RETRY_BASE_DELAY = 200; // ms

// Utility to sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Installation - cache root
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/"]))
  );
  console.log('[SW] Install event completed');
});

// Activation - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, IMAGE_CACHE, META_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
  console.log('[SW] Activate event completed');
});

// Listen for user interaction to trigger prefetch
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "prefetchImages" && event.data.url) {
    preloadNearbyImages(event.data.url);
    console.log('[SW] Received prefetchImages message:', event.data.url);
  }
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isImage =
    request.destination === "image" ||
    /\.(jpg|jpeg|png|webp|gif|svg|avif|JPG)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(smartImageHandler(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && res.status === 200) {
          const cloned = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
  console.log('[SW] Fetch handler processed:', request.url);
});

// ----- SMART IMAGE HANDLER -----

async function smartImageHandler(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const metaCache = await caches.open(META_CACHE);

  // LRU metadata stored as { url: lastAccessTimestamp }
  let metadata = await readMetaData(metaCache);

  // Try cache first
  let cached = await cache.match(request);
  if (cached) {
    // Update LRU timestamp
    metadata[request.url] = Date.now();
    await saveMetaData(metaCache, metadata);

    // Refresh image in background
    refreshImageInBackground(cache, metaCache, request);

    console.log('[SW] smartImageHandler: cache HIT for', request.url);
    return cached;
  }

  // Not cached - try fetch with retry
  const response = await fetchWithRetry(request, metaCache, metadata);
  if (response && response.ok && response.status === 200) {
    // Cache streamed response (Streams API)
    await cacheResponseStream(cache, request, response);

    // Update LRU metadata
    metadata[request.url] = Date.now();
    await saveMetaData(metaCache, metadata);

    // Enforce LRU cache limit
    await limitCacheSize(cache, metaCache, MAX_IMAGE_ENTRIES);

    // Trigger prefetch of nearby images
    preloadNearbyImages(request.url);

    console.log('[SW] smartImageHandler: fetched & cached', request.url);
    return await cache.match(request);
  }

  // Fallback blank pixel
  console.log('[SW] smartImageHandler: fallback blank pixel for', request.url);
  return new Response(blankPixel, {
    headers: {
      "Content-Type": "image/png",
      "X-Fallback": "true",
    },
    status: 503,
    statusText: "Image unavailable",
  });
}

// ----- FETCH WITH RETRY & BACKOFF -----

async function fetchWithRetry(request, metaCache, metadata) {
  let attempt = metadata[request.url + ":retryCount"] || 0;
  while (attempt < MAX_RETRY) {
    try {
      // Use CORS mode first, fallback no-cors handled here simply with normal fetch
      const res = await fetch(
        new Request(request.url, { mode: "cors", credentials: "omit" })
      );
      if (res.ok || res.type === "opaque") {
        // Reset retry count on success
        delete metadata[request.url + ":retryCount"];
        await saveMetaData(metaCache, metadata);
        console.log(`[SW] fetchWithRetry: success on attempt ${attempt + 1} for`, request.url);
        return res;
      }
    } catch (e) {
      // ignore, will retry
    }
    attempt++;
    metadata[request.url + ":retryCount"] = attempt;
    await saveMetaData(metaCache, metadata);

    const delay = RETRY_BASE_DELAY * 2 ** (attempt - 1);
    console.log(`[SW] fetchWithRetry: retry attempt ${attempt} for ${request.url}, delaying ${delay}ms`);
    await sleep(delay);
  }
  console.log('[SW] fetchWithRetry: failed all attempts for', request.url);
  return null;
}

// ----- CACHE RESPONSE WITH STREAMS API -----

async function cacheResponseStream(cache, request, response) {
  // Create a new Response with cloned stream for cache put
  const contentType = response.headers.get("content-type") || "";

  // Create a transform stream to tee the response stream
  const { readable, writable } = new TransformStream();
  const reader = response.body.getReader();
  const writer = writable.getWriter();

  // Start pumping data from original response stream into writable stream
  pump();
  async function pump() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
    await writer.close();
  }

  // Put the response with the new readable stream into cache
  const streamResponse = new Response(readable, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  await cache.put(request, streamResponse);
  console.log('[SW] cacheResponseStream: cached stream for', request.url);
}

// ----- REFRESH IMAGE IN BACKGROUND -----

async function refreshImageInBackground(cache, metaCache, request) {
  const metadata = await readMetaData(metaCache);

  const fresh = await fetchWithRetry(request, metaCache, metadata);
  if (fresh && fresh.ok && fresh.status === 200) {
    await cacheResponseStream(cache, request, fresh);
    metadata[request.url] = Date.now();
    await saveMetaData(metaCache, metadata);
    await limitCacheSize(cache, metaCache, MAX_IMAGE_ENTRIES);
    console.log('[SW] refreshImageInBackground: refreshed cache for', request.url);
  } else {
    console.log('[SW] refreshImageInBackground: failed to refresh', request.url);
  }
}

// ----- LIMIT CACHE SIZE WITH LRU -----

async function limitCacheSize(cache, metaCache, max) {
  const keys = await cache.keys();
  const metadata = await readMetaData(metaCache);

  if (keys.length <= max) {
    console.log('[SW] limitCacheSize: cache size under limit', keys.length);
    return;
  }

  // Sort keys by last access time ascending (oldest first)
  const sortedKeys = keys.sort((a, b) => {
    const tA = metadata[a.url] || 0;
    const tB = metadata[b.url] || 0;
    return tA - tB;
  });

  const toDelete = sortedKeys.slice(0, keys.length - max);

  for (const request of toDelete) {
    await cache.delete(request);
    delete metadata[request.url];
    delete metadata[request.url + ":retryCount"];
  }

  await saveMetaData(metaCache, metadata);
  console.log(`[SW] limitCacheSize: evicted ${toDelete.length} entries`);
}

// ----- PREFETCH NEARBY IMAGES -----

async function preloadNearbyImages(currentUrl) {
  const currentFile = currentUrl.split("/").pop();
  const match = currentFile.match(/IMG_(\d+)\.(jpg|JPG)/i);
  if (!match) {
    console.log('[SW] preloadNearbyImages: no match for', currentUrl);
    return;
  }

  const currentIdx = parseInt(match[1], 10);
  const extension = match[2];
  const preloadRange = [currentIdx - 2, currentIdx + 2];
  const baseUrl = currentUrl.replace(/IMG_\d+\.(jpg|JPG)/i, "");

  const cache = await caches.open(IMAGE_CACHE);
  const metaCache = await caches.open(META_CACHE);
  let metadata = await readMetaData(metaCache);

  for (let i = preloadRange[0]; i <= preloadRange[1]; i++) {
    if (i === currentIdx || i < 1) continue;
    const padded = i.toString().padStart(4, "0");
    const url = `${baseUrl}IMG_${padded}.${extension}`;

    const alreadyCached = await cache.match(url);
    if (!alreadyCached) {
      const req = new Request(url);
      const response = await fetchWithRetry(req, metaCache, metadata);
      if (response && response.ok && response.status === 200) {
        await cacheResponseStream(cache, req, response);
        metadata[url] = Date.now();
        console.log('[SW] preloadNearbyImages: prefetched and cached', url);
      }
    }
  }
  await saveMetaData(metaCache, metadata);
  console.log('[SW] preloadNearbyImages: done for', currentUrl);
}

// ----- META DATA READ/WRITE HELPERS -----

async function readMetaData(metaCache) {
  try {
    const res = await metaCache.match("metadata");
    if (!res) return {};
    const data = await res.json();
    console.log('[SW] readMetaData: loaded metadata');
    return data;
  } catch (e) {
    console.log('[SW] readMetaData: error reading metadata', e);
    return {};
  }
}

async function saveMetaData(metaCache, data) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const response = new Response(blob);
  await metaCache.put("metadata", response);
  console.log('[SW] saveMetaData: saved metadata');
}
